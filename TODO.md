# TODO

Working punch list. See [DESIGN.md § 11 Roadmap](DESIGN.md#11-roadmap) for the
strategic view.

## Pre-implementation

- [x] Rename working dir from `icon-color` to `smart-icons` (2026-05-18).
- [x] Resolve open questions in [DESIGN.md § 12](DESIGN.md#12-resolved-questions)
  (2026-05-18). Decisions: sub-page panel placement, per-install rules,
  `ha-color-picker` (CSS-variable users go via YAML), opacity deferred to
  v0.3, integration-served bundle, `@open-wc/testing` + Docker HA from v0.1.
- [x] Stand up the Docker HA dev container (2026-05-18). See
  [`dev/README.md`](dev/README.md). Bind-mounts
  `custom_components/smart_icons/` into HA; `docker compose up -d` from
  `dev/`.
- [ ] Sanity-check the `entity-registry-settings` element name and shape
  against current HA frontend source before committing to Door 1 design.
- [x] Run the glyph-swap PoC (2026-05-18). **Case A — clean** on HA
  2026.5.2; override survives state changes, dashboard navigation tears
  down the host (handled by the high-rooted, shadow-piercing observer).
  See [DESIGN.md § 7.6](DESIGN.md#76-glyph-swap-validation-plan-poc) for
  the recorded Result and the §7.2 amendments.

## v0.1 (proof of life)

Full list in [DESIGN.md § 11.1](DESIGN.md#v01--proof-of-life-12-weekends).
Progress so far:

- [x] Python skeleton (2026-05-18): manifest, config flow, `Rule` +
  validation, `RuleStore` over HA `Store`, WS `list/upsert/delete/subscribe/version`.
- [x] pytest harness in CI-ready shape (pyproject.toml, requirements_test.txt,
  conftest using `pytest-homeassistant-custom-component`).
- [x] Frontend skeleton (2026-05-19): TS `RuleStore` (WS sub),
  `StateWatcher` (state_changed sub), `Painter`. esbuild → bundled
  modules at `custom_components/smart_icons/static/`.
- [x] `add_extra_js_url` + `async_register_static_paths` registration
  in `frontend.py`. Bundle-missing fallback is graceful (warning,
  integration stays up).
- [x] `@open-wc/testing` + Web Test Runner harness (2026-05-19).
- [x] **Server-side glyph + client-side color** (2026-05-19) —
  architectural pivot to ride HA's native `state.attributes.icon`
  mechanism instead of fighting Lit's render cycle. New `evaluator.py`
  (port of TS) and `injector.py` (state-changed subscriber) drive
  target-entity attributes; frontend painter shrinks to color-only,
  state-driven. See [DESIGN.md § 7.0](DESIGN.md#70-architecture--server-side-glyph-client-side-color).
  Bundle: 6.7 KB → 4.6 KB. 96 tests (61 pytest, 35 WTR).
- [x] Initial-paint polish: `localStorage` rule cache for the panel UI's
  synchronous hydration.
- [x] Door 2 panel (2026-05-19) — sidebar entry, table CRUD,
  Lit-based editor in `ha-dialog`. Uses HA's native `ha-entity-picker`
  and `ha-icon-picker` (passing `.label` is the key) with graceful
  fallback to plain inputs, datalist autocomplete, and `<ha-icon>`
  preview. Adds source-attribute targeting (`sun.sun.azimuth` style).
  Section-grouped layout (Apply to / React to / Decoration / Options).
  Separate `smart_icons_panel.js` bundle (~40 KB Lit + UI),
  lazy-loaded.
- [ ] CI workflow: pytest + tsc + wtr + build on PR.
- [ ] Politeness layer: per-property stand-down when other plugins own
  `style.color` (deferred from v0.1; track for v0.2 per DESIGN.md §11.2).
- [ ] Investigate color-update latency on rule edit (~1 s observed
  2026-05-19; icon updates are instant because they ride HA's native
  state-changed path, color goes through the frontend painter).
- [ ] Dogfood on author's dashboard for a week.

## Followups & ideas (parking lot)

- Consider exposing a tiny JS API (`window.smartIcons.setRule(...)`) for
  use from button-card and similar — turns smart-icons into a service for
  other plugins, not just a UI.
- Investigate whether a Lovelace card editor extension (per-card override)
  is worth doing, or whether the global-rule model is sufficient.
- Look at whether we can read theme-set defaults and offer "use theme color
  for `on`-state, custom color for thresholds" as a hybrid mode.
