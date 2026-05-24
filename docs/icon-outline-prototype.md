# Prototype: contrasting outline for painted icons

> **Status: superseded.** The outline approach this doc designed
> was prototyped in v0.3.0a1, shipped briefly in a1/a2, and was
> retired in v0.3.0a3 in favor of a Mushroom-style per-rule
> background chip — see the status note at the top of
> [`icon-outline-prototype-results.md`](icon-outline-prototype-results.md)
> for the reasoning. This doc is preserved as historical record of
> the variant design space.

**Status:** design — pre-prototype. No code yet. This doc enumerates
the variants worth testing, the dark/light interaction matrix, the
render-timing measurement plan, and the criteria a variant must
meet to be recommended as a default.

Once the prototype is built and measurements are in, results land
in a sibling doc (`icon-outline-prototype-results.md`) with the
recommendation; the relevant decisions then fold into
[`DESIGN.md`](../DESIGN.md) and a v0.4-line feature spec.

## Problem

Painted icons can disappear into their background when the painted
color is close to the surface luminance:

- A yellow icon on HA's light theme card (off-white background).
- A dark blue icon on a dark theme card (near-black background).
- The NWS temperature scale (see
  [`docs/examples.md`](examples.md)) drives icons through deep
  magenta, navy, light cyan, and pale yellow within a single
  dashboard — at least one of those will be low-contrast against
  any background.

The current painter writes only `style.color` to each
`<ha-state-icon>` host. No outline, no contrast enforcement. The
problem is most visible on temperature dashboards and on
custom-themed dashboards that override the default card
backgrounds.

## Scope of the prototype

The prototype's job is **to surface enough data to choose a
default and reject the variants that don't work** — not to ship
the feature. Specifically:

- We are evaluating CSS-level techniques applied by the existing
  painter, not changes to the SVG rendering pipeline or to
  `ha-state-icon` itself.
- We are evaluating only outline rendering. Background pills,
  badge halos, glow effects, and alternative composition modes
  are out of scope.
- The config surface (default-on, default-off, panel-level toggle,
  per-rule property) is **not** decided by this prototype —
  that's a downstream question informed by the perf and
  visual-quality data we surface here.

## Design space — variants to test

Two independent axes. The prototype evaluates a shortlist of
combinations, not the full cross-product.

### Axis A — outline color source

| Variant | Description | Complexity | Schema change |
|---------|-------------|------------|---------------|
| A1 | Fixed black outline | Trivial | None |
| A2 | Fixed white outline | Trivial | None |
| A3 | Auto pick black vs white from painted-color luminance (W3C relative luminance formula) | Low — pure function of the color we already compute | None |
| A4 | Auto pick from theme — read the actual rendered background color of the icon's host card and choose its complement | Medium — requires reading effective `background-color` at paint time, accounting for `Tile` colored backgrounds | None |
| A5 | Per-rule explicit outline color | Medium — schema change, panel UI change | Yes |

**Shortlist for prototype:** A1, A3, A4. A2 is symmetric with A1
(no new info). A5 is gated on the rest — only worth designing if
the auto variants fail.

### Axis B — outline rendering technique

| Variant | Description | Approximate cost per icon |
|---------|-------------|---------------------------|
| B1 | Single `filter: drop-shadow(0 0 1.5px <c>)` — soft blur halo | 1× SVG render pass |
| B2 | `filter: drop-shadow(...)` × 4 cardinal directions, 0 blur — pixel-aligned outline | 4× passes |
| B3 | `filter: drop-shadow(...)` × 8 cardinal + diagonal — smoother outline at corners | 8× passes |
| B4 | Inject an SVG `<filter>` using `feMorphology` (dilate) + `feMerge` — pixel-perfect, single composition pass | 1× pass + SVG-DOM mutation |
| B5 | `paint-order: stroke fill; stroke: <c>; stroke-width: 1px` on the actual `<path>` inside `ha-state-icon`'s shadow root | Native SVG stroke, ~free |

**Shortlist for prototype:** B1, B2, B5. B3 is a refinement of B2
(only test if B2's corners are unacceptable). B4 is the
"correct" path but requires the most code; defer until we know
the cheaper variants fail.

### Combinations to actually prototype

| # | Color (A) | Render (B) | Reason |
|---|-----------|-----------|--------|
| 1 | A3 (auto luminance) | B1 (soft halo) | Cheapest possible variant; if it looks good enough, ship this. |
| 2 | A3 (auto luminance) | B2 (4× hard) | Cleaner pixel-aligned outline; baseline for "real" outline. |
| 3 | A3 (auto luminance) | B5 (native SVG stroke) | Visually best in theory; tests whether we can pierce the shadow root reliably enough. |
| 4 | A4 (theme-aware) | B2 (4× hard) | Tests whether reading the actual background is worth the code over A3. |

Four combos. Each gets tested against the dark/light matrix
below and the perf matrix in the next section.

## Dark/light mode test matrix

For every shortlisted combination, render the reference dashboard
under both themes and inspect each cell:

| Painted color | HA light theme (default) | HA dark theme (default) | Mushroom theme | Tile-card colored backgrounds |
|---------------|--------------------------|-------------------------|----------------|-------------------------------|
| Yellow `#ffeb3b` | Hard case | Easy case | Easy case | Test all card colors |
| Pale blue `#ADD8E6` | Hard case | Easy case | Easy case | Test all card colors |
| Navy `#00008B` | Easy case | Hard case | Hard case | Test all card colors |
| Magenta `#4B0082` | Easy case | Hard case | Hard case | Test all card colors |
| Mid gray `#808080` | Edge case (luminance ~ 0.5) | Edge case | Edge case | Edge case |
| Pure white `#ffffff` | Hardest case | Easy case | Easy case | Edge case |
| Pure black `#000000` | Easy case | Hardest case | Hardest case | Edge case |

The mid-gray row is the auto-luminance picker's failure mode —
luminance is right at the decision threshold, and the chosen
outline color could flip with very small color tweaks. Variant
behavior here predicts whether the auto-picker is robust enough.

The "Tile-card colored backgrounds" column matters because
`tile` cards apply the entity's domain color as the background
when `color: entity` is configured — that background can
itself be the painted color (or near it), creating a uniform
"swatch" with the icon invisible inside.

## Render timing — measurement plan

### Reference dashboard

Build a dashboard YAML committed at
`docs/icon-outline-prototype-dashboard.yaml`:

- One Lovelace view, ~10 cards.
- 100 painted icons across the view (mix of entities-card rows,
  tile cards, badges, more-info dialog headers).
- Driven by a single template sensor whose state we can flip on
  demand from the HA developer-tools UI.
- Every painted icon is bound to a rule whose color depends on
  the template sensor's state — so a single state change
  forces a mass repaint across all 100 icons.

### Variant evaluation

For each shortlisted combination, in sequence:

1. Load the dashboard with the variant active.
2. Open Chrome DevTools → Performance.
3. Start recording.
4. Flip the template sensor.
5. Stop recording when the dashboard quiesces.
6. Capture:
   - **Total scripting time** within the painter's repaint
     hook (we already log this for diagnostics; add a marker
     for each variant).
   - **Total paint + composite time** for the affected frame(s).
   - **Frame count** from sensor flip to quiescence.
   - **Any dropped frames** (frame count exceeds the 16.7 ms
     budget on a 60 Hz display).
   - **Memory delta** (heap snapshot before/after) — drop-shadow
     filters can promote elements to their own composited layer,
     which is the main memory risk.

### Baselines

Two baselines, both run before any outline variant:
- **Cold baseline** — current painter on `main`, no outline,
  same dashboard, same flip.
- **Diagnostic baseline** — same as cold, but with an
  intentionally expensive `filter: blur(0.001px)` on every
  painted icon (forces layer promotion without doing real
  work). Calibrates "this variant adds X ms vs cheap
  layer-promotion baseline" so the numbers are interpretable.

### Pass thresholds (default-on candidate)

For a variant to be recommended as **default-on**, it must meet
all of:

- Adds ≤ **5 ms** total scripting + paint over cold baseline on
  the 100-icon dashboard.
- Zero dropped frames during the mass-repaint flip.
- Heap delta ≤ **2 MB** over cold baseline.
- Visual quality passes the dark/light matrix without per-theme
  configuration.

For a variant to be recommended as **opt-in** (off by default,
panel toggle):

- Adds ≤ **20 ms** total over cold baseline.
- Visual quality clearly better than no-outline on at least the
  hard cells of the dark/light matrix.

Variants exceeding both thresholds are disqualified entirely.

## Decision criteria

After all four shortlisted combos run:

1. If one combo passes the **default-on** thresholds and looks
   good across the dark/light matrix — recommend it as default,
   ship behind a panel toggle that lets users disable it.
2. If no combo passes default-on but one or more pass **opt-in** —
   recommend the cheapest one as the opt-in default; the others
   inform whether to add a "rendering quality" tier.
3. If no combo passes opt-in thresholds, the outline feature is
   parked. The writeup documents *why* (which constraint failed)
   so the next attempt has a clear starting point.

## Open questions to resolve during prototyping

Things the prototype will likely surface that this doc can't
predict:

- Does `filter: drop-shadow` interact badly with HA's existing
  `--icon-color` cascade or with `mushroom` themes that already
  apply their own filters? (Suspected risk: filters stack
  multiplicatively, double-blurring.)
- Does B5 (native SVG stroke) survive HA's SVG sprite
  optimization? Some MDI glyphs reference symbol IDs that may
  not be reachable from outside the shadow root.
- Are there icons whose path geometry is too thin (1 px lines)
  for a 1 px outline to look right? (Suspected risk: outline
  fills in the thin parts and the glyph reads as a solid blob.)
- Does the outline interact with HA's hover / active states
  (the icon's color animation on tap)?

Each open question gets a one-line status in the results doc.

## Out of scope

Explicitly deferred — not part of this prototype, not blocking
its conclusions:

- Per-rule outline color (variant A5) — only worth designing if
  the auto variants fail.
- Outline thickness as a rule or per-icon property.
- Animated outlines (pulse on state change, glow, etc.).
- Background pill / badge halo as an alternative to outlines.
- Decision on default-on vs default-off vs panel toggle.
- Any schema or storage changes.

## Deliverables (when the prototype runs)

When the prototype executes, the following land in a single PR:

- A feature-flagged code path in the painter that switches between
  the shortlisted variants at runtime (URL query string or
  `localStorage` flag — does not need a panel UI for the
  prototype).
- The reference dashboard YAML.
- `docs/icon-outline-prototype-results.md` — perf numbers,
  screenshots for each cell of the dark/light matrix, and the
  recommendation.

After that PR is reviewed, the recommendation either gets
folded into [`DESIGN.md`](../DESIGN.md) and a v0.4-line spec, or
the feature is parked with the data preserved.

## References

- W3C relative luminance:
  <https://www.w3.org/TR/WCAG21/#dfn-relative-luminance>
- MDN `filter: drop-shadow()`:
  <https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow>
- MDN `paint-order`:
  <https://developer.mozilla.org/en-US/docs/Web/CSS/paint-order>
- Existing painter implementation:
  [`frontend/src/painter.ts`](../frontend/src/painter.ts)
- Example rules that hit the contrast problem:
  [`docs/examples.md`](examples.md)
