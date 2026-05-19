"""Server-side icon and color injection.

Subscribes to `state_changed` events for every rule's `source` entity.
On each change, evaluates the relevant rules and writes the winning
decoration onto the matching `target` entity's state attributes:

  - `icon`             → HA's standard glyph attribute. `ha-state-icon`
                         reads this natively — no frontend cooperation
                         needed for the glyph.
  - `smart_icons_color` → our namespaced color hint. The frontend
                         painter reads it and applies `style.color`,
                         since HA has no native attribute for icon color.

This avoids the DOM-mutation races we hit when patching `<ha-icon>`
properties from the frontend painter: we're upstream of every Lit
render, and the icon update flows through the same code path templated
entities already use.

Trade-offs accepted in v0.1:
- We don't restore the original `icon` attribute on rule deletion.
  Whatever value we last wrote stays until the source integration
  pushes its own state update. Acceptable because users typically don't
  delete rules in production and the integration corrects it eventually.
- Calling `hass.states.async_set` fires `state_changed`, which can wake
  automations that trigger on raw events. Most automations trigger on
  state transitions, not attribute changes; we accept the rare edge.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .const import ATTR_ICON, ATTR_SMART_ICONS_COLOR
from .evaluator import evaluate_rule, pick_winner
from .rule import Rule
from .store import RuleStore

_LOGGER = logging.getLogger(__name__)


class IconInjector:
    """State subscriber that pushes computed decorations to target entities."""

    def __init__(self, hass: HomeAssistant, store: RuleStore) -> None:
        self._hass = hass
        self._store = store
        self._unsub_store: Callable[[], None] | None = None
        self._unsub_state: Callable[[], None] | None = None
        self._tracked_sources: set[str] = set()
        # Targets we've written into, so we can release color cleanly on
        # rule removal. Icon is left as-is per the trade-off above.
        self._injected_targets: set[str] = set()

    @callback
    def async_start(self) -> None:
        """Begin watching rules and source states. Idempotent."""
        if self._unsub_store is not None:
            return
        self._unsub_store = self._store.subscribe(self._on_store_event)
        self._rebuild_subscription()
        # First-time evaluation for everything already in the store.
        for target in self._active_targets():
            self._apply_target(target)

    @callback
    def async_stop(self) -> None:
        """Stop watching and release every target we ever injected into."""
        if self._unsub_store:
            self._unsub_store()
            self._unsub_store = None
        if self._unsub_state:
            self._unsub_state()
            self._unsub_state = None
        for target in list(self._injected_targets):
            self._release_target(target)
        self._tracked_sources.clear()

    # --- Rule store ↔ subscription bookkeeping -----------------------------

    @callback
    def _on_store_event(self, event_type: str, rule: Rule) -> None:
        # Rule set changed. The source-tracking subscription may need to
        # widen or narrow; any previously-injected target that no longer
        # has a matching rule should be released.
        self._rebuild_subscription()
        self._apply_target(rule.target)
        active = self._active_targets()
        for target in list(self._injected_targets):
            if target not in active:
                self._release_target(target)

    @callback
    def _rebuild_subscription(self) -> None:
        sources = {r.source for r in self._store.all() if r.enabled}
        if sources == self._tracked_sources:
            return
        if self._unsub_state is not None:
            self._unsub_state()
            self._unsub_state = None
        self._tracked_sources = sources
        if not sources:
            return
        self._unsub_state = async_track_state_change_event(
            self._hass, list(sources), self._on_source_state_change
        )

    @callback
    def _on_source_state_change(self, event: Event) -> None:
        source = event.data.get("entity_id")
        if source is None:
            return
        for target in self._targets_for_source(source):
            self._apply_target(target)

    # --- Pure helpers ------------------------------------------------------

    def _active_targets(self) -> set[str]:
        return {r.target for r in self._store.all() if r.enabled}

    def _targets_for_source(self, source: str) -> set[str]:
        return {
            r.target
            for r in self._store.all()
            if r.enabled and r.source == source
        }

    # --- The actual write --------------------------------------------------

    @callback
    def _apply_target(self, target: str) -> None:
        """Evaluate rules for `target` and update its state attributes."""
        rules = [r for r in self._store.all() if r.target == target and r.enabled]
        if not rules:
            self._release_target(target)
            return

        decisions: list[tuple[Rule, dict[str, str | None] | None]] = []
        for rule in rules:
            source_state = self._hass.states.get(rule.source)
            source_value = source_state.state if source_state is not None else None
            decisions.append((rule, evaluate_rule(rule, source_value)))

        winner = pick_winner(decisions)
        if winner is None:
            self._release_target(target)
            return

        current = self._hass.states.get(target)
        if current is None:
            # Forward-declared target; nothing to update yet. When the
            # target eventually appears, the source state-change handler
            # will re-evaluate.
            return

        new_attrs: dict[str, Any] = dict(current.attributes)
        changed = False

        winning_icon = winner.get("icon")
        if winning_icon is not None and new_attrs.get(ATTR_ICON) != winning_icon:
            new_attrs[ATTR_ICON] = winning_icon
            changed = True

        winning_color = winner.get("color")
        if winning_color is not None:
            if new_attrs.get(ATTR_SMART_ICONS_COLOR) != winning_color:
                new_attrs[ATTR_SMART_ICONS_COLOR] = winning_color
                changed = True
        elif ATTR_SMART_ICONS_COLOR in new_attrs:
            new_attrs.pop(ATTR_SMART_ICONS_COLOR)
            changed = True

        if not changed:
            return

        self._hass.states.async_set(target, current.state, new_attrs)
        self._injected_targets.add(target)

    @callback
    def _release_target(self, target: str) -> None:
        """Strip the smart_icons_color attribute. Icon is left as-is."""
        if target not in self._injected_targets:
            return
        self._injected_targets.discard(target)
        current = self._hass.states.get(target)
        if current is None:
            return
        if ATTR_SMART_ICONS_COLOR not in current.attributes:
            return
        new_attrs = dict(current.attributes)
        new_attrs.pop(ATTR_SMART_ICONS_COLOR)
        self._hass.states.async_set(target, current.state, new_attrs)
