"""Validation tests for rule.py."""

from __future__ import annotations

import pytest
import voluptuous as vol

from custom_components.smart_icons.const import MAX_TEMPLATE_LENGTH
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


def test_valid_template_rule():
    # v0.1 accepts template-mode rules at the storage layer (forward-compat);
    # evaluation lands in v0.2.
    out = validate_rule(
        {
            "target": "light.kitchen",
            "mode": "template",
            "template": "{{ 'inherit' }}",
        }
    )
    assert out["mode"] == "template"
    # source defaults to target when omitted.
    assert out["source"] == "light.kitchen"


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


def test_template_required_payload():
    with pytest.raises(vol.Invalid):
        validate_rule({"target": "light.kitchen", "mode": "template"})


def test_template_too_long_rejected():
    too_long = "x" * (MAX_TEMPLATE_LENGTH + 1)
    with pytest.raises(vol.Invalid):
        validate_rule(
            {"target": "light.kitchen", "mode": "template", "template": too_long}
        )


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
    assert again.target == rule.target
    assert again.mode == rule.mode
    assert again.thresholds == rule.thresholds
