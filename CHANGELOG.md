<!-- markdownlint-disable MD024 -->
# Changelog

## v0.3.0 — 2026-05-24

**GA release of the v0.3 line.** Ships the consolidated content of
the v0.3.0a1, a2, and a3 alphas — see those entries below for the
incremental development history. This entry is the upgrade summary
for users coming from v0.2.x.

### Breaking changes from v0.2

- **Template mode (`mode: template`) is removed.** Template-mode
  evaluation was inert through v0.2 / v0.3 alpha (the evaluator
  always returned `None`); v0.3.0 drops the dead code, the schema
  field, the editor template view, and the YAML round-trip.
  Stored rules with `mode: template` fail validation on load and
  are silently dropped by the store's per-rule `vol.Invalid`
  catch. **Migration:** build the same logic out of stacked
  mapping and threshold rules with the new field-level merge —
  see [`docs/examples.md`](docs/examples.md) for patterns
  including the sun rising/setting + elevation-banding example
  that demonstrates the dead-zone fallthrough trick.

- **Priority is now field-level, not rule-level.** The v0.2
  "highest-priority rule erases everything else" semantic is
  replaced by per-field merging. The highest-priority rule that
  *addresses* a given field (color, icon, or background) wins
  that field; lower-priority rules fill in fields the winner
  doesn't touch. Concretely: a chip-only rule at priority 99
  coexists with a color-by-state rule at priority 10 — chip from
  the high rule, color from the low rule. The v0.2 behavior
  dropped the color. **Migration:** any rule chain that relied on
  the implicit "winner takes all" behavior should set explicit
  null / `""` / `"inherit"` / `"unset"` sentinels on fields the
  high-priority rule needs to release — sentinels actively block
  lower-priority contributions, distinguishing "I have no opinion"
  from "I want this cleared." See
  [DESIGN.md § 4.2](DESIGN.md#42-decorations-and-the-priority-merge)
  for the full semantics.

### What's new since v0.2

- **Per-rule background chip (`background_color`).** Mushroom-
  style colored circle rendered behind the icon. Set on a mapping
  entry or threshold entry; either `color`, `background_color`,
  both, or neither may be present per entry. Accepts every CSS
  color string including `rgba()` for translucent chips.
- **Field-level priority merging.** Replaces v0.2's winner-takes-
  all rule (see breaking-changes section above).
- **YAML editing on `ha-code-editor`.** The per-rule YAML view in
  the rule editor and the whole-config YAML view in the panel
  both use HA's CodeMirror 6 surface — same one the automation
  editor uses. Syntax highlighting, search/replace, entity- and
  icon-name autocompletion, and a Ctrl+S / Cmd+S save shortcut.
  Per-rule validation errors remain clickable to jump-to-line.
- **Rule editor: HA-native form elements throughout.** Every text
  / number field is `ha-input`; pickers are `ha-selector` and
  `ha-icon-picker`; primary buttons are `ha-button`. Mapping and
  threshold rows show *Icon color* + *Background* side-by-side in
  a paired color picker. Threshold comparators got plain-English
  labels (`< Less than`, `≤ Less than or equal`, etc.).
- **Glob-target resolution cache** in the injector. v0.2 ran
  `fnmatch.filter` against `hass.states.async_entity_ids()` on
  every relevant state change per glob rule — `O(rules × globs ×
  entities)` per state change. v0.3 caches resolved sets per rule
  with surgical invalidation on rule changes, entity-registry
  events, and new-entity appearance. Cache hits are O(1) — a
  meaningful win on large installs (5k+ entities, many globs).
- **Visual examples in `docs/examples.md`.** The doors and sun
  examples now show actual rendered icons in side-by-side tables
  with the YAML that produces them. Sun icons are theme-aware
  via `<picture>` + `prefers-color-scheme` so the deep-night
  blues remain legible in dark mode.
- **README "See it in action"** section near the top with a
  preview of the sun outcome at six representative angles, linked
  to the full example.
- **Notes for integration developers** in the README documenting
  Smart Icons' synthetic `state_changed` writes (attribute-only
  updates fire `state_changed` with `state` unchanged; downstream
  listeners that don't care about attribute updates should filter
  on `new_state.state != old_state.state`).

### Bug fixes since v0.2

- **Stale icons no longer stick after a rule drops the `icon`
  field.** v0.2 wrote the icon attribute but never cleared it,
  leaving the previous glyph in place until HA restart. The
  injector now tracks the last `icon` it wrote per target and
  pops the attribute when the rule no longer addresses it — only
  if the current value still matches our last write, so source
  integrations that overwrote the icon with their own value are
  left alone.
- **Background-only rules now paint.** Earlier v0.3 alphas gated
  the painter on `smart_icons_color` being non-empty, so a rule
  setting only `background_color` wrote the attribute server-side
  but the painter ignored it. The painter's two paint paths
  (setter patch + DOM-crawler) are now deduped into a single
  `decideAndPaint` helper that triggers on either attribute.
- **Editor: thresholds-mode validation properly checks for
  meaningful entries.** Earlier the "needs at least one entry"
  check used a broken comparison that never fired; now it
  properly requires a comparator or at least one decoration
  field per row.
- **Editor: degenerate mapping rows no longer save.** A row with
  a key but no color / bg / icon used to serialize as `{key: {}}`
  — schema-valid but inert at runtime. These rows are now
  dropped on save with a validation error.

### Internals

- `pick_winner` retired in favor of `merge_decorations` (Python)
  / `mergeDecorations` (TypeScript). Sparse positions returned
  from `evaluate_thresholds` / `evaluate_mapping` let the merger
  distinguish "no position" from "explicit release."
- Painter deduped into a single `decideAndPaint(host, color, bg)`
  helper shared by the `stateObj` setter patch and the
  `paintHost` crawler — eliminates the source of the bg-only
  paint bug.
- TypeScript evaluator at parity with Python: handles
  `background_color` and mirrors the merge semantic exactly. Not
  on the paint path (the backend injector is authoritative) but
  the divergence would have been a latent trap for any future
  preview UI.
- Backend test coverage: 118 tests covering the merger, bg-only
  paths, icon-clear contract, source-integration-overwrites
  safety, the glob cache, and template-mode rejection.
- Frontend test coverage: rule-editor unit tests added (was
  previously only covered by Playwright e2e smoke). Web-test-
  runner config updated to pass the project tsconfig through so
  Lit's legacy decorators load under test.

### Upgrade from v0.2

Drop-in upgrade with two behavior changes to verify after install:

1. **Template-mode rules silently drop on load.** If you have any
   rules with `mode: template` in your storage doc, they will fail
   validation on load and be removed from the panel. Template
   mode was inert at runtime since v0.2 (the evaluator returned
   `None`), so functionally nothing changes — but the rule
   disappears. Rebuild the logic with stacked mapping / threshold
   rules first if you need to preserve the behavior.

2. **"Winner takes all" → field-level merge.** Any installation
   that depended on the v0.2 "highest-priority rule erases
   everything else" semantic should be re-checked. If a
   high-priority rule needs to actively hide a lower-priority
   rule's contribution to a field, set that field to `null` /
   `""` / `"inherit"` / `"unset"` explicitly. Sentinels block
   lower-priority contributions; absence allows them to flow
   through.

## v0.3.0a3 — 2026-05-24

**Alpha 3 on the v0.3 line.** Pivots the v0.3 line away from the
contrasting outline approach to a per-rule **Mushroom-style background
chip**, replaces the v0.2 "winner takes all" priority semantic with
**field-level merging**, **removes template mode** entirely after it
spent two minor versions as inert storage-only code, and migrates the
YAML editing surface from bare textareas to HA's **`ha-code-editor`**.
The post-review pass also fixed two real bugs surfaced in v0.3.0a1/a2
(stale icons after a rule drops its `icon`; bg-only rules not painting)
and added a glob-target resolution cache to the injector so large HA
installs don't burn CPU re-running `fnmatch` on every state change.

### Breaking changes

- **Template mode is gone.** `mode: template` and the `template`
  decoration field had been demoted to "storage-only / demand-driven"
  since v0.2 — the evaluator returned `None`, so any rule with
  `mode: template` was inert at runtime. Rather than keep dead code
  around (and a deprecated dropdown option in the editor, plus a
  "deprecated" legend in the template fieldset), v0.3.0a3 removes
  the schema entry, the editor's template view, and all related
  plumbing. **Stored rules with `mode: template` fail validation on
  load and are silently dropped** by the store's per-rule
  `vol.Invalid` catch. Migration: convert any template logic to
  stacked mapping / threshold rules (see
  [`docs/examples.md`](docs/examples.md)) before upgrading. If a
  stored rule with a stray `template` field on a non-template-mode
  rule survived a prior upgrade, that rule also fails to load now
  (the rule schema is PREVENT_EXTRA by default) — re-create it via
  the editor.

- **Installation-wide outline toggle is gone.** The
  `smart_icons/get_options` and `smart_icons/update_options`
  WebSocket commands, the `smart_icons_options_updated` bus event,
  the `outline_enabled` storage field, and the *Contrasting outline
  on painted icons* checkbox in the panel are all removed. Rules
  now opt in to a chip per-rule via the new `background_color`
  decoration field instead. Existing installs with
  `outline_enabled: false` saved from v0.3.0a1/a2 silently lose the
  setting on upgrade (it's no longer read); no migration is needed
  because nothing was rendered against the old toggle in this
  branch's contents.

- **Priority is now field-level, not rule-level.** A high-priority
  rule no longer erases lower-priority rules' contributions to
  fields it doesn't address. Concretely: a chip-only rule
  (`background_color` only) at priority 99 now coexists with a
  color-by-state rule at priority 10 — chip from the high rule,
  color from the low rule. The v0.2 behavior dropped the color.
  Users who depended on the old "winner takes all" semantic to
  hide lower-priority decorations should now set explicit
  null / `""` / `"inherit"` / `"unset"` sentinels on the fields
  they want released; sentinels in a high-priority rule block
  lower-priority contributions to that field. See
  [DESIGN.md § 4.2](DESIGN.md#42-decorations-and-the-priority-merge)
  for the full semantic.

### What's new

- **Per-rule background chip (`background_color`).** Replaces the
  v0.3.0a1 installation-wide outline. The chip renders as a colored
  circle behind the icon, à la Mushroom — `background-color` +
  `border-radius: 50%` + `box-shadow: 0 0 0 5px <color>` on the
  `<ha-state-icon>` host. The shadow technique extends the visible
  chip past the host's 24×24 box without taking layout space
  (~34 px visible chip on a 24 px icon, Mushroom's ~1.42× ratio).
  Available on mapping entries and threshold entries; accepts any
  CSS color string including `rgba()` for translucent chips:

  ```yaml
  mapping:
    'on':
      color: '#ffeb3b'
      background_color: '#b71c1c'
    'off':
      background_color: '#1b5e20'
  ```

  Either `color`, `background_color`, both, or neither may be set
  per entry. A bg-only entry leaves the icon's natural color alone
  and just paints the chip.

- **Field-level priority merging.** Decorations are now merged per
  field instead of per rule. The injector walks matching rules in
  priority order and, for each of `color` / `icon` /
  `background_color`, takes the value from the highest-priority
  rule that addresses it. Equal priorities resolve in declaration
  order (matches v0.2). Explicit sentinels (`null`, `""`,
  `"inherit"`, `"unset"`) in a high-priority rule are *positions*
  that explicitly release a field — they block lower-priority
  rules from contributing that field, distinguishing "I have no
  opinion" from "I want this cleared." See the new
  `merge_decorations` in
  [`evaluator.py`](custom_components/smart_icons/evaluator.py).

- **Rule editor: foreground + background colors on one row.** The
  rule editor renders a paired color picker per decoration row —
  *Icon color* on the left, *Background* on the right — for both
  mapping and threshold entries. The native `<input type="color">`
  swatch sits next to a free-form text field so users can paste
  `rgba()` or `var(--…)` values the swatch can't represent. The
  threshold *Comparator* dropdown gained plain-English labels
  (`< Less than`, `≤ Less than or equal`, etc.) and the
  comparator + value share a single row.

- **YAML editing now uses `ha-code-editor`** (HA's CodeMirror 6
  surface — the same one the automation editor, blueprint inspector,
  and trace viewer use). Both the per-rule YAML view inside the rule
  editor and the whole-config YAML view in the panel switched from
  bare `<textarea>` to `<ha-code-editor mode="yaml">`. Brings syntax
  highlighting, search/replace (Ctrl+F), entity- and icon-name
  completion, and a Ctrl+S / Cmd+S shortcut that fires the panel's
  Save handler. Jump-to-rule and jump-to-line (clicking a per-rule
  validation error) still work — rewritten on top of CodeMirror's
  `dispatch({ selection })` API. The element is a lazy-loaded HA
  chunk; the panel registers a `customElements.whenDefined` upgrade
  so the YAML surface paints correctly on first navigation.

- **Developer notes section** in [README.md](README.md). Documents
  that Smart Icons fires synthetic `state_changed` events when
  writing its three attributes, what filters downstream listeners
  can use to ignore them, and how the icon-clear safety contract
  interacts with other integrations writing the same target.

### Bug fixes

- **Stale icons no longer stick after a rule drops the `icon`
  field.** Before this release the injector would write the icon
  attribute but never clear it: editing a rule to remove the icon
  left the previous glyph in place until HA restart. The injector
  now tracks the last `icon` it wrote per target and pops the
  attribute when the rule no longer addresses it, *only* when the
  current value still matches our last write (so source
  integrations that overwrite our icon with their own value aren't
  clobbered). See `_apply_target` / `_release_target` in
  [`injector.py`](custom_components/smart_icons/injector.py).

- **Background-only rules now paint.** The painter's two paint
  paths (the `ha-state-icon.stateObj` setter patch and the DOM-
  crawler fallback) both gated the entire decoration call on
  `smart_icons_color` being non-empty. A rule that set only
  `background_color` wrote the attribute server-side but the
  painter ignored it. Both paths now trigger paint when *either*
  attribute is set, and the gating logic is centralized in a
  single `decideAndPaint` helper so the two paths can't drift
  again.

- **Rule editor: thresholds-mode validation was broken.** The
  "needs at least one entry" check compared the comparator
  function's return value with `!== null`, but the function
  returns `''` for "no comparator selected" — so every threshold
  row, including a completely blank one, looked valid and the
  check never fired. Now properly checks each entry has either a
  comparator or at least one decoration field (color, icon, or
  the new background).

- **Rule editor: degenerate mapping rows no longer save.** A
  mapping row with a key but no color / bg / icon used to
  serialize as `{key: {}}` — schema-valid, but the evaluator
  treated the empty decoration as "no match" and did nothing at
  runtime, so the rule looked stored but had no effect. These
  rows are now dropped on save with a validation error
  (`Mapping mode needs at least one state → decoration entry`).

### Internals

- `pick_winner` retired in favor of `merge_decorations`
  (Python) / `mergeDecorations` (TS). The old name is kept as an
  alias for back-compat. Both evaluators now return *sparse*
  position objects from `evaluate_thresholds` / `evaluate_mapping`
  — only fields the matching entry positively addressed appear —
  so the merger can distinguish "no position" from "explicit
  release."

- Painter deduped: one `decideAndPaint(host, color, bg)` helper
  is the single source of truth for the "given these resolved
  attrs, what do we do?" decision. Both the `stateObj` setter
  patch and the `paintHost` crawler call it. Reduces the chance
  of one path drifting from the other as new attributes get added.

- TypeScript evaluator at parity with Python: the v0.3.0a1/a2 TS
  `normalizeDecoration` silently dropped `background_color`. It
  now handles all three fields and mirrors the merge semantic
  exactly. Not currently on the paint path (the backend injector
  is authoritative) but the divergence would have been a latent
  trap for any future preview UI — and tests now catch a
  divergence here.

- Frontend tests gained a `rule-editor.test.ts` suite (the editor
  had no unit tests until this release; only the playwright e2e
  smoke). The web-test-runner config was updated to pass
  `tsconfig.json` through so Lit's legacy `@customElement` /
  `@property` decorators load under test (the dev bundle's
  `experimentalDecorators` flag wasn't visible to wtr's esbuild
  before).

- **Glob-target resolution cache** in the injector. v0.2 and the
  v0.3 alpha line ran `fnmatch.filter` against
  `hass.states.async_entity_ids()` on every relevant state change,
  per rule per glob target — `O(rules × globs × entities)` of
  string work on the hot path. The new `_resolved_cache` keys
  resolved sets by rule id; cache hits are O(1). Invalidation is
  surgical: rule updates drop the changed rule's entry,
  `entity_registry_updated` and new-entity-appearance events drop
  every glob rule's entry (literal-only rules keep their cache),
  and three injector tests cover the cache-hit / cache-invalidate
  / new-entity-pickup paths.

- Backend test coverage: 118 tests (+18 since v0.3.0a2) covering
  the merger, bg-only paths, icon-clear contract, the source-
  integration-overwrites-our-icon safety case, the glob cache,
  and template-mode rejection.

- File headers and module docstrings updated across `rule.py`,
  `injector.py`, `evaluator.py`, `outline.ts`, `painter.ts` to
  match the new behavior. The legacy outline kill-switch comment
  in `outline.ts` is gone — chips are always per-rule, no
  installation-wide gate.

### Upgrade

Drop-in from v0.3.0a2 with two behavior changes to verify.

**Template-mode rules silently drop on load.** If you have any
rules with `mode: template` in
`.storage/smart_icons.rules`, they will fail validation on
load — the store's per-rule `vol.Invalid` catch drops them and
continues with the rest. Template mode was inert at runtime since
v0.2 (the evaluator returned `None` for it), so functionally
nothing changes — but the rule disappears from the panel. If you
need that behavior, build it out of stacked mapping / threshold
rules (see [`docs/examples.md`](docs/examples.md)) before
upgrading.

**"Winner takes all" → field-level merge.** Any installation that
relied on the implicit "highest-priority rule erases everything
else" v0.2 semantic should be re-checked. If a high-priority rule
needs to actively hide a lower-priority rule's color (or icon, or
bg), set the corresponding field to `null` or `"inherit"`
explicitly — the merger will treat that as "released, block
lower contributions."

The `outline_enabled` field in the storage doc from v0.3.0a1/a2
is now ignored; you can delete it from
`.storage/smart_icons.rules` by hand if you want a clean file, but
it's harmless to leave.

## v0.3.0a2 — 2026-05-23

**Alpha 2 on the v0.3 line.** Closes the rule-editor bare-form-elements
debt called out in v0.3.0a1's release notes. No user-visible feature
changes — the rule editor looks slightly more polished (HA-native
field styling instead of bare-input fallback) but every existing rule
edits and saves the same way.

### What's new

- **Rule editor migrated to HA-native form elements.** Every text /
  number input that drove the rule form now renders as `ha-input`
  (HA's current input, which replaced `ha-textfield` on 2026-04-01).
  The Mode dropdown and threshold-comparator dropdown both render as
  `ha-selector` with `{ select: { ..., mode: 'dropdown' } }` config.
  The "+ Add entry" / "+ Add state" / "+ Add pattern" action buttons
  render as `ha-button variant="neutral"`. Bare HTML survives only in
  the cases the new `docs/ha-elements-guide.md` decision tree
  endorses: the `<input type="color">` swatch (no first-class HA
  color element), the per-rule and whole-config `<textarea>` YAML
  editors (`ha-code-editor` is overkill), and icon-button-style
  affordances (`<button class="btn-icon">×</button>` row delete,
  `<button class="text-toggle">` code-editor toggle,
  `<button class="action-error-dismiss">`). Each carries an inline
  comment naming the guide.
- **Drag-to-reorder thresholds.** The per-row ↑ / ↓ buttons in
  threshold rules are replaced with a single drag handle on the
  left of each row, using HA's `ha-sortable` (the same wrapper
  HA's automation, dashboard, and area editors use). Six-dot
  `mdi:drag` glyph, grab/grabbing cursor, drop-anywhere
  reordering. The threshold-row layout is now a 2-column grid
  (handle column + indented content column) so the per-row
  fields stay aligned regardless of how many lines they wrap to.
- **`docs/ha-elements-guide.md`** (new) — internal/contributor
  reference for which `ha-*` elements to use, when bare HTML is OK,
  defensive patterns for lazy-load timing, and HA design tokens.
  Adapted from the sibling reference in `weather-radar-card`; the
  two docs are kept in sync.
- **Playwright e2e smoke tests** for the rule editor. Five specs
  covering the silent zero-height failure mode the lazy-load guide
  warns about (if an `ha-*` element didn't register, the rendered
  box collapses to zero — no console error). Runs against the
  docker testbed, sub-second per spec after auth is cached. See
  `frontend/test-e2e/README.md` for the setup workflow.

### Internals

- 112 pytest + 85 Web Test Runner + 5 Playwright e2e + typecheck
  green; bundle drift clean.
- `frontend/src/panel/rule-editor.ts`: ~22 element conversions plus
  the connectedCallback `whenDefined` defensive list extended to
  cover `ha-input`, `ha-button`, `ha-switch` alongside the existing
  `ha-icon-picker` and `ha-selector`.
- `AGENTS.md` Code conventions section refreshed to point at the
  new guide.
- INTEGRATION_VERSION + manifest + frontend/package versions bumped
  to 0.3.0a2.

### Upgrade

Drop-in from v0.3.0a1 — no behavior change, no schema migration.

**Full Changelog**: <https://github.com/jpettitt/smart-icons/compare/v0.3.0a1...v0.3.0a2>

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
