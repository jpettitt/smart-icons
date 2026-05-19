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
  34 pytest tests pass; integration loads cleanly in the dev container.
- [x] pytest harness in CI-ready shape (pyproject.toml, requirements_test.txt,
  conftest using `pytest-homeassistant-custom-component`).
- [ ] Frontend skeleton: TS `RuleStore`, `StateWatcher`, `Painter`.
- [ ] Modes wired in the painter: `thresholds`, `mapping` (template deferred to v0.2).
- [ ] Door 2 panel — minimal table + add/edit/delete dialog with `ha-color-picker`.
- [ ] `add_extra_js_url` + `async_register_static_paths` to auto-register
  the frontend bundle once it exists.
- [ ] `@open-wc/testing` + Web Test Runner; CI workflow.
- [ ] Dogfood on author's dashboard for a week.

## Followups & ideas (parking lot)

- Consider exposing a tiny JS API (`window.smartIcons.setRule(...)`) for
  use from button-card and similar — turns smart-icons into a service for
  other plugins, not just a UI.
- Investigate whether a Lovelace card editor extension (per-card override)
  is worth doing, or whether the global-rule model is sufficient.
- Look at whether we can read theme-set defaults and offer "use theme color
  for `on`-state, custom color for thresholds" as a hybrid mode.
