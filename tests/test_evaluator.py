"""Pure-logic tests for evaluator.py.

Mirrors frontend/test/evaluator.test.ts so a divergence between the
Python and TS evaluators surfaces here.

Per-field merge semantics (v0.3.0a3): `evaluate_*` return SPARSE
position dicts — only fields the matching entry positively addressed
appear. `merge_decorations` layers positions by priority and inflates
to the dense {color, icon, background_color} shape the injector
expects.
"""

from __future__ import annotations

import pytest

from custom_components.smart_icons.evaluator import (
    evaluate_mapping,
    evaluate_rule,
    evaluate_thresholds,
    merge_decorations,
    pick_winner,  # back-compat alias
)
from custom_components.smart_icons.rule import Rule


def _rule(**overrides) -> Rule:
    defaults = {
        "id": "01",
        "targets": ["light.kitchen"],
        "source": "sensor.temp",
        "mode": "mapping",
        "mapping": {"on": {"color": "#fff"}},
        "enabled": True,
        "priority": 10,
        "created": "",
        "updated": "",
        "source_kind": "ui",
    }
    defaults.update(overrides)
    return Rule(**defaults)


class TestEvaluateThresholds:
    def test_first_matching_numeric_entry(self):
        result = evaluate_thresholds(
            [
                {"lt": 18, "color": "#0000ff"},
                {"lt": 25, "color": "#00ff00"},
                {"color": "#ff0000"},
            ],
            "15",
        )
        assert result == {"color": "#0000ff"}

    def test_falls_through_to_else_entry(self):
        result = evaluate_thresholds(
            [{"lt": 18, "color": "#0000ff"}, {"color": "#ff0000"}],
            "30",
        )
        assert result == {"color": "#ff0000"}

    def test_numeric_comparators_skip_non_numeric_state(self):
        result = evaluate_thresholds(
            [{"lt": 18, "color": "#0000ff"}, {"color": "#fallback"}],
            "unknown",
        )
        assert result == {"color": "#fallback"}

    def test_returns_none_if_no_match_and_no_else(self):
        assert evaluate_thresholds([{"lt": 18, "color": "#fff"}], "unknown") is None

    @pytest.mark.parametrize(
        "comparator,threshold,state,expected",
        [
            ("gt", 24, "25", {"color": "#a"}),
            ("gte", 25, "25", {"color": "#a"}),
            ("lte", 25, "25", {"color": "#a"}),
        ],
    )
    def test_comparator_variants(self, comparator, threshold, state, expected):
        result = evaluate_thresholds(
            [{comparator: threshold, "color": "#a"}], state
        )
        assert result == expected

    def test_eq_string(self):
        result = evaluate_thresholds([{"eq": "on", "icon": "mdi:check"}], "on")
        assert result == {"icon": "mdi:check"}

    def test_eq_numeric(self):
        result = evaluate_thresholds([{"eq": 5, "icon": "mdi:five"}], "5")
        assert result == {"icon": "mdi:five"}

    def test_release_sentinels_yield_explicit_release(self):
        # An entry whose only decoration field is a sentinel takes an
        # explicit-release position on that field. The merger turns this
        # into a "clear the attribute" decision (sentinel blocks lower-
        # priority rules from contributing the field).
        assert evaluate_thresholds([{"lt": 18, "color": "inherit"}], "10") == {
            "color": None
        }
        assert evaluate_thresholds([{"lt": 18, "icon": ""}], "10") == {"icon": None}

    def test_bg_only_entry(self):
        # New in v0.3: a threshold may set background_color alone. The
        # evaluator returns just that field (no auto-filled None for the
        # unpositioned color / icon fields).
        result = evaluate_thresholds(
            [{"lt": 18, "background_color": "#43a047"}], "10"
        )
        assert result == {"background_color": "#43a047"}

    def test_combined_color_and_bg(self):
        result = evaluate_thresholds(
            [{"lt": 18, "color": "#ffff00", "background_color": "#43a047"}], "10"
        )
        assert result == {"color": "#ffff00", "background_color": "#43a047"}


class TestEvaluateMapping:
    def test_exact_string_match(self):
        result = evaluate_mapping({"on": {"color": "#fff"}}, "on")
        assert result == {"color": "#fff"}

    def test_else_fallback(self):
        result = evaluate_mapping(
            {"on": {"color": "#fff"}, "_else": {"color": "#000"}}, "something"
        )
        assert result == {"color": "#000"}

    def test_no_match_no_else_returns_none(self):
        assert evaluate_mapping({"on": {"color": "#fff"}}, "off") is None

    def test_bg_only_mapping_entry(self):
        result = evaluate_mapping({"on": {"background_color": "#43a047"}}, "on")
        assert result == {"background_color": "#43a047"}

    def test_empty_decoration_yields_none(self):
        # A mapping key with a literally empty decoration dict is a
        # no-op position — the rule yields nothing for that match.
        # The editor's serialize path may emit this when the user
        # creates a key without setting any decoration field; the
        # painter ends up doing nothing, matching the visible UI.
        assert evaluate_mapping({"on": {}}, "on") is None


class TestEvaluateRule:
    def test_disabled_rule_returns_none(self):
        rule = _rule(
            mode="thresholds",
            thresholds=[{"color": "#fff"}],
            enabled=False,
        )
        assert evaluate_rule(rule, "20") is None

    def test_none_source_state_returns_none(self):
        rule = _rule(mode="thresholds", thresholds=[{"color": "#fff"}])
        assert evaluate_rule(rule, None) is None

    def test_unknown_mode_returns_none(self):
        # Template mode was removed in v0.3.0a3 (it had been inert
        # since v0.2). The evaluator no longer special-cases it; a
        # rule with an unrecognized mode falls through to None.
        # Validation rejects mode=template upstream — this test
        # only covers what happens if a malformed rule still reaches
        # the evaluator.
        rule = _rule(mode="thresholds", thresholds=[{"color": "#fff"}])
        rule.mode = "template"  # bypass validation
        assert evaluate_rule(rule, "on") is None


class TestMergeDecorations:
    def test_single_rule_inflates_to_dense_shape(self):
        # Even one matched rule produces the full triple — unaddressed
        # fields are None so the injector pops any prior writes.
        result = merge_decorations(
            [(_rule(priority=10), {"color": "#aaa"})]
        )
        assert result == {
            "color": "#aaa",
            "icon": None,
            "background_color": None,
        }

    def test_highest_priority_wins_addressed_field(self):
        rules = [_rule(id="a", priority=10), _rule(id="b", priority=20)]
        decs = [{"color": "#aaa"}, {"color": "#bbb"}]
        result = merge_decorations(list(zip(rules, decs)))
        assert result == {
            "color": "#bbb",
            "icon": None,
            "background_color": None,
        }

    def test_returns_none_when_no_rule_addresses_anything(self):
        assert merge_decorations([(_rule(), None)]) is None

    def test_skips_null_decorations_at_higher_priority(self):
        rules = [_rule(id="a", priority=10), _rule(id="b", priority=99)]
        decs = [{"color": "#aaa"}, None]
        result = merge_decorations(list(zip(rules, decs)))
        assert result == {
            "color": "#aaa",
            "icon": None,
            "background_color": None,
        }

    def test_field_level_merge_across_priorities(self):
        # The interesting case the v0.2 "winner takes all" got wrong:
        # a high-priority bg-only rule + a low-priority color rule
        # should yield BOTH the bg and the color, not just the bg.
        rules = [
            _rule(id="color_low", priority=10),
            _rule(id="bg_high", priority=99),
        ]
        decs = [
            {"color": "#aaa", "icon": "mdi:foo"},
            {"background_color": "#43a047"},
        ]
        result = merge_decorations(list(zip(rules, decs)))
        assert result == {
            "color": "#aaa",
            "icon": "mdi:foo",
            "background_color": "#43a047",
        }

    def test_equal_priority_first_declaration_wins(self):
        # Same priority, both contribute to the color field. Declaration
        # order is the tiebreaker — earlier index in the input list wins.
        rules = [_rule(id="first", priority=10), _rule(id="second", priority=10)]
        decs = [{"color": "#aaa"}, {"color": "#bbb"}]
        result = merge_decorations(list(zip(rules, decs)))
        assert result["color"] == "#aaa"

    def test_sentinel_release_blocks_lower_priority_contribution(self):
        # User intent: "the high-priority rule explicitly releases the
        # color, even though the low-priority rule has one." This is the
        # whole point of distinguishing position-released from
        # position-absent.
        rules = [_rule(id="low", priority=10), _rule(id="high", priority=99)]
        decs = [
            {"color": "#aaa"},
            {"color": None},  # explicit sentinel/release
        ]
        result = merge_decorations(list(zip(rules, decs)))
        assert result == {
            "color": None,
            "icon": None,
            "background_color": None,
        }

    def test_back_compat_alias(self):
        # pick_winner remains as an alias so older external callers
        # (none in-tree any more, but the alias is cheap to keep) still
        # work. Same behavior as merge_decorations.
        rules = [_rule(priority=10)]
        decs = [{"color": "#aaa"}]
        assert pick_winner(list(zip(rules, decs))) == merge_decorations(
            list(zip(rules, decs))
        )
