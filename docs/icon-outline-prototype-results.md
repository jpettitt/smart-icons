# Prototype results: contrasting outline for painted icons

Sibling to [`icon-outline-prototype.md`](icon-outline-prototype.md),
which laid out the design. This doc records what the prototype
actually surfaced and which variant was selected for ship.

**Outcome:** variant **v3 (auto-luminance + native SVG `paint-order`
stroke) ships in v0.3** as the default, behind an installation-wide
admin toggle (`outline_enabled`, default true). The other three
variants were rejected.

## What was tested

Four (A, B) combinations from the prototype design's two-axis
space, exercised against a dashboard with six painted-color states
× four background contexts (default light, default dark, three
custom themes for yellow / navy / mid-gray). Each combo was
flipped via a `?smart-icons-outline=<v>` query string or
`__smartIcons.setOutlineVariant()` from devtools.

| # | Color (A) | Render (B) | Mechanism |
|---|-----------|------------|-----------|
| v1 | A3 auto-luminance | B1 soft halo | Single `drop-shadow(0 0 1.5px <c>)` filter on the host |
| v2 | A3 auto-luminance | B2 4-direction hard | Four `drop-shadow` filters cardinal-direction-offset by ±1 px |
| v3 | A3 auto-luminance | B5 native SVG stroke | `paint-order: stroke fill; stroke: <c>; stroke-width: 1.5` on the inner `<path>` |
| v4 | A4 theme-aware | B2 4-direction hard | Same as v2 but outline color picked from the icon host's first non-transparent ancestor instead of the painted color |

## Findings

### v3 wins on visual quality

v3 was reported as "by far the best" across all surfaces tested
(entities-card row, tile, glance, button card, more-info dialog),
across all six painted-color states, and across all four
background contexts. The 1.5 px stroke at the standard MDI glyph
sizes reads as a clean outline at every render size from 24 px
(entities row) to ~96 px (button card), without filling in thin
glyph strokes into blobs.

The risk called out in the design doc — that HA might use
`<use href="#mdi:...">` sprite references and prevent us from
reaching the inline `<path>` — did not materialize. HA 2026.5
renders icons via nested shadow roots (ha-state-icon → ha-icon →
ha-svg-icon → `<svg><path/></svg>`), and the recursive walk in
`outline.ts`'s `forEachPath()` reaches the path reliably.

### v1 and v2 are inferior at small sizes

v1 (soft halo) reads as a fuzzy glow at 24 px — the 1.5 px blur
radius softens the silhouette enough that the icon edge becomes
ambiguous against textured backgrounds.

v2 (4-direction hard drop-shadow) renders a recognizable outline,
but the four-filter stack is more expensive than v3 (each filter
is a separate composition pass) and the corners pick up tiny
notches where the four directional shadows don't perfectly fuse.

### v4 (theme-aware) is unreliable on some surfaces

v4 chose the wrong outline color on a subset of cards — in
particular, the button card's large icon picked the
painted-color-based fallback (white outline against a yellow
background, where it should have been black). Root cause:
the ancestor-walk in `autoContrastFromBackground` failed to find
a non-transparent ancestor for some card structures and
fell through to the `autoContrastOutline(color)` fallback,
producing the v3-equivalent outline color on those elements
while v4-correct colors on others.

A correct v4 would need a more sophisticated background detector
(e.g. screenshot + sample at the icon's centroid). That's
disproportionate effort given v3 already wins on simpler grounds —
the painted-color heuristic alone is a sufficient signal in
practice, because the icon-vs-background contrast problem is
overwhelmingly "light icon on light background" or "dark icon on
dark background" rather than the more exotic cases v4 was
designed for.

### Perf measurement: skipped, replaced by reasoning from mechanism

The design doc called for a 100-icon DevTools Performance trace
with default-on (≤5 ms total, 0 dropped frames, ≤2 MB heap) and
opt-in (≤20 ms) thresholds. We elected to ship v3 without that
formal measurement because v3's mechanism is structurally the
cheapest by construction:

- No CSS `filter` passes — `paint-order: stroke fill` composites
  on the GPU in a single render pass alongside the fill, which
  was going to happen anyway.
- No per-frame layer promotion, no offscreen render buffers.
- Per-paint cost is a `querySelectorAll('svg path')` walk + three
  inline-style writes per matched path. The query is bounded by
  the icon's own shadow tree (small) and runs once per paint.

If perf regressions surface in real-world dashboards, the trace
script in the original design doc still applies — we just didn't
gate the ship on it for v3.

## What v0.3 actually ships

- `outline.ts` exports `applyDecoration(host, color)` /
  `releaseDecoration(host)` / `setOutlineEnabled(bool)` /
  `isOutlineEnabled()` / `autoContrastOutline(color)`. The
  variant dispatch from the prototype is removed; only the v3
  code path remains.
- `painter.ts` routes both paint paths (stateObj setter patch,
  MutationObserver crawler) through `applyDecoration`. The
  release path mirrors via `releaseDecoration`.
- Backend storage gets a new top-level `options` dict alongside
  `rules`, currently with one key (`outline_enabled`, default
  `true`). Future options land here without a schema bump.
- WS commands `smart_icons/get_options` (any authenticated user,
  for the painter to read at bootstrap) and
  `smart_icons/update_options` (admin-gated, for the panel
  toggle). The latter fires `smart_icons_options_updated` on the
  HA bus; the painter subscribes and repaints.
- Panel adds a single checkbox above the rules table:
  *Contrasting outline on painted icons*. Default checked.
- Tests: 112 pytest (+12 for options storage and WS), 85 frontend
  (+12 for outline pure functions and stroke application).

## What's intentionally out of scope

The v0.3 outline targets **only Smart-Icons-painted icons** — not
every `<ha-state-icon>` on the page. Outlining all icons (HA's
own default-colored ones included) would expand Smart Icons into
a general icon-restyler and risk conflicts with Mushroom themes,
card-mod styling, and user expectations about HA's default look.
An "outline every icon" mode can land as a second explicit
setting later if real user demand surfaces it (see
[`TODO.md`](../TODO.md) under "Followups & ideas").

Per-rule outline colors (variant A5 from the prototype design)
were also deferred — auto-luminance does the right thing for
99 % of cases, and explicit per-rule overrides would touch the
rule schema for a marginal benefit. Deferred to demand.

## References

- Original design: [`icon-outline-prototype.md`](icon-outline-prototype.md)
- Implementation: [`frontend/src/outline.ts`](../frontend/src/outline.ts)
- Painter integration: [`frontend/src/painter.ts`](../frontend/src/painter.ts)
- Backend: [`custom_components/smart_icons/store.py`](../custom_components/smart_icons/store.py),
  [`custom_components/smart_icons/websocket_api.py`](../custom_components/smart_icons/websocket_api.py)
