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

## v0.2.1 — YAML editing (on main, awaiting release)

- [x] **YAML editing — all three phases.** Per-rule "Show code editor"
  toggle in the rule editor; whole-config "Show code editor" toggle
  on the panel; atomic save via `smart_icons/replace_all`; clickable
  per-rule + per-line error highlighting; discard-changes confirm.
  Shipped together on `main` — see
  [`docs/yaml-editing.md`](docs/yaml-editing.md) for the design and
  the per-phase mapping of "as designed" vs "as shipped". Pending the
  v0.2.1 tag.

## v0.3 — template mode + Door 1

Open items, in roughly priority order:

- [ ] **Template mode evaluation** — Jinja rendered server-side via HA's
  template machinery. New `smart_icons/render_template` WS command for
  the panel's live preview (rate-limited per connection).
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

- Consider exposing a tiny JS API (`window.smartIcons.setRule(...)`) for
  use from button-card and similar — turns smart-icons into a service for
  other plugins, not just a UI.
- Investigate whether a Lovelace card editor extension (per-card override)
  is worth doing, or whether the global-rule model is sufficient.
- Look at whether we can read theme-set defaults and offer "use theme
  color for `on`-state, custom color for thresholds" as a hybrid mode.
- Per-user / per-card layer visibility — if households actually ask for
  filtering rules by viewer.
