"""WebSocket command tests."""

from __future__ import annotations

import pytest

from custom_components.smart_icons.const import (
    EVENT_OPTIONS_UPDATED,
    WS_DELETE,
    WS_GET_OPTIONS,
    WS_LIST,
    WS_REPLACE_ALL,
    WS_SUBSCRIBE,
    WS_UPDATE_OPTIONS,
    WS_UPSERT,
    WS_VERSION,
)
from custom_components.smart_icons.websocket_api import INTEGRATION_VERSION


def _mapping_rule_payload(**overrides):
    data = {
        "target": "light.kitchen",
        "source": "input_select.scene",
        "mode": "mapping",
        "mapping": {"on": {"color": "#fff"}},
    }
    data.update(overrides)
    return data


async def test_list_empty(hass, hass_ws_client, config_entry):  # noqa: ARG001
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": WS_LIST})
    resp = await ws.receive_json()
    assert resp["success"] is True
    assert resp["result"] == {"rules": []}


async def test_upsert_returns_id_then_list_includes_it(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": WS_UPSERT, "rule": _mapping_rule_payload()})
    resp = await ws.receive_json()
    assert resp["success"] is True
    rule_id = resp["result"]["id"]
    assert rule_id

    await ws.send_json({"id": 2, "type": WS_LIST})
    resp = await ws.receive_json()
    assert len(resp["result"]["rules"]) == 1
    assert resp["result"]["rules"][0]["id"] == rule_id


async def test_upsert_invalid_returns_error(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": WS_UPSERT,
            "rule": {"target": "not-an-entity", "mode": "mapping"},
        }
    )
    resp = await ws.receive_json()
    assert resp["success"] is False
    assert resp["error"]["code"] == "invalid_format"


async def test_delete_existing(hass, hass_ws_client, config_entry):  # noqa: ARG001
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": WS_UPSERT, "rule": _mapping_rule_payload()})
    rule_id = (await ws.receive_json())["result"]["id"]

    await ws.send_json({"id": 2, "type": WS_DELETE, "rule_id": rule_id})
    resp = await ws.receive_json()
    assert resp["success"] is True


async def test_delete_unknown_returns_error(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": WS_DELETE, "rule_id": "01NOPE"})
    resp = await ws.receive_json()
    assert resp["success"] is False
    assert resp["error"]["code"] == "not_found"


async def test_subscribe_streams_events(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    ws = await hass_ws_client(hass)

    await ws.send_json({"id": 1, "type": WS_SUBSCRIBE})
    ack = await ws.receive_json()
    assert ack["success"] is True

    await ws.send_json({"id": 2, "type": WS_UPSERT, "rule": _mapping_rule_payload()})
    # Order: the subscribe stream gets the "added" event, then the upsert
    # request gets its own result. Receive both, sort by what they are.
    msgs = [await ws.receive_json(), await ws.receive_json()]
    event = next(m for m in msgs if m.get("type") == "event")
    assert event["event"]["type"] == "added"
    assert event["event"]["rule"]["targets"] == ["light.kitchen"]


async def test_replace_all_success_returns_count(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": WS_REPLACE_ALL,
            "rules": [
                {
                    "target": "light.a",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#fff"}},
                },
                {
                    "target": "light.b",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#000"}},
                },
            ],
        }
    )
    resp = await ws.receive_json()
    assert resp["success"] is True
    assert resp["result"]["count"] == 2


async def test_replace_all_validation_failure_returns_rule_errors(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    """Per-rule failures come back under `error.rule_errors` so the
    panel's YAML editor can highlight the specific offending rule."""
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": WS_REPLACE_ALL,
            "rules": [
                {
                    "target": "light.good",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#fff"}},
                },
                # No mode — fails validation
                {"target": "light.bad"},
            ],
        }
    )
    resp = await ws.receive_json()
    assert resp["success"] is False
    assert resp["error"]["code"] == "invalid_format"
    assert "rule_errors" in resp["error"]
    assert len(resp["error"]["rule_errors"]) == 1
    assert resp["error"]["rule_errors"][0]["index"] == 1
    assert "mode" in resp["error"]["rule_errors"][0]["message"].lower()


async def test_replace_all_atomic_on_failure(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    """When a replace_all batch fails validation, the existing rules
    in the store must be untouched — that's the contract."""
    ws = await hass_ws_client(hass)
    # Seed two rules through the same WS the panel uses.
    await ws.send_json(
        {
            "id": 1,
            "type": WS_UPSERT,
            "rule": _mapping_rule_payload(target="light.seed_a"),
        }
    )
    await ws.receive_json()
    await ws.send_json(
        {
            "id": 2,
            "type": WS_UPSERT,
            "rule": _mapping_rule_payload(target="light.seed_b"),
        }
    )
    await ws.receive_json()

    # Snapshot the current state.
    await ws.send_json({"id": 3, "type": WS_LIST})
    before = (await ws.receive_json())["result"]["rules"]
    assert len(before) == 2

    # Attempt a replace with one bad rule.
    await ws.send_json(
        {
            "id": 4,
            "type": WS_REPLACE_ALL,
            "rules": [
                {
                    "target": "light.x",
                    "mode": "mapping",
                    "mapping": {"on": {"color": "#fff"}},
                },
                {"not": "a rule"},
            ],
        }
    )
    resp = await ws.receive_json()
    assert resp["success"] is False

    # Existing rules are untouched.
    await ws.send_json({"id": 5, "type": WS_LIST})
    after = (await ws.receive_json())["result"]["rules"]
    assert sorted(r["id"] for r in after) == sorted(r["id"] for r in before)


async def test_version(hass, hass_ws_client, config_entry):  # noqa: ARG001
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": WS_VERSION})
    resp = await ws.receive_json()
    assert resp["success"] is True
    # Compare against the canonical source so the test stays in sync with
    # the version bump rather than being a separate string to maintain.
    assert resp["result"]["integration"] == INTEGRATION_VERSION
    assert "ha_version" in resp["result"]
    assert resp["result"]["schema_version"] == 1


@pytest.mark.parametrize(
    ("payload", "label"),
    [
        ({"id": 1, "type": WS_LIST}, "list"),
        (
            {"id": 1, "type": WS_UPSERT, "rule": _mapping_rule_payload()},
            "upsert",
        ),
        ({"id": 1, "type": WS_DELETE, "rule_id": "01NOPE"}, "delete"),
        ({"id": 1, "type": WS_REPLACE_ALL, "rules": []}, "replace_all"),
        ({"id": 1, "type": WS_SUBSCRIBE}, "subscribe"),
        ({"id": 1, "type": WS_VERSION}, "version"),
        (
            {
                "id": 1,
                "type": WS_UPDATE_OPTIONS,
                "options": {"outline_enabled": False},
            },
            "update_options",
        ),
    ],
)
async def test_non_admin_user_gets_unauthorized(
    hass,
    hass_ws_client,
    hass_read_only_access_token,
    config_entry,  # noqa: ARG001
    payload,
    label,  # noqa: ARG001 — purely for nicer pytest IDs
):
    """All write/management WS commands are admin-gated via
    @websocket_api.require_admin. A read-only user authenticated to HA
    still gets `unauthorized` from each one. Confirms the panel-level
    admin guard is also enforced at the API.

    Note: `get_options` is intentionally *not* in this list — the
    painter bundle running for every user needs to read options at
    bootstrap. Its non-admin accessibility is asserted in a separate
    test below."""
    ws = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await ws.send_json(payload)
    resp = await ws.receive_json()
    assert resp["success"] is False
    assert resp["error"]["code"] == "unauthorized"


# ---------------------------------------------------------------------------
# Options commands
# ---------------------------------------------------------------------------


async def test_get_options_default(hass, hass_ws_client, config_entry):  # noqa: ARG001
    """A fresh integration reports the documented defaults."""
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": WS_GET_OPTIONS})
    resp = await ws.receive_json()
    assert resp["success"] is True
    assert resp["result"] == {"options": {"outline_enabled": True}}


async def test_get_options_is_not_admin_gated(
    hass,
    hass_ws_client,
    hass_read_only_access_token,
    config_entry,  # noqa: ARG001
):
    """Non-admin users must be able to read options — the painter
    bundle runs for every authenticated user and needs to know the
    `outline_enabled` value at bootstrap."""
    ws = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await ws.send_json({"id": 1, "type": WS_GET_OPTIONS})
    resp = await ws.receive_json()
    assert resp["success"] is True
    assert resp["result"]["options"]["outline_enabled"] is True


async def test_update_options_returns_merged_state(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    """Update returns the full options dict so the panel can update
    state without a second `get_options` round trip."""
    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": WS_UPDATE_OPTIONS,
            "options": {"outline_enabled": False},
        }
    )
    resp = await ws.receive_json()
    assert resp["success"] is True
    assert resp["result"]["options"]["outline_enabled"] is False

    # Subsequent get_options reflects the change.
    await ws.send_json({"id": 2, "type": WS_GET_OPTIONS})
    resp = await ws.receive_json()
    assert resp["result"]["options"]["outline_enabled"] is False


async def test_update_options_fires_bus_event(
    hass, hass_ws_client, config_entry  # noqa: ARG001
):
    """The event is the channel non-admin painters use to learn about
    admin toggles. Verifies the WS command path fires it (the store
    test covers the storage-only path)."""
    received: list[dict] = []
    hass.bus.async_listen(EVENT_OPTIONS_UPDATED, lambda ev: received.append(ev.data))

    ws = await hass_ws_client(hass)
    await ws.send_json(
        {
            "id": 1,
            "type": WS_UPDATE_OPTIONS,
            "options": {"outline_enabled": False},
        }
    )
    await ws.receive_json()
    await hass.async_block_till_done()

    assert received == [{"outline_enabled": False}]
