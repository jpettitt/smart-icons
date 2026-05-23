"""WebSocket API for Smart Icons.

Commands under the `smart_icons/` namespace (see DESIGN.md § 8).
Rule-management commands (list, upsert, delete, replace_all,
subscribe, version, update_options) are admin-gated via
`@websocket_api.require_admin`. The panel that drives them is also
admin-only (see `frontend.py`), so rule management is an admin
concern by design.

`get_options` is intentionally NOT admin-gated — the painter bundle
runs for every authenticated user and needs to read the
installation-wide outline setting at bootstrap. Its return surface
exposes no admin-sensitive information.

Template-mode runtime evaluation (originally tagged for a
`render_template` WS command) is demand-driven — see TODO.md.
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
    WS_GET_OPTIONS,
    WS_LIST,
    WS_REPLACE_ALL,
    WS_SUBSCRIBE,
    WS_UPDATE_OPTIONS,
    WS_UPSERT,
    WS_VERSION,
)
from .rule import BulkReplaceError, Rule

INTEGRATION_VERSION = "0.3.0a2"


def async_register_commands(hass: HomeAssistant) -> None:
    """Register all WS commands. Called once from async_setup_entry."""
    websocket_api.async_register_command(hass, _ws_list)
    websocket_api.async_register_command(hass, _ws_upsert)
    websocket_api.async_register_command(hass, _ws_delete)
    websocket_api.async_register_command(hass, _ws_replace_all)
    websocket_api.async_register_command(hass, _ws_subscribe)
    websocket_api.async_register_command(hass, _ws_version)
    websocket_api.async_register_command(hass, _ws_get_options)
    websocket_api.async_register_command(hass, _ws_update_options)


def _store(hass: HomeAssistant):
    return hass.data[DOMAIN][DATA_STORE]


@callback
@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): WS_LIST})
def _ws_list(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    rules = [r.to_dict() for r in _store(hass).all()]
    connection.send_result(msg["id"], {"rules": rules})


@websocket_api.require_admin
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


@websocket_api.require_admin
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


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_REPLACE_ALL,
        # Top-level `rules` is the only payload field. Each entry is a
        # rule mapping; voluptuous only enforces the outer list shape
        # here so the store's per-rule validator can attach a precise
        # index to each failure (better UX than failing fast on the
        # first bad rule).
        vol.Required("rules"): [dict],
    }
)
@websocket_api.async_response
async def _ws_replace_all(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Atomically replace the whole rule set.

    Returns `{ count: N }` on success. On per-rule validation failure
    sends a custom error message containing a `rule_errors` array so
    the panel's YAML editor can mark the specific bad rule(s).
    """
    try:
        count = await _store(hass).async_replace_all(msg["rules"])
    except BulkReplaceError as err:
        # Custom error payload — frontend reads `error.rule_errors`.
        # HA's `send_error` only takes a flat (code, message) tuple,
        # so we hand-build the result frame here.
        connection.send_message(
            {
                "id": msg["id"],
                "type": "result",
                "success": False,
                "error": {
                    "code": websocket_api.const.ERR_INVALID_FORMAT,
                    "message": "One or more rules failed validation",
                    "rule_errors": [
                        {"index": i, "message": m} for i, m in err.errors
                    ],
                },
            }
        )
        return
    except vol.Invalid as err:
        connection.send_error(
            msg["id"], websocket_api.const.ERR_INVALID_FORMAT, str(err)
        )
        return
    connection.send_result(msg["id"], {"count": count})


@callback
@websocket_api.require_admin
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
@websocket_api.require_admin
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


# Read of installation-wide options. Intentionally NOT admin-gated:
# the painter bundle runs for every authenticated user and needs the
# current `outline_enabled` value at bootstrap. Returning the options
# dict exposes no admin-sensitive information (it's a small set of
# rendering preferences). The admin gate stays on the *update* path.
@callback
@websocket_api.websocket_command({vol.Required("type"): WS_GET_OPTIONS})
def _ws_get_options(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    connection.send_result(msg["id"], {"options": _store(hass).get_options()})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_UPDATE_OPTIONS,
        # Open-ended dict — the store's update method handles
        # default-merging and unknown-key passthrough. Each option's
        # specific shape is enforced by the panel UI; backend stays
        # permissive so a newer panel against an older backend
        # (or vice versa) doesn't drop fields silently.
        vol.Required("options"): dict,
    }
)
@websocket_api.async_response
async def _ws_update_options(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    updated = await _store(hass).async_update_options(msg["options"])
    connection.send_result(msg["id"], {"options": updated})
