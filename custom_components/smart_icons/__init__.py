"""Smart Icons — entity-driven icon color and glyph for Home Assistant.

This is the integration entry point. v0.1 wires up the rule store and
WebSocket API; the frontend bundle is registered as a Lovelace resource
once `frontend/dist/smart_icons.js` exists (added under v0.1 in §11.1).
"""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DATA_STORE, DOMAIN
from .store import RuleStore
from .websocket_api import async_register_commands


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Config-flow only — nothing to do at YAML import time in v0.1."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Smart Icons from a config entry."""
    store = RuleStore(hass)
    await store.async_load()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][DATA_STORE] = store

    # Idempotent — async_register_command tolerates the second call as long
    # as the same handlers are registered, but a single config entry is
    # enforced by the config flow so this only ever runs once per session.
    async_register_commands(hass)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Tear down on integration removal."""
    hass.data.get(DOMAIN, {}).pop(DATA_STORE, None)
    return True
