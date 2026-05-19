"""Pure-logic tests for evaluator.py.

Mirrors frontend/test/evaluator.test.ts so a divergence between the
Python and TS evaluators surfaces here.
"""

from __future__ import annotations

import pytest

from custom_components.smart_icons.evaluator import (
    evaluate_mapping,
    evaluate_rule,
    evaluate_thresholds,
    pick_winner,
)
from custom_components.smart_icons.rule import Rule


def _rule(**overrides) -> Rule:
    defaults = {
        "id": "01",
        "target": "light.kitchen",
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
        assert result == {"color": "#0000ff", "icon": None}

    def test_falls_through_to_else_entry(self):
        result = evaluate_thresholds(
            [{"lt": 18, "color": "#0000ff"}, {"color": "#ff0000"}],
            "30",
        )
        assert result == {"color": "#ff0000", "icon": None}

    def test_numeric_comparators_skip_non_numeric_state(self):
        result = evaluate_thresholds(
            [{"lt": 18, "color": "#0000ff"}, {"color": "#fallback"}],
            "unknown",
        )
        assert result == {"color": "#fallback", "icon": None}

    def test_returns_none_if_no_match_and_no_else(self):
        assert evaluate_thresholds([{"lt": 18, "color": "#fff"}], "unknown") is None

    @pytest.mark.parametrize(
        "comparator,threshold,state,expected",
        [
            ("gt", 24, "25", {"color": "#a", "icon": None}),
            ("gte", 25, "25", {"color": "#a", "icon": None}),
            ("lte", 25, "25", {"color": "#a", "icon": None}),
        ],
    )
    def test_comparator_variants(self, comparator, threshold, state, expected):
        result = evaluate_thresholds(
            [{comparator: threshold, "color": "#a"}], state
        )
        assert result == expected

    def test_eq_string(self):
        result = evaluate_thresholds([{"eq": "on", "icon": "mdi:check"}], "on")
        assert result == {"color": None, "icon": "mdi:check"}

    def test_eq_numeric(self):
        result = evaluate_thresholds([{"eq": 5, "icon": "mdi:five"}], "5")
        assert result == {"color": None, "icon": "mdi:five"}

    def test_release_sentinels_yield_none(self):
        assert evaluate_thresholds([{"lt": 18, "color": "inherit"}], "10") is None
        assert evaluate_thresholds([{"lt": 18, "icon": ""}], "10") is None


class TestEvaluateMapping:
    def test_exact_string_match(self):
        result = evaluate_mapping({"on": {"color": "#fff"}}, "on")
        assert result == {"color": "#fff", "icon": None}

    def test_else_fallback(self):
        result = evaluate_mapping(
            {"on": {"color": "#fff"}, "_else": {"color": "#000"}}, "something"
        )
        assert result == {"color": "#000", "icon": None}

    def test_no_match_no_else_returns_none(self):
        assert evaluate_mapping({"on": {"color": "#fff"}}, "off") is None


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

    def test_template_mode_returns_none_in_v01(self):
        rule = _rule(mode="template", template='{{ "#fff" }}')
        assert evaluate_rule(rule, "on") is None


class TestPickWinner:
    def test_highest_priority_non_null_wins(self):
        rules = [_rule(id="a", priority=10), _rule(id="b", priority=20)]
        decorations = [
            {"color": "#aaa", "icon": None},
            {"color": "#bbb", "icon": None},
        ]
        result = pick_winner(list(zip(rules, decorations)))
        assert result == {"color": "#bbb", "icon": None}

    def test_returns_none_when_all_null(self):
        assert pick_winner([(_rule(), None)]) is None

    def test_skips_null_decorations_at_higher_priority(self):
        rules = [_rule(id="a", priority=10), _rule(id="b", priority=99)]
        decorations = [{"color": "#aaa", "icon": None}, None]
        result = pick_winner(list(zip(rules, decorations)))
        assert result == {"color": "#aaa", "icon": None}
