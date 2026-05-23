# TODO

Working punch list. See [DESIGN.md § 11 Roadmap](DESIGN.md#11-roadmap) for the
strategic view and [CHANGELOG.md](CHANGELOG.md) for what's shipped.

## v0.1 — proof of life ✅ shipped 2026-05-19

All checkboxes complete. Highlights kept here for context:

- Python skeleton (manifest, config flow, Rule + validation, RuleStore,
  WS `list/upsert/delete/subscribe/version`).
- Frontend skeleton (RuleStore, StateWatcher, Painter) — esbuild bundles
  under `custom_components/smart_icons/static/`.
- Server-side glyph + client-side color (architectural pivot from the
  original frontend-only design — rides HA's native `state.attributes.icon`
  mechanism instead of fighting Lit's render cycle).
- `localStorage` rule cache for synchronous panel hydration.
- Door 2 panel — sidebar entry, table CRUD, Lit editor in `ha-dialog`,
  HA-native pickers via `ha-selector` and `ha-icon-picker`.
- CI workflow (pytest + tsc + wtr + build on PR).

## v0.2 — multi-target, glob, polish ✅ shipped 2026-05-21 (beta)

All checkboxes complete. See the
[v0.2.0b2 release notes](https://github.com/jpettitt/smart-icons/releases/tag/v0.2.0b2)
for the full list. Highlights:

- Multi-target rules + glob target patterns.
- Per-target source semantics.
- Mapping-state autocomplete from recorder history.
- Admin-only WS + panel; painter bundle is WS-free so non-admin
  dashboards still render painted icons correctly.
- Rule editor UX overhaul; responsive panel via CSS container queries.
- Painter color race fix; glob rules apply correctly after HA restart.
- Integration icon (`brand/icon.png`, `icon@2x.png`) following HA's
  brands-proxy convention.

## v0.2.1 — YAML editing ✅ shipped 2026-05-22

- [x] **YAML editing — all three phases.** Per-rule "Show code editor"
  toggle in the rule editor; whole-config "Show code editor" toggle
  on the panel; atomic save via `smart_icons/replace_all`; clickable
  per-rule + per-line error highlighting; discard-changes confirm.
  See [`docs/yaml-editing.md`](docs/yaml-editing.md) for the design
  and the per-phase mapping of "as designed" vs "as shipped".

## v0.2.2 — painter reliability + release plumbing ✅ shipped 2026-05-22

- [x] Painter walk-up for `<state-badge>` surfaces (b1).
- [x] `get_states` bootstrap to eliminate empty-cache race (b2).
- [x] `ha-state-icon.stateObj` prototype patch for view-switch
  surfaces (b2).
- [x] Move confirm-modal buttons into dialog content (fix invisible
  delete / discard buttons on modern `<ha-dialog>`).
- [x] `?v=<mtime>` cache-buster on bundle URLs — fresh JS on every
  release and every local rebuild without manual hard refresh.
- [x] Release workflow (`.github/workflows/release.yml`) that builds
  and attaches `smart_icons.zip` as a release asset, gated on
  pytest + frontend tests + build-drift check. `hacs.json` declares
  the filename so HACS pulls the asset (= visible download counter)
  rather than the source tarball.
- [x] Example-rules library — [`docs/examples.md`](docs/examples.md)
  with doors, locks, NWS temperature scale, and sun-position
  variants including a combined direction-aware + elevation-banded
  two-rule pattern.

## v0.3 — contrasting outline + Door 1

Open items, in roughly priority order:

- [ ] **Contrasting outline on painted icons** — installation-wide
  admin toggle (default on). Native SVG `paint-order: stroke fill`
  applied by the painter to the inner `<path>` of every painted
  `<ha-state-icon>`. Outline color auto-picked black/white from the
  painted color's W3C relative luminance. Scope: only icons Smart
  Icons paints; HA's default-colored icons are out of scope (see
  prototype results doc for the design rationale).
  - Backend: `outline_enabled` field in storage doc; admin WS
    `smart_icons/update_options`; non-admin WS
    `smart_icons/get_options`; bus event on change.
  - Frontend: panel checkbox; painter reads option at bootstrap +
    subscribes to event; `applyDecoration` applies stroke when
    enabled.
  - Tests + docs (CHANGELOG / README / DESIGN / examples).
- [ ] **Convert rule editor's bare HTML form elements to ha-***
  (targeting v0.3.0a2). The rule editor currently uses `<input>` /
  `<select>` / `<textarea>` / `<button>` styled with HA CSS
  variables — a deliberate workaround when `ha-textfield`'s
  lazy-load chunk was unreliable. The pattern violates the
  project's no-bare-form-elements rule. Convert to
  `ha-textfield` / `ha-select` / `ha-button` (with
  `customElements.whenDefined` graceful-load fallback where the
  lazy-load concern still holds — re-verify which elements
  actually need it in current HA). ~22 elements across
  rule-editor.ts plus 2 buttons + 1 textarea on smart-icons-panel.ts.
  Risk: rule-editor UI regression — manual verification of every
  field on every rule mode (mapping, thresholds, glob, color
  picker) is part of the test plan.
- [ ] **Door 1** — entity settings dialog injection with kill-switch,
  so individual entity pages get a "Smart Icon" section. Verify the
  `entity-registry-settings` element name and shape against current HA
  frontend source before committing to the implementation approach.
- [ ] Translations — en plus framework for community PRs.

## v0.4+ — polish

- [ ] Drag-reorder priority in panel.
- [ ] "Suggest a rule" wizard (pick target, pick source, pick mode by
  type).
- [ ] Optional `opacity` decoration property.
- [ ] Politeness layer — per-property stand-down when other plugins own
  `style.color`.
- [ ] Caching of resolved glob-target sets — current `_resolve_targets()`
  is O(rules × globs × all-entities) per call; cache and invalidate on
  rule changes + entity-registry events.
- [ ] Investigate color-update latency on rule edit (~1 s observed
  2026-05-19; icon updates are instant because they ride HA's native
  state-changed path, color goes through the frontend painter).

## Followups & ideas (parking lot)

- **Template mode — demoted to demand-driven.** Originally on the v0.3
  roadmap; deferred indefinitely. Rule stacking (priority + selective
  matching, see the combined sun-direction/elevation example in
  [`docs/examples.md`](docs/examples.md)) already covers most of the
  "compute decoration from state" use cases that template mode was
  meant for. Pick this back up only if real user demand surfaces a
  case that rule stacking genuinely can't express.
- **`_inherit` value for decoration properties.** When rules stack,
  the current winner-takes-all semantics force the higher-priority
  rule to specify both `color` and `icon` even if only one is meant
  to change. An `_inherit` sentinel value would let a higher-priority
  rule say "change only the icon, keep the color the lower-priority
  rule would have set":

  ```yaml
  mapping:
    'on':
      color: _inherit
      icon: mdi:door-open
  ```

  Touches the evaluator (`pick_winner` becomes a merge), the rule
  schema (allow string `_inherit` where a CSS color / mdi: glyph is
  expected), and probably the panel rule editor (UI hint for the
  inherit slot). Designed up-front so it's easy to add when stacking
  patterns become common enough to need it.
- "All HA icons" outline toggle — applies the contrasting-outline
  treatment to *every* `<ha-state-icon>` on the page, not just
  Smart-Icons-painted ones. Defer unless users ask; current v0.3
  scope is painted-only because the broader scope risks Mushroom /
  card-mod / theme conflicts and turns Smart Icons into a general
  icon-restyler.
- Consider exposing a tiny JS API (`window.smartIcons.setRule(...)`) for
  use from button-card and similar — turns smart-icons into a service for
  other plugins, not just a UI.
- Investigate whether a Lovelace card editor extension (per-card override)
  is worth doing, or whether the global-rule model is sufficient.
- Look at whether we can read theme-set defaults and offer "use theme
  color for `on`-state, custom color for thresholds" as a hybrid mode.
- Per-user / per-card layer visibility — if households actually ask for
  filtering rules by viewer.
