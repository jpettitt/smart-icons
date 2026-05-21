# Changelog

## v0.2.0b1 — 2026-05-20

**Beta release.** Feature-complete for the v0.2 line but not yet
soak-tested in the wild. Install via HACS with "Show beta versions"
enabled, or pin the tag directly. Existing v0.1.x rules keep working
— the singular `target: <entity_id>` form is auto-migrated to the
new `targets: [<entity_id>]` list on load.

### What's new

- **Multi-target rules.** One rule can now apply to several entities
  at once. Pick them in the panel via HA's native multi-entity
  selector, or list them in YAML/JSON as `targets: [...]`.
- **Glob target patterns.** Targets can include shell-style patterns
  (`*`, `?`, `[set]`) — e.g. `light.kitchen_*` decorates every kitchen
  light. Patterns are resolved against `hass.states` at apply time;
  the panel shows a live "Matches N entities: ..." preview as you
  type. Newly-added entities that match an existing glob pick up
  the rule automatically (via entity-registry subscription).
- **Per-target source semantics.** For multi-target or glob rules
  with no explicit source, each matched target reacts to its **own**
  state (and `source_attribute`, if set). One rule like
  `targets: [sensor.*_temp]` with thresholds on numeric ranges →
  every matching sensor colors itself by its own reading.
  Single-literal-target rules still default `source` to the target,
  as before.
- **Rule editor UX overhaul.** Section-grouped layout (Apply to /
  React to / Decoration / Options), inline error placement, sticky
  save bar at the bottom of the dialog, validation-gated Save button,
  Duplicate action, reorderable threshold entries (↑ / ↓), and an
  HA-native dialog-style delete confirmation.
- **Glob preview in the editor.** Each glob row shows the count and a
  sample of matching entities — and warns when a pattern matches
  nothing yet.
- **Sidebar action error banner.** When toggling or deleting a rule
  fails (e.g. transient WS disconnect), the panel now shows a
  dismissible banner instead of silently swallowing the error; the
  toggle switch snaps back to match server state.
- **Responsive panel layout.** The rules table uses a CSS container
  query against the panel card, so opening the HA sidebar correctly
  triggers the card-stack layout (where viewport-based media queries
  miss it). Below ~860 px the table reformats as labeled cards;
  buttons can wrap.

### Configuration example

A glob + per-target rule that recolors every kitchen light by its
own brightness:

```jsonc
{
  "targets": ["light.kitchen_*"],
  "source_attribute": "brightness",
  "mode": "thresholds",
  "thresholds": [
    { "lt": 64,  "color": "#552200" },
    { "lt": 192, "color": "#ffaa00" },
    {            "color": "#ffffaa" }
  ]
}
```

(Note the absence of `source` — per-target semantics: each kitchen
light reacts to its own `brightness` attribute.)

### Internals

- `manifest.json` now declares `min_ha_version: "2024.7"` for the
  `StaticPathConfig` requirement.
- All `mwc-*` elements migrated to `ha-*` equivalents (`ha-button`
  with `variant=brand|neutral|danger`). `mwc-button` is unregistered
  in modern HA and renders as an invisible unknown element.
- `ha-selector` (HA's options-flow dispatcher) replaces direct
  `ha-entity-picker` use — fixes a click-area bug in dialog contexts.
- `store.async_load` exception catch narrowed to `(vol.Invalid,
  ValueError)` so unrelated bugs surface in the log instead of
  silently dropping rules.
- WS version endpoint now reads `homeassistant.__version__` directly
  instead of allocating a config dict per call.
- Misc dead-code cleanup (`_LOGGER`, `asdict`, `field`, an unused
  `validity-changed` event from an abandoned earlier approach).
- 80 pytest + 35 Web Test Runner tests green; typecheck clean.

### Schema migration

`v0.1.x` rules used a singular `target: <entity_id>` field. Those are
auto-migrated to `targets: [<entity_id>]` on load — no manual
intervention needed. New rules are written in canonical
`targets: [...]` form. The legacy field is still accepted at the
storage layer for back-compat through v0.x; removal scheduled for
v1.0.

### Known limitations (unchanged from v0.1.1)

- Template-mode rules are stored but not evaluated at runtime.
- Releasing a rule clears the color override but leaves the last
  injected icon on the target's state until the source integration
  pushes a fresh state.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.1.1...v0.2.0b1>

## v0.1.1 — 2026-05-19

Patch release: a couple of UX papercuts in the panel. No schema
changes — safe to upgrade in place.

### What's new

- **Duplicate button on each rule row.** New action between Edit and
  Delete — pre-fills the rule editor with the source rule's values
  but on save creates a fresh rule with a new id. Common workflow:
  set up a rule for one entity, then duplicate it for several
  similar entities, only changing the target. Dialog title reflects
  the mode ("Edit rule" / "Duplicate rule" / "Add rule").

### Bug fixes

- **Panel entity picker selection** — the Target / Source entity
  fields rendered the dropdown correctly but the actual clickable area
  collapsed to a thin band at the top of each list item, so most of
  the row was unclickable. Switched to `ha-selector` with an
  `entity` selector — the same dispatcher HA's own options flows use.
  Hover and selection now work on the full row.
- **Rule row action buttons** — Edit / Delete were rendered with no
  visible space between them; added 12 px of gap and the new
  Duplicate button between them.

### Internal

- CI: bumped `actions/checkout` and `actions/setup-node` to v5
  (Node 24 compatible) ahead of GitHub's September 2026 Node 20
  removal.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.1.0...v0.1.1>

## v0.1.0 — 2026-05-19

First release.

### What's new

- **Server-side icon swap** — define rules per entity; the integration
  computes the winning icon from rule + source state and writes it to
  the target's `state.attributes.icon`. HA's native render path takes
  it from there, so the override works in every surface that reads
  state attributes (web, mobile apps, voice displays). Survives
  Lovelace view switches and dashboard reloads — no DOM races.
- **Color override** — color rides alongside the icon via a custom
  `smart_icons_color` attribute that a small frontend painter applies
  as `style.color` on each `<ha-state-icon>`.
- **Two rule modes** — `thresholds` (numeric ranges; first match wins,
  last-with-no-comparator is the else branch) and `mapping` (exact
  state → decoration; `_else` is the fallback). `template` mode is
  accepted by the storage layer for forward compatibility; runtime
  evaluation lands in v0.2.
- **Source-attribute targeting** — drive a rule off an attribute of
  the source entity (e.g. `sun.sun.azimuth`) instead of its state.
- **Sidebar management panel** — Settings → Smart Icons. Add / edit /
  delete rules through a UI with HA's native entity and icon pickers,
  grouped sections (Apply to / React to / Decoration / Options).
- **WebSocket API** — `smart_icons/{list, upsert, delete, subscribe,
  version}` for programmatic access.
- **Persistent storage** — rules live in HA's `Store`, survive
  restarts, and ride along in backups.

### Configuration

No YAML required. After install:

1. Settings → Devices & services → Add Integration → search "Smart Icons" → Add.
2. Open the new "Smart Icons" entry in the sidebar to create rules.

Example: drive sun.sun's icon and color off its compass angle.

```jsonc
{
  "target": "sun.sun",
  "source": "sun.sun",
  "source_attribute": "azimuth",
  "mode": "thresholds",
  "thresholds": [
    { "lt": 90,  "color": "#001144", "icon": "mdi:weather-sunset" },
    { "lt": 180, "color": "#ffaa00", "icon": "mdi:weather-sunny" },
    { "lt": 270, "color": "#ff5500", "icon": "mdi:weather-sunset-down" },
    {            "color": "#001144", "icon": "mdi:moon-waning-crescent" }
  ]
}
```

### Requirements

- Home Assistant **2025.1.0** or newer (modern `ha-picker` components
  in the panel UI).

### Internals

- Two frontend bundles: always-on `smart_icons.js` (~4.5 KB, color
  painter), and lazy-loaded `smart_icons_panel.js` (~41 KB, Lit-based
  panel UI). Heavy lifting is in Python — the painter only bridges
  the color attribute to `style.color`.
- 102 tests across pytest + Web Test Runner.

### Known limitations

- Door 1 (entity settings dialog injection) is not yet shipped —
  rules are managed exclusively from the sidebar panel.
- Template-mode rules are stored but not evaluated at runtime; coming
  in v0.2.
- Releasing a rule clears the color override but leaves the last
  injected icon on the target's state attributes until the source
  integration pushes a fresh state. Acceptable for v0.1; tracked for
  cleanup.
