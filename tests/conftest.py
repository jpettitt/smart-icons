"""Shared fixtures for the Smart Icons test suite."""

from __future__ import annotations

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smart_icons.const import DATA_STORE, DOMAIN
from custom_components.smart_icons.store import RuleStore


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):  # noqa: ARG001
    """Make HA load our custom_component during tests."""
    yield


@pytest.fixture
async def config_entry(hass):
    """A configured Smart Icons entry, set up against hass."""
    entry = MockConfigEntry(domain=DOMAIN, data={})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


@pytest.fixture
async def store(hass, config_entry) -> RuleStore:  # noqa: ARG001 — entry triggers setup
    """The integration's live RuleStore."""
    return hass.data[DOMAIN][DATA_STORE]
