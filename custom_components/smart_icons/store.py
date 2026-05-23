"""Storage for Smart Icons rules.

Wraps `homeassistant.helpers.storage.Store` so rules survive restarts,
ride along in backups, and pick up the standard atomic-write + debounced
flush behavior. Subscribers receive `(event, rule)` callbacks for live
WebSocket fan-out.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import voluptuous as vol
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from homeassistant.util.ulid import ulid_now

from .const import (
    DEFAULT_OPTIONS,
    EVENT_OPTIONS_UPDATED,
    STORAGE_KEY,
    STORAGE_MINOR_VERSION,
    STORAGE_VERSION,
)
from .rule import BulkReplaceError, Rule, validate_rule

Listener = Callable[[str, Rule], None]
OptionsListener = Callable[[dict[str, Any]], None]


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
        # Installation-wide options. Defaults live in const.DEFAULT_OPTIONS;
        # async_load merges any persisted overrides in, so new option keys
        # added in future minor versions pick up their default automatically
        # for users on older saved docs (no migration needed).
        self._options: dict[str, Any] = dict(DEFAULT_OPTIONS)
        self._options_listeners: list[OptionsListener] = []

    async def async_load(self) -> None:
        """Hydrate the cache from disk. Safe to call once at setup."""
        data = await self._store.async_load() or {}
        rules = data.get("rules", []) if isinstance(data, dict) else []
        stored_options = (
            data.get("options", {}) if isinstance(data, dict) else {}
        )
        # Start from defaults, then layer persisted values on top. Unknown
        # keys round-trip — future panel versions can store option keys
        # the current backend doesn't know about, and a downgrade won't
        # silently drop them.
        self._options = {**DEFAULT_OPTIONS, **stored_options}
        self._rules = {}
        for raw in rules:
            # Stored rules were validated on write, but re-validate on read
            # so a corrupted .storage file degrades to "drop the bad rule"
            # rather than serving malformed data into the websocket layer.
            # Catch only the two exceptions either side can throw —
            # everything else is an actual bug we want to see in the log.
            try:
                validated = validate_rule(raw)
                rule = Rule.from_dict(validated)
            except (vol.Invalid, ValueError):
                continue
            if not rule.id:
                continue
            self._rules[rule.id] = rule

    async def async_save(self) -> None:
        """Persist current cache to disk."""
        await self._store.async_save(
            {
                "rules": [r.to_dict() for r in self._rules.values()],
                "options": self._options,
            }
        )

    @callback
    def all(self) -> list[Rule]:
        return list(self._rules.values())

    @callback
    def get(self, rule_id: str) -> Rule | None:
        return self._rules.get(rule_id)

    @callback
    def by_target(self, entity_id: str) -> list[Rule]:
        """Rules whose `targets` literally include this entity id.
        Glob entries are not expanded here — glob resolution lives in
        the injector where `hass.states` is available."""
        return [r for r in self._rules.values() if entity_id in r.targets]

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

    async def async_replace_all(
        self, raw_rules: list[dict[str, Any]]
    ) -> int:
        """Atomically replace the entire rule set.

        Validates every incoming rule *before* touching state. On any
        validation failure, raises `BulkReplaceError` with per-rule
        details and leaves the store untouched — this is the all-or-
        nothing semantic the panel's YAML editor relies on.

        On success: swaps the in-memory cache, persists once via
        `async_save`, then fires `added` / `updated` / `removed`
        events to subscribers so the frontend rule-store reconciles
        in one update wave.

        Returns the number of rules in the new set.
        """
        # Phase 1 — validate everything. Any per-rule failures get
        # collected with their index so the frontend can highlight
        # the specific offending rule(s) in the YAML editor.
        validated: list[Rule] = []
        errors: list[tuple[int, str]] = []
        for idx, raw in enumerate(raw_rules):
            if not isinstance(raw, dict):
                errors.append((idx, "rule must be a YAML mapping"))
                continue
            try:
                v = validate_rule(raw)
                r = Rule.from_dict(v)
            except (vol.Invalid, ValueError) as exc:
                errors.append((idx, str(exc)))
                continue
            validated.append(r)
        if errors:
            raise BulkReplaceError(errors)

        # Phase 2 — assign ids and timestamps. Rules supplied with an
        # id that matches an existing record keep their `created`
        # stamp; everything else gets a fresh ulid + now-stamp.
        now = dt_util.utcnow().isoformat()
        for rule in validated:
            if not rule.id:
                rule.id = ulid_now()
                rule.created = now
            else:
                existing = self._rules.get(rule.id)
                rule.created = existing.created if existing else now
            rule.updated = now

        # Phase 3 — atomic swap. The on-disk write that follows is
        # itself atomic (HA's Store writes to a .tmp + rename), so the
        # config file is either entirely old or entirely new.
        old_rules = dict(self._rules)
        new_rules = {r.id: r for r in validated}
        self._rules = new_rules
        await self.async_save()

        # Phase 4 — fan out diff events. Subscribers (the frontend
        # rule-store, the injector) react to add/update/remove just
        # like single upsert/delete paths, so no special-case code is
        # needed downstream.
        for rule_id, old_rule in old_rules.items():
            if rule_id not in new_rules:
                self._notify("removed", old_rule)
        for rule_id, new_rule in new_rules.items():
            if rule_id in old_rules:
                self._notify("updated", new_rule)
            else:
                self._notify("added", new_rule)

        return len(new_rules)

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

    # ------------------------------------------------------------------
    # Options API (installation-wide, admin-controlled via WS)
    # ------------------------------------------------------------------

    @callback
    def get_options(self) -> dict[str, Any]:
        """Snapshot of the current options dict.

        Always returns a fresh copy so callers can pass it across the
        WS boundary without worrying about mutation back into our cache.
        """
        return dict(self._options)

    @callback
    def get_option(self, key: str, default: Any = None) -> Any:
        return self._options.get(key, default)

    async def async_update_options(self, options: dict[str, Any]) -> dict[str, Any]:
        """Merge `options` into the current options dict and persist.

        Returns the resulting options snapshot. Fires an HA bus event
        (`smart_icons_options_updated`) with the snapshot as data, so
        frontend painters — including those running for non-admin
        users who can't call our WS API — pick up the change live.

        Skips persistence and the event entirely if no key actually
        changed, to avoid spurious paint storms when a panel re-sends
        the same options on save.
        """
        merged = {**self._options, **options}
        if merged == self._options:
            return dict(self._options)
        self._options = merged
        await self.async_save()
        # In-process subscriber fan-out for tests + internal listeners.
        for listener in list(self._options_listeners):
            listener(self._options)
        # HA bus event for the frontend painter, which subscribes to the
        # event bus via the standard frontend WS connection (no admin
        # gate, available to every authenticated user).
        self._hass.bus.async_fire(EVENT_OPTIONS_UPDATED, dict(self._options))
        return dict(self._options)

    def subscribe_options(
        self, callback_: OptionsListener
    ) -> Callable[[], None]:
        """Register a listener for in-process options changes. Used by
        tests and any internal consumer that needs the new options
        before the bus event has been dispatched. Returns an
        unsubscribe callable."""
        self._options_listeners.append(callback_)

        def _unsub() -> None:
            if callback_ in self._options_listeners:
                self._options_listeners.remove(callback_)

        return _unsub
