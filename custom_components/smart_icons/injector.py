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

import fnmatch
from collections.abc import Callable
from typing import Any

from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .const import ATTR_ICON, ATTR_SMART_ICONS_COLOR
from .evaluator import evaluate_rule, pick_winner
from .rule import Rule
from .store import RuleStore

_GLOB_CHARS = ("*", "?", "[")


def _is_glob(entry: str) -> bool:
    return any(c in entry for c in _GLOB_CHARS)


class IconInjector:
    """State subscriber that pushes computed decorations to target entities."""

    def __init__(self, hass: HomeAssistant, store: RuleStore) -> None:
        self._hass = hass
        self._store = store
        self._unsub_store: Callable[[], None] | None = None
        self._unsub_state: Callable[[], None] | None = None
        self._unsub_registry: Callable[[], None] | None = None
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
        # Watch the entity registry too so glob-targeted rules pick up
        # newly-added entities. We listen for the broad
        # `entity_registry_updated` event; the handler debounces by just
        # re-applying all glob rules once on each event burst (cheap).
        self._unsub_registry = self._hass.bus.async_listen(
            "entity_registry_updated", self._on_entity_registry_event
        )
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
        if self._unsub_registry:
            self._unsub_registry()
            self._unsub_registry = None
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
        for target in self._resolve_targets(rule):
            self._apply_target(target)
        active = self._active_targets()
        for target in list(self._injected_targets):
            if target not in active:
                self._release_target(target)

    @callback
    def _on_entity_registry_event(self, _event: Event) -> None:
        """A new entity may now match a glob in some rule — re-apply
        the rules that have glob targets so newly-eligible entities get
        decorated. Cheap: only rules with globs are walked, and apply
        is a per-entity O(1) attribute write."""
        for rule in self._store.all():
            if not rule.enabled:
                continue
            if not any(_is_glob(t) for t in rule.targets):
                continue
            for target in self._resolve_targets(rule):
                self._apply_target(target)

    @callback
    def _rebuild_subscription(self) -> None:
        sources: set[str] = set()
        for r in self._store.all():
            if not r.enabled:
                continue
            if r.source:
                # Explicit source — subscribe to that one entity for this rule.
                sources.add(r.source)
            else:
                # Per-target rule — subscribe to each resolved target so
                # changes to its own state retrigger evaluation.
                sources |= self._resolve_targets(r)
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

    def _resolve_targets(self, rule: Rule) -> set[str]:
        """Expand a rule's `targets` list into the concrete set of entity
        ids it currently applies to. Literals pass through; globs are
        matched against current `hass.states` keys with fnmatch."""
        out: set[str] = set()
        all_ids: list[str] | None = None  # lazily fetched once per call
        for entry in rule.targets:
            if _is_glob(entry):
                if all_ids is None:
                    all_ids = list(self._hass.states.async_entity_ids())
                out.update(fnmatch.filter(all_ids, entry))
            else:
                out.add(entry)
        return out

    def _active_targets(self) -> set[str]:
        active: set[str] = set()
        for r in self._store.all():
            if r.enabled:
                active |= self._resolve_targets(r)
        return active

    def _targets_for_source(self, source: str) -> set[str]:
        """Which targets are affected when `source`'s state changes?

        For explicit-source rules: all of the rule's targets (one source
        drives them all). For per-target rules: only the single target
        that *is* `source` — other targets aren't affected by another
        target's state change.
        """
        out: set[str] = set()
        for r in self._store.all():
            if not r.enabled:
                continue
            resolved = self._resolve_targets(r)
            if r.source:
                if r.source == source:
                    out |= resolved
            else:
                # Per-target: only the matching target itself.
                if source in resolved:
                    out.add(source)
        return out

    # --- The actual write --------------------------------------------------

    @callback
    def _apply_target(self, target: str) -> None:
        """Evaluate rules for `target` and update its state attributes."""
        # A rule applies to this target if any of its targets entries
        # (literal or glob) resolves to this entity_id.
        rules = [
            r
            for r in self._store.all()
            if r.enabled and target in self._resolve_targets(r)
        ]
        if not rules:
            self._release_target(target)
            return

        decisions: list[tuple[Rule, dict[str, str | None] | None]] = []
        for rule in rules:
            # Effective source: explicit if set, otherwise the target
            # itself (per-target rules). source_attribute applies to
            # whichever source we end up reading from.
            effective_source = rule.source or target
            source_state = self._hass.states.get(effective_source)
            source_value: str | None = None
            if source_state is not None:
                if rule.source_attribute:
                    # Read the named attribute and string-coerce. The
                    # evaluator does its own numeric parsing internally
                    # for thresholds; mapping does exact-string match,
                    # which is what we want for non-numeric attributes
                    # (e.g. `weather.home.condition`).
                    attr_value = source_state.attributes.get(rule.source_attribute)
                    if attr_value is not None:
                        source_value = str(attr_value)
                else:
                    source_value = source_state.state
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
