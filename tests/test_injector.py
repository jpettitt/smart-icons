"""Integration tests for the IconInjector.

Drives the injector against a real `hass` fixture (via
pytest-homeassistant-custom-component) so we exercise the actual
state-changed plumbing rather than mocking it.
"""

from __future__ import annotations

import pytest

from custom_components.smart_icons.const import (
    ATTR_ICON,
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
    # _else has only a color, no icon — icon stays at the previous value
    # (we don't touch icon when the new winner doesn't set one).
    assert state.attributes[ATTR_SMART_ICONS_COLOR] == "#cccccc"


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

    assert ATTR_SMART_ICONS_COLOR not in hass.states.get("light.kitchen").attributes
    # Icon is intentionally NOT restored — documented trade-off.


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


async def test_injector_no_op_when_rule_disabled(
    hass, config_entry  # noqa: ARG001
):
    hass.states.async_set("input_select.scene", "movie")
    hass.states.async_set("light.kitchen", "on")
    store = hass.data[DOMAIN][DATA_STORE]
    rule = await store.async_upsert(_mapping_rule())
    await hass.async_block_till_done()
    assert ATTR_SMART_ICONS_COLOR in hass.states.get("light.kitchen").attributes

    # Disable the rule — should release the color.
    await store.async_upsert({**rule.to_dict(), "enabled": False})
    await hass.async_block_till_done()
    assert ATTR_SMART_ICONS_COLOR not in hass.states.get("light.kitchen").attributes
