"""WebSocket command tests."""

from __future__ import annotations

import pytest

from custom_components.smart_icons.const import (
    WS_DELETE,
    WS_LIST,
    WS_SUBSCRIBE,
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
        ({"id": 1, "type": WS_SUBSCRIBE}, "subscribe"),
        ({"id": 1, "type": WS_VERSION}, "version"),
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
    """All five WS commands are admin-gated via @websocket_api.require_admin.
    A read-only user authenticated to HA still gets `unauthorized` from each
    one. Confirms the panel-level admin guard is also enforced at the API."""
    ws = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    await ws.send_json(payload)
    resp = await ws.receive_json()
    assert resp["success"] is False
    assert resp["error"]["code"] == "unauthorized"
