"""Smart Icons — entity-driven icon color and glyph for Home Assistant.

This is the integration entry point. v0.1 wires up the rule store and
WebSocket API; the frontend bundle is registered as a Lovelace resource
once `frontend/dist/smart_icons.js` exists (added under v0.1 in §11.1).
"""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DATA_INJECTOR, DATA_STORE, DOMAIN
from .frontend import async_register_frontend
from .injector import IconInjector
from .store import RuleStore
from .websocket_api import async_register_commands


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Config-flow only — nothing to do at YAML import time in v0.1."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Smart Icons from a config entry."""
    store = RuleStore(hass)
    await store.async_load()

    injector = IconInjector(hass, store)

    # Populate hass.data BEFORE injector.async_start() and
    # async_register_commands() — otherwise a WS client racing setup (or
    # the injector's own state-applied events firing handlers that walk
    # hass.data) could see hass.data[DOMAIN] missing the store/injector
    # entries. HA normally serializes setup before clients connect, but
    # the ordering needs to be correct regardless of that fortunate
    # timing.
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][DATA_STORE] = store
    hass.data[DOMAIN][DATA_INJECTOR] = injector

    injector.async_start()

    # Idempotent — async_register_command tolerates the second call as long
    # as the same handlers are registered, but a single config entry is
    # enforced by the config flow so this only ever runs once per session.
    async_register_commands(hass)

    await async_register_frontend(hass)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Tear down on integration removal."""
    domain_data = hass.data.get(DOMAIN, {})
    injector: IconInjector | None = domain_data.pop(DATA_INJECTOR, None)
    if injector is not None:
        injector.async_stop()
    domain_data.pop(DATA_STORE, None)
    return True
