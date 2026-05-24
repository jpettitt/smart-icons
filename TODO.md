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

## v0.3 — background chip + Door 1

Open items, in roughly priority order:

- [x] **Contrasting outline on painted icons** — **superseded by
  the v0.3 per-rule Mushroom-style background chip
  (`background_color`).** After multiple stroke/halo/morphological-
  close iterations against alpha-mask cutouts produced unavoidable
  artifacts on icons with internal holes (alert-circle, bell), the
  outline concept was retired in favor of per-rule colored chips
  rendered behind the icon. The installation-wide
  `outline_enabled` admin toggle, its WS commands
  (`smart_icons/get_options`, `smart_icons/update_options`), the
  `smart_icons_options_updated` bus event, and the
  `DEFAULT_OPTIONS` storage doc have all been removed in v0.3.0a3.
  See `docs/icon-outline-prototype-results.md` for the historical
  design rationale.
- [x] **Rule editor migrated to HA-native form elements**
  (shipped in v0.3.0a2). All text/number inputs use `ha-input`;
  pickers use `ha-selector` / `ha-icon-picker`; primary buttons
  are `ha-button`; the enabled toggle is `ha-switch`. The four
  remaining bare elements (`<input type="color">` swatch picker,
  two icon-button-style `<button>`s, and the per-rule YAML
  textarea) are documented exceptions per
  [`docs/ha-elements-guide.md`](docs/ha-elements-guide.md)
  decision-tree item 4.
- [x] **YAML editing migrated to `ha-code-editor`** (shipped in
  v0.3.0a3). Both the per-rule YAML view inside the rule editor
  and the whole-config view in the panel now use HA's CodeMirror 6
  surface (the same one the automation editor and trace viewer
  use). Brings syntax highlighting, search, entity/icon
  completion, and Ctrl+S save. Jump-to-rule and jump-to-line
  rewired on top of CodeMirror's `dispatch({ selection })`.
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
- [x] **Caching of resolved glob-target sets** (shipped in v0.3.0a3).
  Per-rule `_resolved_cache` in `IconInjector`; surgical
  invalidation on rule changes (drop just that rule's entry) and
  entity-registry / new-entity-appearance events (drop entries for
  any rule that uses a glob target). Literal-only rules keep
  their cache across glob events.
- [ ] Investigate color-update latency on rule edit (~1 s observed
  2026-05-19; icon updates are instant because they ride HA's native
  state-changed path, color goes through the frontend painter).
- [x] **`<picture>` rendering in HACS Information tab** (shipped
  post-v0.3.0). HACS's markdown renderer doesn't process
  `<picture>` / `<source>` and shows the raw HTML as text,
  breaking the README's "See it in action" preview for users
  landing via HACS. Resolved by adding a lighter-weight `info.md`
  alongside `README.md` (HACS picks up `info.md` when
  `hacs.json`'s `render_readme` is `false`). The `info.md` uses
  pipe-table markdown + absolute `raw.githubusercontent.com`
  image URLs to the `-dark.svg` icon variants, which render in
  HACS and remain legible in either HA theme. README continues to
  use the `<picture>` + `prefers-color-scheme` setup for
  github.com viewers.

- **Template mode — removed entirely in v0.3.0a3.** Template mode
  was originally on the v0.3 roadmap, then demoted to demand-driven
  ("storage-only, evaluation returns None") in v0.3.0a1, then
  removed in v0.3.0a3 after two minor versions of being dead code.
  Rule stacking (priority + selective matching with the v0.3
  field-level merge; see the combined sun-direction/elevation
  example in [`docs/examples.md`](docs/examples.md)) covers the
  "compute decoration from state" use cases that template mode was
  meant for. Pick this back up only if real user demand surfaces a
  case that rule stacking genuinely can't express; would need to
  re-introduce the schema field, the evaluator path, the editor UI,
  *and* the YAML round-trip.
- **`_inherit` value for decoration properties — superseded.** This
  was originally a parking-lot idea for v0.4+: a sentinel value that
  would let a higher-priority rule say "change only the icon, keep
  the color from the lower-priority rule." The v0.3.0a3 **field-
  level merge** achieves the same outcome by treating absence-of-a-
  field as "no opinion" — just omit `color` from the higher-priority
  rule and it flows through from the lower one:

  ```yaml
  # High-priority "alarm" rule — only sets the glyph.
  mapping:
    'on':
      icon: mdi:door-open
  # The color comes from whatever lower-priority rule was already
  # there. Explicit "inherit" / "" / null / "unset" sentinels are
  # still meaningful — they *block* lower contributions to that
  # field, which is the inverse of what _inherit was meant to do.
  ```

  See [DESIGN.md § 4.2](DESIGN.md#42-decorations-and-the-priority-merge).
  If a future case needs an explicit "inherit even if a higher rule
  set this field" semantic, that's a different feature; the
  parking-lot proposal is closed.
- Consider exposing a tiny JS API (`window.smartIcons.setRule(...)`) for
  use from button-card and similar — turns smart-icons into a service for
  other plugins, not just a UI.
- Investigate whether a Lovelace card editor extension (per-card override)
  is worth doing, or whether the global-rule model is sufficient.
- Look at whether we can read theme-set defaults and offer "use theme
  color for `on`-state, custom color for thresholds" as a hybrid mode.
- Per-user / per-card layer visibility — if households actually ask for
  filtering rules by viewer.
