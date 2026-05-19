"""Storage for Smart Icons rules.

Wraps `homeassistant.helpers.storage.Store` so rules survive restarts,
ride along in backups, and pick up the standard atomic-write + debounced
flush behavior. Subscribers receive `(event, rule)` callbacks for live
WebSocket fan-out.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util.ulid import ulid_now

from .const import STORAGE_KEY, STORAGE_MINOR_VERSION, STORAGE_VERSION
from .rule import Rule, validate_rule

Listener = Callable[[str, Rule], None]


class RuleStore:
    """Async store + in-memory cache + subscriber fan-out."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            STORAGE_KEY,
            minor_version=STORAGE_MINOR_VERSION,
        )
        self._rules: dict[str, Rule] = {}
        self._listeners: list[Listener] = []

    async def async_load(self) -> None:
        """Hydrate the cache from disk. Safe to call once at setup."""
        data = await self._store.async_load() or {}
        rules = data.get("rules", []) if isinstance(data, dict) else []
        self._rules = {}
        for raw in rules:
            # Stored rules were validated on write, but re-validate on read
            # so a corrupted .storage file fails loudly rather than silently
            # serving bad data into the websocket layer.
            try:
                validated = validate_rule(raw)
            except Exception:  # noqa: BLE001 — third-party validation may raise broadly
                continue
            rule = Rule.from_dict(validated)
            if not rule.id:
                continue
            self._rules[rule.id] = rule

    async def async_save(self) -> None:
        """Persist current cache to disk."""
        await self._store.async_save(
            {"rules": [r.to_dict() for r in self._rules.values()]}
        )

    @callback
    def all(self) -> list[Rule]:
        return list(self._rules.values())

    @callback
    def get(self, rule_id: str) -> Rule | None:
        return self._rules.get(rule_id)

    @callback
    def by_target(self, entity_id: str) -> list[Rule]:
        return [r for r in self._rules.values() if r.target == entity_id]

    async def async_upsert(self, rule_data: dict[str, Any]) -> Rule:
        """Validate, insert or update; returns the stored Rule."""
        validated = validate_rule(rule_data)
        rule = Rule.from_dict(validated)
        now = dt_util.utcnow().isoformat()
        rule.updated = now

        is_new = not rule.id or rule.id not in self._rules
        if is_new:
            if not rule.id:
                rule.id = ulid_now()
            rule.created = now
        else:
            # Preserve created from the existing record so updates don't
            # rewrite history; created is set exactly once per rule.
            rule.created = self._rules[rule.id].created or now

        self._rules[rule.id] = rule
        await self.async_save()
        self._notify("added" if is_new else "updated", rule)
        return rule

    async def async_delete(self, rule_id: str) -> bool:
        """Delete a rule by id; returns False if it wasn't there."""
        rule = self._rules.pop(rule_id, None)
        if rule is None:
            return False
        await self.async_save()
        self._notify("removed", rule)
        return True

    def subscribe(self, callback_: Listener) -> Callable[[], None]:
        """Register a (event, rule) listener. Returns an unsubscribe callable."""
        self._listeners.append(callback_)

        def _unsub() -> None:
            if callback_ in self._listeners:
                self._listeners.remove(callback_)

        return _unsub

    def _notify(self, event: str, rule: Rule) -> None:
        # Snapshot the listener list before invoking so listeners are free
        # to unsubscribe themselves without mutating the iteration.
        for listener in list(self._listeners):
            listener(event, rule)
