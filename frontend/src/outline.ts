/**
 * Painted-icon decoration: color + (optional) contrasting outline.
 *
 * The painter applies `style.color` to each `<ha-state-icon>` host
 * carrying a `smart_icons_color` attribute (see painter.ts). When the
 * installation-wide `outline_enabled` option is on (default), this
 * module also writes a native SVG stroke to the inner `<path>` of the
 * rendered glyph, picked black or white for maximum contrast against
 * the painted color via the W3C relative luminance formula.
 *
 * The outline approach (vs. CSS `filter: drop-shadow(...)` halos) was
 * chosen after a prototype matrix — see `docs/icon-outline-prototype.md`
 * and `docs/icon-outline-prototype-results.md` for the variants tested
 * and the rationale. Short version: `paint-order: stroke fill` on the
 * SVG path is the cheapest and crispest option; filters cost 4× the
 * render time and look fuzzy at 24 px.
 *
 * Module-level mutable state (`_outlineEnabled`) is the simplest way
 * to thread the option through the two paint paths in painter.ts (the
 * `ha-state-icon.stateObj` setter patch and the MutationObserver
 * crawler) without changing function signatures across the bundle.
 * Bootstrap (`index.ts`) calls `setOutlineEnabled` with the value
 * fetched from `smart_icons/get_options` and again whenever the
 * `smart_icons_options_updated` bus event fires.
 */

// True until bootstrap learns otherwise. Defaulting to true means the
// outline appears on first paint after install, which matches the
// default-on option value and avoids a brief "no outline" flash while
// the WS query is in flight.
let _outlineEnabled = true;

export function setOutlineEnabled(enabled: boolean): void {
  _outlineEnabled = enabled;
}

export function isOutlineEnabled(): boolean {
  return _outlineEnabled;
}

// --------------------------------------------------------------------
// Color / luminance helpers
// --------------------------------------------------------------------

// Hidden DOM probe resolves any CSS color string (named, hex, rgb(),
// hsl()) into the canonical rgb() form via getComputedStyle. Cheaper
// and trivially correct compared to writing our own color parser for
// whatever HA / themes may hand us.
let _probe: HTMLDivElement | undefined;

function getProbe(): HTMLDivElement {
  if (_probe?.isConnected) return _probe;
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.left = '-9999px';
  probe.style.top = '-9999px';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  // documentElement is always present; body may not be on early
  // bootstrap depending on script ordering.
  (document.body ?? document.documentElement).appendChild(probe);
  _probe = probe;
  return probe;
}

function parseRgb(cssColor: string): [number, number, number] | null {
  const m =
    /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/.exec(
      cssColor,
    );
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function relativeLuminance(r: number, g: number, b: number): number {
  // W3C contrast formula. https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Memo keyed on the input color string. Same input → same output.
// The painted-color universe is small (one value per rule decoration,
// often shared across many entities), so this caps DOM-probe work at
// O(unique-colors).
const _outlineFromColorMemo = new Map<string, string>();

/** Black or white outline picked from the input color's W3C relative
 *  luminance. Returns black if the painted color is lighter than 0.5
 *  luminance, white otherwise. Exported for unit testing. */
export function autoContrastOutline(color: string): string {
  const cached = _outlineFromColorMemo.get(color);
  if (cached !== undefined) return cached;
  let outline = '#000000';
  try {
    const probe = getProbe();
    probe.style.color = '';
    probe.style.color = color;
    const resolved = getComputedStyle(probe).color;
    const rgb = parseRgb(resolved);
    if (rgb) {
      outline = relativeLuminance(rgb[0], rgb[1], rgb[2]) > 0.5
        ? '#000000'
        : '#ffffff';
    }
  } catch {
    // Probe failed; default to black outline (safer on light themes,
    // which are HA's default).
  }
  _outlineFromColorMemo.set(color, outline);
  return outline;
}

// --------------------------------------------------------------------
// Decoration application
// --------------------------------------------------------------------

const STROKE_WIDTH_PX = '1.5';

/** Apply color + (when outline enabled) native SVG stroke to a painted
 *  host. Idempotent: setting the same string repeatedly is a no-op in
 *  the browser's eyes; we guard equality before writing to avoid even
 *  triggering setter-side observers. Always sets
 *  `dataset.smartIconsOwned` so the release path knows what to clean up. */
export function applyDecoration(host: HTMLElement, color: string): void {
  if (host.style.color !== color) host.style.color = color;
  host.dataset.smartIconsOwned = 'color';

  if (_outlineEnabled) {
    applySvgStroke(host, autoContrastOutline(color));
  } else {
    // Ensure no leftover stroke from a previous outline-enabled paint
    // remains on this host after the admin toggles outlines off.
    releaseSvgStroke(host);
  }
}

/** Reset everything `applyDecoration` may have set on this host. Called
 *  by the painter when an entity stops being painted (color cleared,
 *  rule no longer applies, host disconnected). */
export function releaseDecoration(host: HTMLElement): void {
  if (!host.dataset.smartIconsOwned) return;
  host.style.color = '';
  delete host.dataset.smartIconsOwned;
  releaseSvgStroke(host);
}

// --------------------------------------------------------------------
// SVG stroke application
// --------------------------------------------------------------------

// ha-state-icon's actual SVG element can live one or more shadow
// boundaries deep: ha-state-icon → ha-icon → ha-svg-icon → <svg>. The
// exact depth varies by HA version and icon source (mdi vs custom
// path). Walk every level we know about and stroke every <path>
// found; no-op when we don't find one.
function forEachPath(
  host: HTMLElement,
  fn: (p: SVGPathElement) => void,
): void {
  const collect = (root: ShadowRoot | Document): void => {
    root.querySelectorAll<SVGPathElement>('svg path').forEach(fn);
    root
      .querySelectorAll('ha-icon, ha-svg-icon, ha-state-icon')
      .forEach((el) => {
        const inner = el.shadowRoot;
        if (inner) collect(inner);
      });
  };
  const sr = host.shadowRoot;
  if (sr) collect(sr);
}

function applySvgStroke(host: HTMLElement, color: string): void {
  forEachPath(host, (p) => {
    p.style.paintOrder = 'stroke fill';
    p.style.stroke = color;
    p.style.strokeWidth = STROKE_WIDTH_PX;
    // Round joins keep glyph corners clean — without this, MDI's
    // angular shapes pick up little notches where path segments
    // meet at sharp angles.
    p.style.strokeLinejoin = 'round';
  });
}

function releaseSvgStroke(host: HTMLElement): void {
  forEachPath(host, (p) => {
    p.style.paintOrder = '';
    p.style.stroke = '';
    p.style.strokeWidth = '';
    p.style.strokeLinejoin = '';
  });
}
