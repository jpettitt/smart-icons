# TODO

Working punch list. See [DESIGN.md § 11 Roadmap](DESIGN.md#11-roadmap) for the
strategic view.

## Pre-implementation

- [ ] Decide whether to rename the working dir from `icon-color` to
  `smart-icons` (cosmetic only — the eventual GH repo is `smart-icons`).
- [ ] Resolve open questions in [DESIGN.md § 12](DESIGN.md#12-open-questions).
- [ ] Stand up a local HA dev container for fast iteration.
- [ ] Sanity-check the `entity-registry-settings` element name and shape
  against current HA frontend source before committing to Door 1 design.
- [ ] Verify the inner-`<ha-icon>` swap actually works (write a 20-line
  proof-of-concept against a live HA instance — confirm parent doesn't
  immediately re-derive on `requestUpdate`).

## v0.1 (proof of life)

See the v0.1 list in [DESIGN.md § 11.1](DESIGN.md#v01--proof-of-life-12-weekends).

## Followups & ideas (parking lot)

- Consider exposing a tiny JS API (`window.smartIcons.setRule(...)`) for
  use from button-card and similar — turns smart-icons into a service for
  other plugins, not just a UI.
- Investigate whether a Lovelace card editor extension (per-card override)
  is worth doing, or whether the global-rule model is sufficient.
- Look at whether we can read theme-set defaults and offer "use theme color
  for `on`-state, custom color for thresholds" as a hybrid mode.
