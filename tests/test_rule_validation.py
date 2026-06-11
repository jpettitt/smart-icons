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


def test_empty_thresholds_list_rejected():
    """Empty thresholds list should be rejected — falsy check in
    validate_rule catches both missing and empty cases. Audit coverage
    for the exact "empty list" path (the missing-key path is already
    covered by `test_thresholds_required_payload`)."""
    with pytest.raises(vol.Invalid):
        validate_rule(_thresholds_rule(thresholds=[]))


def test_mapping_non_string_keys_rejected():
    """YAML's bare `1:` becomes an int after parse. Backend rejects this
    rather than silently coercing via str() — silent coercion produced
    rules that didn't fire because the user expected `1` as a state."""
    with pytest.raises(vol.Invalid, match="mapping keys must be strings"):
        validate_rule(
            {
                "target": "light.kitchen",
                "mode": "mapping",
                "mapping": {1: {"color": "#fff"}},
            }
        )


def test_mapping_size_cap_rejected():
    """Mappings beyond the cap (200 entries) are rejected — bounds the
    evaluator's per-event scan against pathologically large payloads."""
    huge = {f"state_{i}": {"color": "#fff"} for i in range(201)}
    with pytest.raises(vol.Invalid, match="max is 200"):
        validate_rule(
            {
                "target": "light.kitchen",
                "mode": "mapping",
                "mapping": huge,
            }
        )


def test_thresholds_size_cap_rejected():
    """Thresholds lists beyond the cap (50 entries) are rejected."""
    huge = [{"lt": i, "color": "#fff"} for i in range(1, 52)]
    with pytest.raises(vol.Invalid, match="max is 50"):
        validate_rule(_thresholds_rule(thresholds=huge))


def test_source_attribute_length_cap_rejected():
    """source_attribute over 255 chars is rejected — bounds a value
    that's stored, persisted, and replayed on every state change."""
    too_long = "a" * 256
    with pytest.raises(vol.Invalid, match="exceeds max length"):
        validate_rule(_thresholds_rule(source_attribute=too_long))


def test_source_attribute_non_string_rejected():
    """Non-string source_attribute is rejected — used to be `vol.Any(str, None)`
    which silently accepted weird types via voluptuous coercion."""
    with pytest.raises(vol.Invalid, match="must be a string or null"):
        validate_rule(_thresholds_rule(source_attribute=123))


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
