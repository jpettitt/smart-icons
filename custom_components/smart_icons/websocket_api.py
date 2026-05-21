"""WebSocket API for Smart Icons.

Five commands under the `smart_icons/` namespace (see DESIGN.md § 8).
v0.1 ships list / upsert / delete / subscribe / version. The
`render_template` command lands in v0.2 alongside template-mode evaluation.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.const import __version__ as HA_VERSION
from homeassistant.core import HomeAssistant, callback

from .const import (
    DATA_STORE,
    DOMAIN,
    WS_DELETE,
    WS_LIST,
    WS_SUBSCRIBE,
    WS_UPSERT,
    WS_VERSION,
)
from .rule import Rule

INTEGRATION_VERSION = "0.2.0b2"


def async_register_commands(hass: HomeAssistant) -> None:
    """Register all WS commands. Called once from async_setup_entry."""
    websocket_api.async_register_command(hass, _ws_list)
    websocket_api.async_register_command(hass, _ws_upsert)
    websocket_api.async_register_command(hass, _ws_delete)
    websocket_api.async_register_command(hass, _ws_subscribe)
    websocket_api.async_register_command(hass, _ws_version)


def _store(hass: HomeAssistant):
    return hass.data[DOMAIN][DATA_STORE]


@callback
@websocket_api.websocket_command({vol.Required("type"): WS_LIST})
def _ws_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    rules = [r.to_dict() for r in _store(hass).all()]
    connection.send_result(msg["id"], {"rules": rules})


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_UPSERT,
        vol.Required("rule"): dict,
    }
)
@websocket_api.async_response
async def _ws_upsert(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    try:
        rule = await _store(hass).async_upsert(msg["rule"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], websocket_api.const.ERR_INVALID_FORMAT, str(err))
        return
    connection.send_result(msg["id"], {"id": rule.id, "rule": rule.to_dict()})


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_DELETE,
        # `rule_id` rather than `id` — the WS envelope already owns the `id`
        # key (message sequence number, integer); reusing it for the rule
        # identifier would collide and fail framing validation.
        vol.Required("rule_id"): str,
    }
)
@websocket_api.async_response
async def _ws_delete(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    if not await _store(hass).async_delete(msg["rule_id"]):
        connection.send_error(msg["id"], websocket_api.const.ERR_NOT_FOUND, "rule not found")
        return
    connection.send_result(msg["id"], {"success": True})


@callback
@websocket_api.websocket_command({vol.Required("type"): WS_SUBSCRIBE})
def _ws_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Stream add/update/remove events to the client until they disconnect."""
    store = _store(hass)
    sub_id = msg["id"]

    def _forward(event: str, rule: Rule) -> None:
        # Map our internal event names to the WS protocol shape.
        # "added"/"updated"/"removed" → {"type": <event>, "rule": ..., "id": ...}.
        connection.send_event(
            sub_id,
            {"type": event, "id": rule.id, "rule": rule.to_dict()},
        )

    unsub = store.subscribe(_forward)
    connection.subscriptions[sub_id] = unsub
    connection.send_result(sub_id)


@callback
@websocket_api.websocket_command({vol.Required("type"): WS_VERSION})
def _ws_version(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    connection.send_result(
        msg["id"],
        {
            "integration": INTEGRATION_VERSION,
            "ha_version": HA_VERSION,
            "schema_version": 1,
        },
    )
