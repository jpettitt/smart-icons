"""Validation tests for rule.py."""

from __future__ import annotations

import pytest
import voluptuous as vol

from custom_components.smart_icons.rule import Rule, validate_rule


def _thresholds_rule(**overrides):
    data = {
        "target": "light.kitchen",
        "source": "sensor.kitchen_temp",
        "mode": "thresholds",
        "thresholds": [
            {"lt": 18, "color": "#3366ff", "icon": "mdi:snowflake"},
            {"lt": 25, "color": "#33cc66"},
            {"color": "#ff3333", "icon": "mdi:fire"},
        ],
    }
    data.update(overrides)
    return data


def _mapping_rule(**overrides):
    data = {
        "target": "media_player.tv",
        "source": "input_select.scene",
        "mode": "mapping",
        "mapping": {
            "movie": {"color": "#000000", "icon": "mdi:movie-open"},
            "_else": {"color": "#888888"},
        },
    }
    data.update(overrides)
    return data


def test_valid_thresholds_rule():
    out = validate_rule(_thresholds_rule())
    assert out["mode"] == "thresholds"
    assert out["source"] == "sensor.kitchen_temp"
    assert out["enabled"] is True
    assert out["priority"] == 10


def test_valid_mapping_rule():
    out = validate_rule(_mapping_rule())
    assert out["mode"] == "mapping"
    assert "_else" in out["mapping"]


def test_template_mode_rejected():
    # Template mode was inert through the v0.3 alpha line and is
    # removed entirely in v0.3.0a3. Validation now rejects it.
    with pytest.raises(vol.Invalid):
        validate_rule(
            {
                "target": "light.kitchen",
                "mode": "template",
                "template": "{{ 'inherit' }}",
            }
        )


def test_template_field_rejected_in_any_mode():
    # The `template` field is no longer in the schema. The rule
    # base schema is strict-keys (voluptuous default), so any
    # stray `template` field fails validation. In practice this
    # only bites users who had `mode: template` rules in storage
    # from v0.2 / v0.3-early — those rules fail to load and are
    # silently dropped by the store's per-rule vol.Invalid catch.
    # Non-template-mode rules never carried a template field in
    # the first place, so this is a no-op for them.
    with pytest.raises(vol.Invalid):
        validate_rule(
            {
                "target": "light.kitchen",
                "mode": "mapping",
                "mapping": {"on": {"color": "#fff"}},
                "template": "{{ 'inherit' }}",
            }
        )


def test_missing_target_rejected():
    with pytest.raises(vol.Invalid):
        validate_rule({"mode": "thresholds", "thresholds": [{"color": "#fff"}]})


def test_invalid_entity_id_rejected():
    with pytest.raises(vol.Invalid):
        validate_rule(_thresholds_rule(target="not an entity id"))


def test_unknown_mode_rejected():
    with pytest.raises(vol.Invalid):
        validate_rule(_thresholds_rule(mode="bogus"))


def test_thresholds_required_payload():
    bad = _thresholds_rule()
    bad.pop("thresholds")
    with pytest.raises(vol.Invalid):
        validate_rule(bad)


def test_mapping_required_payload():
    bad = _mapping_rule()
    bad.pop("mapping")
    with pytest.raises(vol.Invalid):
        validate_rule(bad)


def test_threshold_multiple_comparators_rejected():
    with pytest.raises(vol.Invalid):
        validate_rule(
            _thresholds_rule(thresholds=[{"lt": 5, "gt": 1, "color": "#fff"}])
        )


def test_threshold_no_comparator_is_else_branch():
    """An entry with no comparator is the final 'else' branch — legal."""
    out = validate_rule(
        _thresholds_rule(thresholds=[{"color": "#fff", "icon": "mdi:home"}])
    )
    assert out["thresholds"][0]["color"] == "#fff"


def test_decoration_release_sentinels_accepted():
    out = validate_rule(
        _thresholds_rule(
            thresholds=[
                {"lt": 5, "color": "inherit"},
                {"color": None, "icon": ""},
            ]
        )
    )
    assert out["thresholds"][1]["color"] is None
    assert out["thresholds"][1]["icon"] == ""


def test_source_defaults_to_target():
    out = validate_rule(
        {
            "target": "light.kitchen",
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    assert out["source"] == "light.kitchen"


def test_rule_from_to_dict_round_trip():
    validated = validate_rule(_thresholds_rule())
    rule = Rule.from_dict(validated)
    rule.id = "01ABC"
    rule.created = "2026-05-18T00:00:00+00:00"
    rule.updated = rule.created
    d = rule.to_dict()
    again = Rule.from_dict(validate_rule(d))
    assert again.targets == rule.targets
    assert again.mode == rule.mode
    assert again.thresholds == rule.thresholds


def test_legacy_target_normalized_to_targets():
    """Rules stored under v0.1.x with `target: str` migrate to `targets`."""
    out = validate_rule(_mapping_rule())  # uses legacy `target` key
    assert out["targets"] == ["media_player.tv"]
    assert "target" not in out  # legacy alias dropped post-normalization


def test_canonical_targets_list_accepted():
    out = validate_rule(
        {
            "targets": ["light.a", "light.b"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    assert out["targets"] == ["light.a", "light.b"]


def test_glob_target_accepted():
    out = validate_rule(
        {
            "targets": ["light.kitchen_*", "sensor.*_temp"],
            "source": "sensor.weather",
            "mode": "mapping",
            "mapping": {"hot": {"color": "#f00"}},
        }
    )
    assert out["targets"] == ["light.kitchen_*", "sensor.*_temp"]


def test_glob_only_targets_get_empty_source_for_per_target():
    """A rule with only glob targets and no explicit source ends up with
    source='', which the injector interprets as 'each matched target is
    its own source' (per-target evaluation)."""
    out = validate_rule(
        {
            "targets": ["light.*"],
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    assert out["source"] == ""


def test_multi_literal_targets_get_empty_source_for_per_target():
    out = validate_rule(
        {
            "targets": ["light.a", "light.b"],
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    assert out["source"] == ""


def test_single_literal_target_still_defaults_source():
    out = validate_rule(
        {
            "targets": ["light.kitchen"],
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    assert out["source"] == "light.kitchen"


def test_explicit_source_overrides_per_target_default():
    out = validate_rule(
        {
            "targets": ["light.a", "light.b"],
            "source": "sensor.driver",
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    assert out["source"] == "sensor.driver"


def test_missing_targets_and_target_rejected():
    with pytest.raises(vol.Invalid):
        validate_rule(
            {
                "mode": "mapping",
                "mapping": {"on": {"color": "#fff"}},
            }
        )


def test_source_attribute_accepted():
    out = validate_rule(_thresholds_rule(source_attribute="azimuth"))
    assert out["source_attribute"] == "azimuth"


def test_source_attribute_empty_normalized_to_none():
    out = validate_rule(_thresholds_rule(source_attribute=""))
    assert out["source_attribute"] is None


def test_source_attribute_round_trips_to_dict():
    out = validate_rule(_thresholds_rule(source_attribute="azimuth"))
    rule = Rule.from_dict(out)
    assert rule.source_attribute == "azimuth"
    d = rule.to_dict()
    assert d["source_attribute"] == "azimuth"
    # When attribute is None it's omitted from the serialized dict.
    rule.source_attribute = None
    assert "source_attribute" not in rule.to_dict()
