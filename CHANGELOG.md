<!-- markdownlint-disable MD024 -->
# Changelog

## v0.3.0a1 — 2026-05-23

**Alpha.** First release on the v0.3 line. Ships the
contrasting-outline feature and the supporting options storage +
WS plumbing. Drop-in upgrade from v0.2.2; no schema migration.
HACS users on the beta channel will pick this up; regular-channel
users stay on v0.2.2 until v0.3.0 GA.

### What's new

- **Contrasting outline on painted icons.** Smart Icons now draws a
  thin black or white outline around every icon it paints, picked
  automatically for contrast against the painted color (W3C relative
  luminance). Fixes the "yellow icon on a light theme card" /
  "dark-blue icon on a dark card" readability failure mode that
  motivated this feature. Implemented as a native SVG
  `paint-order: stroke fill` on the inner glyph path — composited
  on the GPU in a single render pass alongside the fill, no CSS
  filter overhead. See
  [`docs/icon-outline-prototype-results.md`](docs/icon-outline-prototype-results.md)
  for the prototype variants tested and why this approach won.
- **Installation-wide outline toggle.** New checkbox above the rules
  table in the Smart Icons panel: *Contrasting outline on painted
  icons* (default on). Admin-only, persisted in the integration's
  storage alongside the rules, applies live to every painted icon
  across the install via the new `smart_icons_options_updated`
  bus event. Disable if you have a theme or design language that
  prefers unstyled icons.
- **Options storage + WS commands.** New top-level `options` dict in
  `smart_icons.rules` storage doc — future installation-wide
  preferences (e.g. an "outline every icon" mode) will live here
  without a schema bump. Two new WS commands: `smart_icons/get_options`
  (any authenticated user, so the painter bundle can read defaults
  for non-admin viewers) and `smart_icons/update_options` (admin
  gate).

### Internals

- 112 pytest + 85 Web Test Runner tests green (+12 backend, +12
  frontend over v0.2.2); typecheck clean.
- `frontend/src/outline-proto.ts` removed; replaced by the
  shipped-quality `frontend/src/outline.ts` (rename preserved in
  git history).
- Template-mode evaluation moved from a v0.3 commitment to
  [TODO.md](TODO.md)'s "Followups & ideas" parking lot — rule
  stacking (priority + selective matching) already covers the
  use cases template mode was meant for. See the new note in
  TODO.md and the worked example in
  [`docs/examples.md`](docs/examples.md).

### Known debt

- The rule editor uses plain HTML `<input>` / `<select>` /
  `<textarea>` / `<button>` styled with HA CSS variables (a
  workaround dating to a historical `ha-textfield` lazy-load
  bug). Targeted for conversion to `ha-textfield` / `ha-select` /
  `ha-button` in v0.3.0a2 per the project's
  no-bare-form-elements rule. Doesn't affect the alpha's
  user-visible behavior; flagged here for transparency. See
  TODO.md.

### Upgrade

Drop-in from v0.2.2 — no schema migration. The outline is on by
default for the readability improvement; disable from the panel
toggle if you prefer unstyled icons.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.2.2...v0.3.0a1>

## v0.2.2 — 2026-05-22

GA on the v0.2.2 line — promotes the painter-reliability fixes from
the two betas, adds a missing-button fix in the delete confirm dialog,
ships a starter pack of paste-ready example rules, and overhauls how
releases are published. Drop-in upgrade from v0.2.1, b1, or b2; no
schema changes.

### Bug fixes since v0.2.1

- **Painter walk-up for `<state-badge>` surfaces** (from b1). The
  painter was reading `entity_id` directly from each
  `<ha-state-icon>`'s `stateObj`, which is missing in some HA
  surfaces — `<state-badge>` wrappers (entities-card rows, more-info
  dialog headers) carry the `stateObj` on the wrapper and pass only
  attribute hints down. Painter now walks up through parents (across
  shadow boundaries) to find the first ancestor with a `stateObj`,
  with a 12-hop guard.
- **Empty watcher cache on slow-loading dashboards** (from b2). The
  watcher previously seeded itself from `<home-assistant>.hass.states`,
  which is filled asynchronously and was empty on some setups at our
  bootstrap. It now fetches authoritative initial state via the
  `get_states` WS command, buffers any `state_changed` events that
  arrive during the fetch, and drains them on top of the snapshot.
- **Icons un-painted after Lovelace view switches** (from b2). The
  MutationObserver crawler couldn't see entity bindings Lit was about
  to make on view swaps. The painter now also patches
  `ha-state-icon`'s `stateObj` property setter at bootstrap
  (idempotent, prototype-chain-walking), so every binding HA
  establishes flows through the painter synchronously. The crawler
  stays as a defensive fallback.
- **Delete and discard confirm dialogs had no buttons.** Modern
  `<ha-dialog>` dropped the `primaryAction` / `secondaryAction` slots
  the confirm modals were targeting, so the dialog opened with text
  but no way to confirm or cancel — leaving "edit the YAML" as the
  only escape hatch. Buttons now live in the dialog body with a
  dedicated action row.

### What's new

- **Cache-busted bundle URLs.** `smart_icons.js` and
  `smart_icons_panel.js` now ship with `?v=<mtime>` query strings so
  every release (and every local rebuild) busts the browser cache
  automatically. No more "I updated but I'm still seeing old
  behavior" after a HACS upgrade. See
  [`custom_components/smart_icons/frontend.py`](custom_components/smart_icons/frontend.py)
  for the mechanism.
- **Packaged release zip, attached as a GitHub release asset.** A new
  `release.yml` workflow runs pytest + the frontend test suite on tag
  push, then builds and attaches a HACS-conventional
  `smart_icons.zip`. `hacs.json` declares the filename via
  `zip_release` so HACS pulls the asset directly — which lets the
  release page show real download counts rather than the source
  tarball's blank counter. Drop-in for existing HACS users; no manual
  action required.
- **Example-rules doc.** [`docs/examples.md`](docs/examples.md) is a
  growing collection of paste-ready rules — door/window contact
  sensors, locks (with a cross-source door-open override), NWS
  temperature color scale + stale-data warning, and sun-position
  variants (elevation banded, direction aware, and a combined
  two-rule pattern that demonstrates how priority + selective
  matching achieves "templated" behavior without templates). Each
  example explains the mechanics that make it work.

### Internals

- 100 pytest + 73 Web Test Runner tests green (+4 new for the
  cache-buster URL shape); typecheck clean.
- Frontend version files bumped: `frontend/package.json` and
  `frontend/package-lock.json` aligned to `0.2.2`.

### Upgrade

Drop-in from v0.2.1, v0.2.2b1, or v0.2.2b2 via HACS. The
cache-buster query strings ensure existing browser sessions pick up
the new bundles on next page load without a hard refresh.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.2.1...v0.2.2>

## v0.2.2b2 — 2026-05-22

Second beta on the v0.2.2 line. Two fixes that close out the
remaining "icons not painted" reports from b1 — one for an empty-
cache race at bootstrap, one for view-switch mounts the
MutationObserver crawler was missing. Drop-in upgrade from b1 or
v0.2.1; no schema change.

### Bug fixes

- **Empty watcher cache after bootstrap on slow-loading dashboards.**
  The watcher was copying initial state from
  `<home-assistant>.hass.states` inside `start()`. That map is
  populated asynchronously by HA's connection layer; on slower
  setups it was empty when our bundle's bootstrap reached
  `start()`, and any `state_changed` events that arrived during the
  subscribe-handshake await were dropped on the floor. The result
  was slow-moving entities (temperatures, locks — anything that
  doesn't fire another state_changed for hours) staying invisible
  to the cache permanently. The watcher now fetches authoritative
  initial state via the `get_states` WS command, buffers any
  events that arrive during the fetch, and drains them on top of
  the snapshot — no race, no lost events.
- **Icons un-painted after Lovelace view switches.** The
  MutationObserver crawler was firing thousands of times during a
  view swap (~3400 callbacks for a 100-icon dashboard) but our
  scan logic walked past the new `<ha-state-icon>` elements before
  Lit had a chance to render into their shadow roots, so they
  never landed in `knownHosts` and never got painted. The painter
  now also patches `ha-state-icon`'s `stateObj` property setter at
  bootstrap (idempotent, prototype-chain-walking); every entity
  binding that HA establishes — in any card, in any surface —
  flows through the patched setter and applies `smart_icons_color`
  synchronously. The DOM-crawler stays as a defensive fallback
  for HA versions where the prototype shape may change, with a
  one-line `console.warn` emitted when the patch can't find the
  accessor.

### Internals

- Drop the unused `StateWatcher.getState()` method and `IconHost`
  re-export from painter.ts — both were artifacts of earlier
  iterations.
- 96 pytest + 73 Web Test Runner tests green (+5 new for
  `applyStateObjPatch`); typecheck clean.

### Upgrade

Drop-in from v0.2.2b1 or v0.2.1. Enable beta versions in HACS to
pick it up.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.2.2b1...v0.2.2b2>

## v0.2.2b1 — 2026-05-22

**Beta.** Single fix on top of v0.2.1, shipped early to verify with
HACS beta-channel users before promoting to GA.

### Bug fixes

- **Some icons weren't being painted.** The painter was reading
  `entity_id` directly from each `<ha-state-icon>`'s `stateObj`
  property, which is missing in some HA surfaces — `<state-badge>`
  wrappers (used by the entities-card rows and more-info dialog
  headers in particular) carry the entity's `stateObj` on the
  wrapper itself and pass only `data-domain` / `data-state`
  attributes down. Painter now walks up through parents (across
  shadow boundaries) to find the first ancestor with a `stateObj`
  when the immediate icon has none. 12-hop guard keeps the lookup
  cheap.

### Internals

- Painter bundle: 3.3 KB → 3.6 KB. Panel bundle unchanged.
- 96 pytest + 68 Web Test Runner tests green (regression test for
  the state-badge DOM shape added).

### Upgrade

Drop-in from v0.2.1. Enable beta versions in HACS to pick it up.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.2.1...v0.2.2b1>

## v0.2.1 — 2026-05-22

### What's new

- **In-editor YAML view.** Each rule now has a *Show code editor* /
  *Show visual editor* text toggle next to Cancel + Save — the same
  pattern HA's automation editor uses. Switching modes round-trips:
  the form serializes to YAML, then YAML edits hydrate the form
  back on the way out. The rule's id is preserved so saves update
  in place rather than creating duplicates.
- **Whole-config YAML view.** The panel itself gets a *Show code
  editor* toggle at the bottom. Entering code mode dumps every rule
  as a `rules:` list ready to copy into a gist; Save replaces the
  whole config atomically.
- **Atomic save** via a new `smart_icons/replace_all` WS command.
  The server validates every rule before touching storage. Either
  the entire new set lands or nothing changes — no partial-update
  states on failure.
- **Clickable error highlighting.** Every save failure — YAML
  syntax errors with line/col, shape errors that name a rule, and
  server-side per-rule validation — renders as a clickable item.
  Clicking it focuses the textarea and selects the offending rule
  (or jumps to the offending line). The first error is auto-selected
  on display.
- **Discard-changes confirm.** Toggling from code back to visual
  with unsaved edits opens a confirmation modal so a misclick
  doesn't silently drop the YAML.

### Internals

- New `BulkReplaceError` exception + `RuleStore.async_replace_all`
  method. Admin-gated `smart_icons/replace_all` WS handler emits a
  custom error frame carrying `rule_errors: [{ index, message }]`
  for per-rule feedback.
- Frontend panel bundle gains `js-yaml` (panel-bundle size 60 KB →
  ~115 KB; painter bundle untouched at 3.3 KB).
- 96 pytest + 67 Web Test Runner tests green; typecheck clean.

### Design docs

See [`docs/yaml-editing.md`](docs/yaml-editing.md) for the full
design (motivation, UI patterns, library choice, validation layers,
failure-mode UX, testing strategy).

### Compatibility

Drop-in upgrade from v0.2.0. No schema change, no migration. After
update, restart HA.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.2.0...v0.2.1>

## v0.2.0 — 2026-05-21

First general-availability release of the v0.2 line. Rolls up everything
from `v0.2.0b1` and `v0.2.0b2` and adds the admin-gating work that landed
after b2. Existing v0.1.x rules keep working — the singular
`target: <entity_id>` form is auto-migrated to the new
`targets: [<entity_id>]` list on load.

### Highlights

- **Multi-target rules + glob target patterns.** One rule can apply to
  many entities at once, either as a literal list (`targets: [...]`) or
  shell-style globs (`light.kitchen_*`, `sensor.temp_?`). The panel
  shows live "Matches N entities" previews as you type a glob.
- **Per-target source semantics.** For a multi-target or glob rule
  with no explicit `source`, each matched target reacts to its **own**
  state and `source_attribute`. One rule, every kitchen light colored
  by its own brightness.
- **Mapping-state autocomplete.** Each mapping-key cell now offers a
  `<datalist>` of states the source entity has been observed in over
  the last seven days, sourced from the recorder. Falls back to the
  entity's current state when the recorder is disabled.
- **Admin-only management.** Both the WebSocket API and the sidebar
  panel are admin-gated. Non-admin users still see correctly painted
  icons on their dashboards because the painter bundle reads
  `smart_icons_color` directly from each entity's state attributes —
  no WS calls.
- **Painter color race fixed.** The painter now reads
  `smart_icons_color` from a synchronously-updated `StateWatcher`
  cache instead of from each host's `stateObj`, eliminating the
  Lit-render-timing race that previously made colors appear stuck
  until the user navigated away and back.
- **Glob rules survive HA restart.** Entities whose owning integration
  publishes them seconds after Smart Icons loads (the classic
  post-restart case for MQTT / lock / matter) are now caught by a
  `state_changed` listener filtered on `old_state is None` and the
  matching glob rule is applied immediately.
- **Responsive panel layout.** The rules table reformats as a labeled
  card stack on narrow widths via a CSS container query against the
  panel card — which correctly tracks the HA sidebar opening
  and closing (where viewport-based media queries miss it).
- **Rule editor UX overhaul.** Section-grouped layout (Apply to /
  React to / Decoration / Options), inline error placement, sticky
  save bar, validation-gated Save button, Duplicate action,
  reorderable threshold entries (↑ / ↓), and an HA-native dialog-style
  delete confirmation. Action error banner for toggle/delete failures.
- **Integration icon.** Painted-favicon brand mark under
  `custom_components/smart_icons/brand/` following HA's brands-proxy
  convention (HA 2026.3+) — no manifest changes needed; the icon
  shows up automatically in Settings → Devices & services and HACS.

### Configuration example

A glob + per-target rule that recolors every kitchen light by its own
brightness:

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
light reacts to its own `brightness`.)

### Schema migration

`v0.1.x` rules used a singular `target: <entity_id>` field. Those are
auto-migrated to `targets: [<entity_id>]` on load — no manual
intervention needed. New rules are written in canonical
`targets: [...]` form. The legacy field is still accepted at the
storage layer through v0.x for back-compat; removal is scheduled
for v1.0.

### Internals

- `manifest.json` declares `min_ha_version: "2024.7"` (the
  `StaticPathConfig` requirement).
- Painter bundle shrunk 4.4 KB → 3.3 KB after removing the
  `RuleStore` from the always-on bundle — only the panel bundle
  talks to the WS API now.
- All `mwc-*` elements migrated to `ha-*` (`ha-button` with
  `variant=brand|neutral|danger`). `mwc-button` is unregistered
  in modern HA and renders as an invisible unknown element.
- `ha-selector` (HA's options-flow dispatcher) replaces direct
  `ha-entity-picker` use — fixes a click-area bug in dialog contexts.
- WS version endpoint now reads `homeassistant.__version__`
  directly instead of allocating a config dict per call.
- `store.async_load` exception catch narrowed to
  `(vol.Invalid, ValueError)` so unrelated bugs surface in the log.
- Misc dead-code cleanup (`_LOGGER`, `asdict`, `field`, an unused
  `validity-changed` event from an abandoned earlier approach).
- 86 pytest + 36 Web Test Runner tests green; typecheck clean.

### Upgrading from v0.1.x

Drop-in. No manual migration. After updating, restart HA. Existing
rules keep working and the singular-`target` form is rewritten to
`targets: [...]` on first load.

### Known limitations (unchanged from v0.1.1)

- Template-mode rules are stored but not evaluated at runtime —
  v0.3 work.
- Releasing a rule clears the color override but leaves the last
  injected icon on the target's state until the source integration
  pushes a fresh state update.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.1.1...v0.2.0>

## v0.2.0b2 — 2026-05-21

Second beta. Three fixes from real-world use of v0.2.0b1.

### Bug fixes

- **Color stays stale until you switch dashboards.** When the
  backend wrote a new `smart_icons_color`, the painter and HA's
  card Lit re-render were both microtask-scheduled in the same
  tick with no ordering guarantee. The painter often ran first and
  read the previous `host.stateObj.attributes.smart_icons_color`,
  leaving the icon's color stuck until the user navigated away
  and back. (Icon glyph updated fine because HA's native render
  reads `state.attributes.icon` on the later re-render.) The
  state-watcher now caches the full attribute bag synchronously
  inside the event dispatch; the painter reads color from there
  instead of from the host's stateObj. Race eliminated.
- **Glob rules don't apply after HA restart.** Targets with a
  glob (e.g. `lock.*`) reverted to default icons and colors after
  HA restart until the user switched dashboards. On integration
  setup, globs were resolved against `hass.states.async_entity_ids()`
  — mostly empty right after restart because the entity-owning
  integrations haven't published yet. The entities arrived
  seconds later but nothing triggered a re-evaluation
  (`entity_registry_updated` doesn't fire because the registry
  entries persist across restarts). The injector now also listens
  for `state_changed` events filtered on `old_state is None`
  ("entity just appeared"); when one matches an enabled glob
  rule the source subscription is rebuilt and the rule is applied
  immediately.

### What's new

- **State autocomplete in the mapping editor.** Each mapping-key
  cell now offers a `<datalist>` of states the resolved source
  entity has actually been observed in — the last 7 days of
  recorder history plus the current state. Cached per entity.
  Falls back to just the current state when the recorder is
  disabled. Speeds up authoring mapping rules for entities with
  non-obvious state vocabularies (`lock`'s `locking` / `unlocking`,
  `alarm_control_panel`'s mode names, etc.).

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.2.0b1...v0.2.0b2>

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
