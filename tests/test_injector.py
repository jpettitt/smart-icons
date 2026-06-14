"""Integration tests for the IconInjector.

Drives the injector against a real `hass` fixture (via
pytest-homeassistant-custom-component) so we exercise the actual
state-changed plumbing rather than mocking it.
"""

from __future__ import annotations

import pytest
from homeassistant.helpers.entity import StateInfo

from custom_components.smart_icons.const import (
    ATTR_ICON,
    ATTR_SMART_ICONS_BACKGROUND,
    ATTR_SMART_ICONS_COLOR,
    DATA_INJECTOR,
    DATA_STORE,
    DOMAIN,
)


def _mapping_rule(**overrides):
    data = {
        "target": "light.kitchen",
        "source": "input_select.scene",
        "mode": "mapping",
        "mapping": {
            "movie": {"color": "#000000", "icon": "mdi:movie-open"},
            "_else": {"color": "#cccccc"},
        },
    }
    data.update(overrides)
    return data


def _thresholds_rule(**overrides):
    data = {
        "target": "light.bedroom",
        "source": "sensor.bedroom_temp",
        "mode": "thresholds",
        "thresholds": [
            {"lt": 18, "icon": "mdi:snowflake", "color": "#3366ff"},
            {"lt": 25, "color": "#33cc66"},
            {"icon": "mdi:fire", "color": "#ff3333"},
        ],
    }
    data.update(overrides)
    return data


async def test_injector_writes_icon_and_color_on_source_change(
    hass, config_entry  # noqa: ARG001 — entry triggers setup
):
    """Source entity exists, rule matches → target gets icon + color attrs."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_ICON] == "mdi:movie-open"
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#000000"


async def test_injector_reacts_to_source_state_change(
    hass, config_entry  # noqa: ARG001
):
    """Changing the source's state re-evaluates and re-applies."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()

    # Flip the source — should fall to the _else branch.
    hass.states.async_set("input_select.scene", "party")
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    # _else has only a color, no icon — and the icon we last wrote
    # (mdi:movie-open) is now cleared, so HA falls back to its default.
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#cccccc"
    assert ATTR_ICON not in state.attributes


async def test_injector_handles_threshold_rules(
    hass, config_entry  # noqa: ARG001
):
    hass.states.async_set("sensor.bedroom_temp", "15")
    hass.states.async_set("light.bedroom", "off")
    store = hass.data[DOMAIN][DATA_STORE]
    await store.async_upsert(_thresholds_rule())
    await hass.async_block_till_done()

    state = hass.states.get("light.bedroom")
    assert state.attributes[ATTR_ICON] == "mdi:snowflake"
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#3366ff"

    # Warm it up past the second threshold.
    hass.states.async_set("sensor.bedroom_temp", "30")
    await hass.async_block_till_done()

    state = hass.states.get("light.bedroom")
    assert state.attributes[ATTR_ICON] == "mdi:fire"
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#ff3333"


async def test_injector_releases_color_on_rule_deletion(
    hass, config_entry  # noqa: ARG001
):
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    rule = await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert ATTR_SMART_ICONS_COLOR in hass.states.get("light.kitchen").attributes

    await store.async_delete(rule.id)
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert ATTR_SMART_ICONS_COLOR not in state.attributes
    # Icon attribute is also cleared — HA falls back to the
    # domain/device-class default after our value is popped.
    assert ATTR_ICON not in state.attributes


async def test_injector_priority_resolution(
    hass, config_entry  # noqa: ARG001
):
    """Higher-priority rule wins when multiple target the same entity."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        _mapping_rule(
            priority=10,
            mapping={"movie": {"color": "#aaa", "icon": "mdi:low"}},
        )
    )
    await store.async_upsert(
        _mapping_rule(
            priority=99,
            mapping={"movie": {"color": "#bbb", "icon": "mdi:high"}},
        )
    )
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_ICON] == "mdi:high"
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#bbb"


async def test_injector_skips_missing_target(
    hass, config_entry  # noqa: ARG001
):
    """Forward-declared target (doesn't exist yet) is silently skipped."""
    hass.states.async_set("input_select.scene", "movie")
    store = hass.data[DOMAIN][DATA_STORE]
    # No light.kitchen state — the target doesn't exist.
    await store.async_upsert(_mapping_rule(target="light.does_not_exist"))
    await hass.async_block_till_done()

    # No exception, no state created.
    assert hass.states.get("light.does_not_exist") is None


async def test_injector_stops_cleanly_on_unload(
    hass, config_entry  # noqa: ARG001
):
    """Unloading the entry releases all injected attributes."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert ATTR_SMART_ICONS_COLOR in hass.states.get("light.kitchen").attributes

    # Stop the injector directly (mirrors async_unload_entry behavior).
    injector = hass.data[DOMAIN][DATA_INJECTOR]
    injector.async_stop()
    await hass.async_block_till_done()

    assert ATTR_SMART_ICONS_COLOR not in hass.states.get("light.kitchen").attributes


async def test_injector_reads_source_attribute(
    hass, config_entry  # noqa: ARG001
):
    """Rules with source_attribute read the named attribute, not state."""
    # Simulate sun.sun with an azimuth attribute.
    hass.states.async_set(
        "sun.sun",
        "above_horizon",
        {"azimuth": 180.0, "elevation": 45.0},
    )
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "sun.sun",
            "source_attribute": "azimuth",
            "mode": "thresholds",
            "thresholds": [
                {"lt": 90, "color": "#001144", "icon": "mdi:weather-sunset"},
                {"lt": 270, "color": "#ff6633", "icon": "mdi:white-balance-sunny"},
                {"color": "#001144", "icon": "mdi:weather-sunset"},
            ],
        }
    )
    await hass.async_block_till_done()

    # Azimuth 180 falls into the `lt: 270` bucket.
    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_ICON] == "mdi:white-balance-sunny"
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#ff6633"


async def test_injector_attribute_change_triggers_update(
    hass, config_entry  # noqa: ARG001
):
    """Attribute updates fire state_changed and trigger re-evaluation."""
    hass.states.async_set("sun.sun", "above_horizon", {"azimuth": 45.0})
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "sun.sun",
            "source_attribute": "azimuth",
            "mode": "thresholds",
            "thresholds": [
                {"lt": 90, "color": "#001144"},
                {"color": "#ff6633"},
            ],
        }
    )
    await hass.async_block_till_done()
    assert hass.states.get("light.kitchen").attributes[
        ATTR_SMART_ICONS_COLOR
    ] == "#001144"

    # Sun moves: azimuth past 90.
    hass.states.async_set("sun.sun", "above_horizon", {"azimuth": 180.0})
    await hass.async_block_till_done()
    assert hass.states.get("light.kitchen").attributes[
        ATTR_SMART_ICONS_COLOR
    ] == "#ff6633"


async def test_injector_missing_attribute_is_noop(
    hass, config_entry  # noqa: ARG001
):
    """Rule references an attribute that doesn't exist on the source."""
    hass.states.async_set("sun.sun", "above_horizon", {})  # no azimuth
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "sun.sun",
            "source_attribute": "azimuth",
            "mode": "mapping",
            "mapping": {"on": {"color": "#fff"}},
        }
    )
    await hass.async_block_till_done()

    # No match, no injection. The state has no smart_icons_color.
    state = hass.states.get("light.kitchen")
    assert ATTR_SMART_ICONS_COLOR not in state.attributes


async def test_injector_applies_to_multiple_literal_targets(
    hass, config_entry  # noqa: ARG001
):
    """A rule with a `targets` list decorates each entity in the list."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    hass.states.async_set("light.living_room", "on")
    hass.states.async_set("light.bedroom", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "targets": ["light.kitchen", "light.living_room", "light.bedroom"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#001144", "icon": "mdi:movie-open"}},
        }
    )
    await hass.async_block_till_done()

    for target in ("light.kitchen", "light.living_room", "light.bedroom"):
        state = hass.states.get(target)
        assert state.attributes[ATTR_ICON] == "mdi:movie-open"
        assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#001144"


async def test_injector_resolves_glob_targets(
    hass, config_entry  # noqa: ARG001
):
    """Glob patterns in `targets` expand to matching entities."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen_main", "on")
    hass.states.async_set("light.kitchen_under_cabinet", "on")
    hass.states.async_set("light.bedroom", "on")  # shouldn't match
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "targets": ["light.kitchen_*"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#001144"}},
        }
    )
    await hass.async_block_till_done()

    assert (
        hass.states.get("light.kitchen_main").attributes[ATTR_SMART_ICONS_COLOR]
        == "#001144"
    )
    assert (
        hass.states.get("light.kitchen_under_cabinet")
        .attributes[ATTR_SMART_ICONS_COLOR]
        == "#001144"
    )
    # bedroom doesn't match the glob — unaffected.
    assert (
        ATTR_SMART_ICONS_COLOR not in hass.states.get("light.bedroom").attributes
    )


async def test_injector_mixed_literal_and_glob_targets(
    hass, config_entry  # noqa: ARG001
):
    """A targets list can mix literal entity ids and glob patterns."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen_main", "on")
    hass.states.async_set("light.bedroom", "on")
    hass.states.async_set("switch.amp", "on")  # literal target
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "targets": ["light.kitchen_*", "switch.amp"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#001144"}},
        }
    )
    await hass.async_block_till_done()

    assert (
        hass.states.get("light.kitchen_main").attributes[ATTR_SMART_ICONS_COLOR]
        == "#001144"
    )
    assert (
        hass.states.get("switch.amp").attributes[ATTR_SMART_ICONS_COLOR]
        == "#001144"
    )
    assert (
        ATTR_SMART_ICONS_COLOR not in hass.states.get("light.bedroom").attributes
    )


async def test_injector_per_target_source_uses_each_target_state(
    hass, config_entry  # noqa: ARG001
):
    """Multi-target rule with no explicit source: each target's own
    state drives its own decoration."""
    hass.states.async_set("light.kitchen", "on")
    hass.states.async_set("light.bedroom", "off")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "targets": ["light.kitchen", "light.bedroom"],
            "mode": "mapping",
            "mapping": {
                "on": {"color": "#00ff00", "icon": "mdi:lightbulb-on"},
                "off": {"color": "#888888", "icon": "mdi:lightbulb-off"},
            },
        }
    )
    await hass.async_block_till_done()

    # Each target evaluates against its own state.
    assert (
        hass.states.get("light.kitchen").attributes[ATTR_SMART_ICONS_COLOR]
        == "#00ff00"
    )
    assert hass.states.get("light.kitchen").attributes[ATTR_ICON] == "mdi:lightbulb-on"
    assert (
        hass.states.get("light.bedroom").attributes[ATTR_SMART_ICONS_COLOR]
        == "#888888"
    )
    assert hass.states.get("light.bedroom").attributes[ATTR_ICON] == "mdi:lightbulb-off"


async def test_injector_per_target_with_source_attribute(
    hass, config_entry  # noqa: ARG001
):
    """source_attribute combined with per-target: each target reads its
    own state.attributes[source_attribute]."""
    hass.states.async_set("light.bright", "on", {"brightness": 200})
    hass.states.async_set("light.dim", "on", {"brightness": 40})
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "targets": ["light.bright", "light.dim"],
            "source_attribute": "brightness",
            "mode": "thresholds",
            "thresholds": [
                {"lt": 100, "color": "#003311"},
                {"color": "#ffff00"},
            ],
        }
    )
    await hass.async_block_till_done()

    # Per-target evaluation reads each target's own brightness attribute.
    assert (
        hass.states.get("light.bright").attributes[ATTR_SMART_ICONS_COLOR]
        == "#ffff00"
    )
    assert (
        hass.states.get("light.dim").attributes[ATTR_SMART_ICONS_COLOR]
        == "#003311"
    )


async def test_injector_applies_glob_rule_to_entities_appearing_after_startup(
    hass, config_entry  # noqa: ARG001
):
    """On HA restart, a glob rule's target entities may not exist in the
    state machine when the integration starts (their owning integration
    is still loading). When those entities later appear, the injector
    must catch them and apply the rule — otherwise the user sees default
    icons and colors until they bounce a dashboard.

    Reproduces the bug by:
      1. Storing a glob rule when no matching entities exist.
      2. Letting the entity appear later via async_set.
      3. Asserting the smart_icons_color attribute is written.
    """
    store = hass.data[DOMAIN][DATA_STORE]

    # Store the glob rule BEFORE any matching entity exists — mirrors
    # the restart sequence where Smart Icons loads before the lock
    # integration publishes its entities.
    await store.async_upsert(
        {
            "targets": ["lock.*"],
            "mode": "mapping",
            "mapping": {
                "locked": {"color": "#00ff00", "icon": "mdi:lock"},
                "unlocked": {"color": "#ff0000", "icon": "mdi:lock-open"},
            },
        }
    )
    await hass.async_block_till_done()

    # No matching entity yet.
    assert hass.states.get("lock.front_door") is None

    # Now the entity appears for the first time — simulates the
    # lock integration finally publishing its state.
    hass.states.async_set("lock.front_door", "locked")
    await hass.async_block_till_done()

    state = hass.states.get("lock.front_door")
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#00ff00"
    assert state.attributes[ATTR_ICON] == "mdi:lock"

    # And subsequent state changes on this entity now trigger
    # re-evaluation — proves the subscription was rebuilt.
    hass.states.async_set("lock.front_door", "unlocked")
    await hass.async_block_till_done()

    state = hass.states.get("lock.front_door")
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#ff0000"
    assert state.attributes[ATTR_ICON] == "mdi:lock-open"


async def test_injector_no_op_when_rule_disabled(
    hass, config_entry  # noqa: ARG001
):
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    rule = await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert ATTR_SMART_ICONS_COLOR in hass.states.get("light.kitchen").attributes
    assert hass.states.get("light.kitchen").attributes[ATTR_ICON] == "mdi:movie-open"

    # Disable the rule — should release both color and icon.
    await store.async_upsert({**rule.to_dict(), "enabled": False})
    await hass.async_block_till_done()
    state = hass.states.get("light.kitchen")
    assert ATTR_SMART_ICONS_COLOR not in state.attributes
    assert ATTR_ICON not in state.attributes


async def test_injector_clears_icon_when_rule_drops_icon_field(
    hass, config_entry  # noqa: ARG001
):
    """Editing a rule to remove the `icon` field should clear the
    previously-written icon attribute on the next evaluation. This is
    the on-edit half of the icon-clear contract — the on-delete half
    is covered by test_injector_releases_color_on_rule_deletion."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    rule = await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert hass.states.get("light.kitchen").attributes[ATTR_ICON] == "mdi:movie-open"

    # Edit the rule: drop the icon from the "movie" mapping entry.
    edited = rule.to_dict()
    edited["mapping"] = {
        "movie": {"color": "#000000"},
        "_else": {"color": "#cccccc"},
    }
    await store.async_upsert(edited)
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#000000"
    assert ATTR_ICON not in state.attributes


async def test_injector_writes_background_color_attribute(
    hass, config_entry  # noqa: ARG001
):
    """A rule with background_color writes ATTR_SMART_ICONS_BACKGROUND
    onto the target — the painter reads it to render the chip."""
    hass.states.async_set("input_select.scene", "highlight")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {
                "highlight": {
                    "color": "#ffff00",
                    "background_color": "#43a047",
                },
            },
        }
    )
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#ffff00"
    assert state.attributes[ATTR_SMART_ICONS_BACKGROUND] == "#43a047"


async def test_injector_writes_bg_only_without_color(
    hass, config_entry  # noqa: ARG001
):
    """A bg-only rule writes ATTR_SMART_ICONS_BACKGROUND but no
    ATTR_SMART_ICONS_COLOR — the painter renders a chip with the
    icon's natural color."""
    hass.states.async_set("input_select.scene", "highlight")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"highlight": {"background_color": "#43a047"}},
        }
    )
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_SMART_ICONS_BACKGROUND] == "#43a047"
    assert ATTR_SMART_ICONS_COLOR not in state.attributes


async def test_injector_clears_background_when_rule_drops_bg_field(
    hass, config_entry  # noqa: ARG001
):
    """Editing a rule to remove `background_color` pops the attribute
    on the next evaluation. Symmetric with the color-clear behavior."""
    hass.states.async_set("input_select.scene", "highlight")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    rule = await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {
                "highlight": {
                    "color": "#ffff00",
                    "background_color": "#43a047",
                },
            },
        }
    )
    await hass.async_block_till_done()
    assert (
        hass.states.get("light.kitchen").attributes[ATTR_SMART_ICONS_BACKGROUND]
        == "#43a047"
    )

    # Edit: drop the background_color, keep the color.
    edited = rule.to_dict()
    edited["mapping"] = {"highlight": {"color": "#ffff00"}}
    await store.async_upsert(edited)
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#ffff00"
    assert ATTR_SMART_ICONS_BACKGROUND not in state.attributes


async def test_injector_releases_background_on_rule_deletion(
    hass, config_entry  # noqa: ARG001
):
    hass.states.async_set("input_select.scene", "highlight")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    rule = await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"highlight": {"background_color": "#43a047"}},
        }
    )
    await hass.async_block_till_done()
    assert (
        ATTR_SMART_ICONS_BACKGROUND
        in hass.states.get("light.kitchen").attributes
    )

    await store.async_delete(rule.id)
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert ATTR_SMART_ICONS_BACKGROUND not in state.attributes


async def test_injector_field_level_merge_across_priorities(
    hass, config_entry  # noqa: ARG001
):
    """The v0.3 field-level merger: a high-priority bg-only rule + a
    low-priority color rule coexist — the bg comes from the high rule,
    the color from the low rule, neither erases the other."""
    hass.states.async_set("input_select.scene", "highlight")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    # Low-priority color + icon.
    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "priority": 10,
            "mode": "mapping",
            "mapping": {
                "highlight": {"color": "#ffff00", "icon": "mdi:star"},
            },
        }
    )
    # High-priority bg-only.
    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "priority": 99,
            "mode": "mapping",
            "mapping": {"highlight": {"background_color": "#43a047"}},
        }
    )
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    # Color + icon survive from the low-priority rule.
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#ffff00"
    assert state.attributes[ATTR_ICON] == "mdi:star"
    # bg from the high-priority rule.
    assert state.attributes[ATTR_SMART_ICONS_BACKGROUND] == "#43a047"


async def test_injector_caches_glob_resolution_between_state_changes(
    hass, config_entry  # noqa: ARG001
):
    """The resolved-target cache is hit on subsequent reads inside a
    state-change burst — important for performance on large installs
    where fnmatch.filter against thousands of entity ids would
    otherwise run per rule per source-change."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen_main", "on")
    hass.states.async_set("light.kitchen_under_cabinet", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    rule = await store.async_upsert(
        {
            "targets": ["light.kitchen_*"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#001144"}},
        }
    )
    await hass.async_block_till_done()

    injector = hass.data[DOMAIN][DATA_INJECTOR]
    # First read of _resolve_targets seeded the cache; assert the
    # rule id is keyed in the resolution cache.
    assert rule.id in injector._resolved_cache
    cached_before = injector._resolved_cache[rule.id]
    assert "light.kitchen_main" in cached_before
    assert "light.kitchen_under_cabinet" in cached_before

    # State change on the source triggers _on_source_state_change →
    # _targets_for_source → _resolve_targets. The cached set should be
    # reused (same object identity), not recomputed.
    hass.states.async_set("input_select.scene", "party")
    await hass.async_block_till_done()
    assert injector._resolved_cache[rule.id] is cached_before


async def test_injector_invalidates_cache_on_rule_update(
    hass, config_entry  # noqa: ARG001
):
    """Editing a rule's targets list drops just that rule's cached
    resolution — the next read recomputes against the new glob."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen_main", "on")
    hass.states.async_set("light.bedroom_main", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    injector = hass.data[DOMAIN][DATA_INJECTOR]

    rule = await store.async_upsert(
        {
            "targets": ["light.kitchen_*"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#001144"}},
        }
    )
    await hass.async_block_till_done()
    assert injector._resolved_cache[rule.id] == {"light.kitchen_main"}

    # Widen the glob via an update.
    await store.async_upsert(
        {
            **rule.to_dict(),
            "targets": ["light.kitchen_*", "light.bedroom_*"],
        }
    )
    await hass.async_block_till_done()
    # New resolution must include the bedroom match — confirms the
    # stale cached entry was dropped and recomputed.
    assert (
        injector._resolved_cache[rule.id]
        == {"light.kitchen_main", "light.bedroom_main"}
    )
    assert (
        hass.states.get("light.bedroom_main").attributes[ATTR_SMART_ICONS_COLOR]
        == "#001144"
    )


async def test_injector_invalidates_glob_cache_when_new_entity_appears(
    hass, config_entry  # noqa: ARG001
):
    """When a new entity appears in the state machine that matches a
    glob, the cache for glob rules must be dropped so the next
    resolution picks up the newly-eligible entity."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen_main", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    injector = hass.data[DOMAIN][DATA_INJECTOR]

    rule = await store.async_upsert(
        {
            "targets": ["light.kitchen_*"],
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#001144"}},
        }
    )
    await hass.async_block_till_done()
    assert injector._resolved_cache[rule.id] == {"light.kitchen_main"}

    # A new matching entity appears — the integration that owns it
    # finally published its state. The handler should invalidate
    # the cache, re-resolve, paint the new entity.
    hass.states.async_set("light.kitchen_pantry", "on")
    await hass.async_block_till_done()
    assert "light.kitchen_pantry" in injector._resolved_cache[rule.id]
    assert (
        hass.states.get("light.kitchen_pantry").attributes[ATTR_SMART_ICONS_COLOR]
        == "#001144"
    )


async def test_injector_does_not_clobber_source_overwritten_icon(
    hass, config_entry  # noqa: ARG001
):
    """If the source integration replaces our icon with its own value
    between our write and our clear, we must NOT pop that value — only
    our own writes are ours to clean up. This is the safety guarantee
    that lets _release_target be aggressive about icon-clearing."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    rule = await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert hass.states.get("light.kitchen").attributes[ATTR_ICON] == "mdi:movie-open"

    # Simulate the source integration pushing a fresh state with its
    # own icon. (In production this happens when the upstream
    # integration republishes attributes.) The injector hasn't been
    # told about this — it still believes "we last wrote mdi:movie-open."
    hass.states.async_set(
        "light.kitchen",
        "on",
        {ATTR_ICON: "mdi:source-owned-icon"},
    )
    await hass.async_block_till_done()

    # Now delete our rule. The icon attribute is no longer "ours" —
    # current value differs from what we recorded — so we leave it.
    await store.async_delete(rule.id)
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.attributes[ATTR_ICON] == "mdi:source-owned-icon"


async def test_injector_handles_target_vanishing_mid_runtime(
    hass, config_entry  # noqa: ARG001
):
    """When a target entity is removed from the state machine after we
    decorated it, subsequent state changes for its source must not
    crash. _apply_target reads hass.states.get(target) → None → return
    early without writing. The bookkeeping entries persist (which is
    fine; they get cleaned up on async_stop or rule deletion)."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert ATTR_SMART_ICONS_COLOR in hass.states.get("light.kitchen").attributes

    # Target entity vanishes (e.g. owning integration unloaded).
    hass.states.async_remove("light.kitchen")
    await hass.async_block_till_done()

    # Source state change after the target is gone — should not crash.
    hass.states.async_set("input_select.scene", "party")
    await hass.async_block_till_done()
    # No exception → pass. State machine doesn't grow a fresh entity.
    assert hass.states.get("light.kitchen") is None


async def test_injector_marks_smart_icons_attrs_as_unrecorded(
    hass, config_entry  # noqa: ARG001
):
    """Each paint write should carry a state_info that tells the
    recorder to skip `smart_icons_color` and `smart_icons_background`.
    The state_changed event still fires (the painter needs it) but the
    recorder strips those keys from the JSON it persists, reducing
    state_attributes-table bloat on installs with broad glob rules."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {
                "movie": {
                    "color": "#ffff00",
                    "background_color": "#43a047",
                },
            },
        }
    )
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    assert state.state_info is not None
    unrec = state.state_info.get("unrecorded_attributes", frozenset())
    assert ATTR_SMART_ICONS_COLOR in unrec
    assert ATTR_SMART_ICONS_BACKGROUND in unrec
    # ATTR_ICON is HA's standard mechanism — other integrations may
    # legitimately change it, so we leave it recordable.
    assert ATTR_ICON not in unrec


async def test_injector_preserves_entity_owners_unrecorded_attrs(
    hass, config_entry  # noqa: ARG001
):
    """When an entity declares its own unrecorded_attributes (e.g. a
    sensor that excludes `last_reset` from history), our `async_set`
    must MERGE our exclusion set with the entity's existing one rather
    than replacing it — otherwise we'd silently re-enable recording
    of attributes the entity author chose to exclude.
    """
    # Simulate an entity that has its own unrecorded_attributes set.
    entity_unrec = frozenset({"some_owner_attr"})
    entity_state_info: StateInfo = {"unrecorded_attributes": entity_unrec}
    hass.states.async_set(
        "light.kitchen",
        "on",
        state_info=entity_state_info,
    )
    hass.states.async_set("input_select.scene", "movie")
    store = hass.data[DOMAIN][DATA_STORE]

    await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#ffff00"}},
        }
    )
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    unrec = state.state_info.get("unrecorded_attributes", frozenset())
    # The entity's existing declaration survives our overwrite.
    assert "some_owner_attr" in unrec
    # Our exclusions are added on top.
    assert ATTR_SMART_ICONS_COLOR in unrec
    assert ATTR_SMART_ICONS_BACKGROUND in unrec


async def test_injector_marks_unrecorded_attrs_on_release_too(
    hass, config_entry  # noqa: ARG001
):
    """The release path also carries the state_info hint. Strictly the
    release write doesn't include our attrs in the new payload, so the
    recorder hint is redundant for that specific row — but keeping the
    hint uniform across both write paths makes the contract simpler
    and matches what subsequent re-applies would write."""
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]

    rule = await store.async_upsert(
        {
            "target": "light.kitchen",
            "source": "input_select.scene",
            "mode": "mapping",
            "mapping": {"movie": {"color": "#ffff00"}},
        }
    )
    await hass.async_block_till_done()

    await store.async_delete(rule.id)
    await hass.async_block_till_done()

    state = hass.states.get("light.kitchen")
    # Color attribute is cleared on release.
    assert ATTR_SMART_ICONS_COLOR not in state.attributes
    # state_info is still set — recorder hint travels with every write.
    assert state.state_info is not None
    unrec = state.state_info.get("unrecorded_attributes", frozenset())
    assert ATTR_SMART_ICONS_COLOR in unrec
    assert ATTR_SMART_ICONS_BACKGROUND in unrec
