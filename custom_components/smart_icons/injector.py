"""Server-side icon, color, and background injection.

Subscribes to `state_changed` events for every rule's `source` entity.
On each change, evaluates the relevant rules and writes the merged
decoration onto the matching `target` entity's state attributes:

  - `icon`                  → HA's standard glyph attribute. `ha-state-icon`
                              reads this natively — no frontend cooperation
                              needed for the glyph.
  - `smart_icons_color`      → our namespaced color hint. The frontend
                              painter reads it and applies `style.color`,
                              since HA has no native attribute for icon
                              color.
  - `smart_icons_background` → background-chip color (Mushroom-style
                              colored circle behind the icon). Read by
                              the same painter that handles the color
                              attribute. Independent of `color` —
                              either, both, or neither may be set.

This avoids the DOM-mutation races we hit when patching `<ha-icon>`
properties from the frontend painter: we're upstream of every Lit
render, and the icon update flows through the same code path templated
entities already use.

Icon clearing semantics:
- When a rule drops its `icon` field (edit) or the rule is removed
  (delete), we pop the `icon` attribute from the target's state IFF
  the current value still equals what we last wrote. This restores
  HA's default fallback (domain / device-class icon) and avoids
  the "stale icon sticks forever" surprise that plagued v0.1/0.2.
- If the source integration overwrote our icon between the time we
  set it and the time we'd clear it, the current value won't match
  our recorded last-write and we leave the source's value alone.
  `_injected_icons` (target → last-written icon string) is the
  bookkeeping that makes this safe.

Other trade-offs:
- Calling `hass.states.async_set` fires `state_changed`, which can wake
  automations that trigger on raw events. Most automations trigger on
  state transitions, not attribute changes; we accept the rare edge.
"""

from __future__ import annotations

import fnmatch
from collections.abc import Callable
from typing import Any

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .const import ATTR_ICON, ATTR_SMART_ICONS_BACKGROUND, ATTR_SMART_ICONS_COLOR
from .evaluator import evaluate_rule, merge_decorations
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
        self._unsub_new_entity: Callable[[], None] | None = None
        self._tracked_sources: set[str] = set()
        # Targets we've written color/background into, so we can clear
        # cleanly on rule removal.
        self._injected_targets: set[str] = set()
        # Per-target record of the last `icon` value we wrote. Used to
        # tell "our icon" from "the source's icon" when deciding
        # whether to pop the attribute on rule edit/delete.
        self._injected_icons: dict[str, str] = {}
        # Per-rule resolved target sets (rule.id → set of entity_ids).
        # `_resolve_targets` builds entries lazily and we invalidate
        # surgically rather than blowing the cache away on every state
        # change: rule changes invalidate the affected rule's entry;
        # entity_registry_updated invalidates every rule that uses a
        # glob target; a new entity appearing on the bus invalidates
        # only the glob rules that could possibly match it. Literal-
        # only rules never need invalidation (entity ids don't change).
        # Without this cache the injector ran fnmatch.filter over
        # `hass.states.async_entity_ids()` on every relevant state
        # change — O(rules × globs × entities) on busy installs.
        self._resolved_cache: dict[str, set[str]] = {}

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
        # Catch entities that didn't exist when we started but appear
        # later. The classic case is HA restart: integrations like
        # MQTT / Zigbee / lock owners publish their entities seconds
        # after our integration loads. Glob rules need to re-resolve
        # when each new entity arrives — otherwise the user has to
        # bounce a dashboard before colors apply. `entity_registry_updated`
        # doesn't cover this, because the entity is *already* in the
        # registry (persistent); only its state machine entry is new.
        self._unsub_new_entity = self._hass.bus.async_listen(
            EVENT_STATE_CHANGED, self._on_state_changed_for_new_entity
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
        if self._unsub_new_entity:
            self._unsub_new_entity()
            self._unsub_new_entity = None
        for target in list(self._injected_targets | set(self._injected_icons)):
            self._release_target(target)
        self._tracked_sources.clear()

    # --- Rule store ↔ subscription bookkeeping -----------------------------

    @callback
    def _on_store_event(self, event_type: str, rule: Rule) -> None:
        # Rule set changed. The source-tracking subscription may need to
        # widen or narrow; any previously-injected target that no longer
        # has a matching rule should be released.
        #
        # Drop the changed rule's cached resolution so the new targets
        # list (if any) is recomputed on the next access. We don't need
        # to touch other rules' entries: their target lists didn't
        # change, and the entity set is unaffected by store events.
        self._invalidate_resolution(rule.id)
        self._rebuild_subscription()
        for target in self._resolve_targets(rule):
            self._apply_target(target)
        active = self._active_targets()
        for target in list(self._injected_targets | set(self._injected_icons)):
            if target not in active:
                self._release_target(target)

    @callback
    def _on_entity_registry_event(self, _event: Event) -> None:
        """A new entity may now match a glob in some rule — re-apply
        the rules that have glob targets so newly-eligible entities get
        decorated. Cheap: only rules with globs are walked, and apply
        is a per-entity O(1) attribute write.

        Entity-registry events change which ids exist, so any cached
        glob-resolution is potentially stale — invalidate first.
        Literal-only rules are unaffected and their cache survives. """
        self._invalidate_glob_rules()
        self._reapply_glob_rules()

    @callback
    def _on_state_changed_for_new_entity(self, event: Event) -> None:
        """Fast-path filter on every state_changed event: only act when
        `old_state is None` (an entity just appeared in the state machine
        that wasn't there a moment ago). Cheaply skips the ~all-changes
        common case; the slow path runs at most once per entity lifetime.

        Triggers a re-evaluation of every glob rule because the new
        entity might match one of them. Also rebuilds the source-state
        subscription so any rule that should now be watching this entity
        going forward (per-target rules with globs) is correctly wired.
        """
        if event.data.get("old_state") is not None:
            return
        entity_id = event.data.get("entity_id")
        if not isinstance(entity_id, str):
            return
        # If no glob rule could possibly match this entity, exit early
        # before touching the rule store.
        if not self._any_glob_matches(entity_id):
            return
        # The new entity may belong in a cached glob set we already
        # computed — invalidate every glob rule's resolution so the
        # next read picks the entity up. Literal-only rules can stay
        # cached; their resolution is independent of state-machine
        # composition.
        self._invalidate_glob_rules()
        self._rebuild_subscription()
        self._apply_target(entity_id)

    @callback
    def _reapply_glob_rules(self) -> None:
        """Resolve every glob rule against current hass.states and apply
        to each matched target. Refreshes the source-state subscription
        in case the resolved set has changed."""
        self._rebuild_subscription()
        for rule in self._store.all():
            if not rule.enabled:
                continue
            if not any(_is_glob(t) for t in rule.targets):
                continue
            for target in self._resolve_targets(rule):
                self._apply_target(target)

    @callback
    def _any_glob_matches(self, entity_id: str) -> bool:
        """True iff any enabled rule has a glob target that matches the
        given entity id. Cheap pre-check for the state-changed handler."""
        for rule in self._store.all():
            if not rule.enabled:
                continue
            for t in rule.targets:
                if _is_glob(t) and fnmatch.fnmatchcase(entity_id, t):
                    return True
        return False

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
        matched against current `hass.states` keys with fnmatch.

        Result is cached per rule id in `_resolved_cache`. The cache
        survives across `_apply_target`, `_active_targets`,
        `_targets_for_source`, and `_rebuild_subscription` calls
        within a single event burst — on a busy install this is the
        difference between O(rules × globs × entities) and O(1)
        per lookup. Invalidation is handled by `_on_store_event`,
        `_on_entity_registry_event`, and
        `_on_state_changed_for_new_entity`.
        """
        if rule.id:
            cached = self._resolved_cache.get(rule.id)
            if cached is not None:
                return cached
        out: set[str] = set()
        all_ids: list[str] | None = None  # lazily fetched once per call
        for entry in rule.targets:
            if _is_glob(entry):
                if all_ids is None:
                    all_ids = list(self._hass.states.async_entity_ids())
                out.update(fnmatch.filter(all_ids, entry))
            else:
                out.add(entry)
        if rule.id:
            self._resolved_cache[rule.id] = out
        return out

    @callback
    def _invalidate_resolution(self, rule_id: str | None = None) -> None:
        """Drop cached target resolutions.

        With no argument: full invalidation (e.g. entity-registry
        changes alter what every glob rule can match).

        With a `rule_id`: drop just that rule's entry. Used when one
        rule's targets list changed but the rest of the cache is
        still valid.
        """
        if rule_id is None:
            self._resolved_cache.clear()
            return
        self._resolved_cache.pop(rule_id, None)

    @callback
    def _invalidate_glob_rules(self) -> None:
        """Drop cached entries for every rule that uses any glob
        target. New-entity / entity-registry events can change which
        entity ids match a glob, but literal-only rules are
        unaffected — their resolved set is just the literals."""
        for rule in self._store.all():
            if not rule.id:
                continue
            if any(_is_glob(t) for t in rule.targets):
                self._resolved_cache.pop(rule.id, None)

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

        winner = merge_decorations(decisions)
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
        if winning_icon is not None:
            if new_attrs.get(ATTR_ICON) != winning_icon:
                new_attrs[ATTR_ICON] = winning_icon
                changed = True
            self._injected_icons[target] = winning_icon
        else:
            # Rule no longer specifies an icon. Pop the attribute only
            # if the value still matches what we last wrote — if the
            # source integration has since replaced it with its own
            # icon, that's not ours to clear.
            last_written = self._injected_icons.get(target)
            if (
                last_written is not None
                and new_attrs.get(ATTR_ICON) == last_written
            ):
                new_attrs.pop(ATTR_ICON, None)
                changed = True
            self._injected_icons.pop(target, None)

        winning_color = winner.get("color")
        if winning_color is not None:
            if new_attrs.get(ATTR_SMART_ICONS_COLOR) != winning_color:
                new_attrs[ATTR_SMART_ICONS_COLOR] = winning_color
                changed = True
        elif ATTR_SMART_ICONS_COLOR in new_attrs:
            new_attrs.pop(ATTR_SMART_ICONS_COLOR)
            changed = True

        # Background color: same set-or-clear pattern as color. When
        # set, the painter renders a Mushroom-style colored chip
        # behind the icon. When cleared, the painter strips the
        # background styling.
        winning_bg = winner.get("background_color")
        if winning_bg is not None:
            if new_attrs.get(ATTR_SMART_ICONS_BACKGROUND) != winning_bg:
                new_attrs[ATTR_SMART_ICONS_BACKGROUND] = winning_bg
                changed = True
        elif ATTR_SMART_ICONS_BACKGROUND in new_attrs:
            new_attrs.pop(ATTR_SMART_ICONS_BACKGROUND)
            changed = True

        if not changed:
            return

        self._hass.states.async_set(target, current.state, new_attrs)
        self._injected_targets.add(target)

    @callback
    def _release_target(self, target: str) -> None:
        """Strip every attribute this injector ever wrote for `target`:
        smart_icons_color, smart_icons_background, and icon (the last
        only when the current value still equals what we last wrote —
        see file header). HA's frontend falls back to the
        domain/device-class default when `icon` is popped, which is the
        right behavior on rule deletion."""
        had_icon_record = target in self._injected_icons
        if target not in self._injected_targets and not had_icon_record:
            return
        self._injected_targets.discard(target)
        last_icon = self._injected_icons.pop(target, None)
        current = self._hass.states.get(target)
        if current is None:
            return
        had_color = ATTR_SMART_ICONS_COLOR in current.attributes
        had_bg = ATTR_SMART_ICONS_BACKGROUND in current.attributes
        icon_is_ours = (
            last_icon is not None
            and current.attributes.get(ATTR_ICON) == last_icon
        )
        if not (had_color or had_bg or icon_is_ours):
            return
        new_attrs = dict(current.attributes)
        new_attrs.pop(ATTR_SMART_ICONS_COLOR, None)
        new_attrs.pop(ATTR_SMART_ICONS_BACKGROUND, None)
        if icon_is_ours:
            new_attrs.pop(ATTR_ICON, None)
        self._hass.states.async_set(target, current.state, new_attrs)
