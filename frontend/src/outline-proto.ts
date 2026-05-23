/**
 * PROTOTYPE — icon-outline experiment scaffolding.
 *
 * Feature-flagged code path that augments the painter's color
 * application with one of several outline rendering techniques. See
 * `docs/icon-outline-prototype.md` for the design and the
 * measurement plan.
 *
 * Status: prototype. Not covered by unit tests yet — the module's
 * purpose is to surface data on which variant (if any) is worth
 * shipping. Once a winner is chosen and promoted, the chosen path
 * gets the test coverage AGENTS.md prescribes for shipped behavior.
 *
 * Flag selection (highest priority wins):
 *   1. URL query `?smart-icons-outline=<v>` — per-load, ideal for
 *      quick devtools comparisons.
 *   2. localStorage key `smart-icons:outline-variant` — persistent.
 *   3. default: `off` (no outline; painter behaves as on `main`).
 *
 * Variants:
 *   off  baseline — color only, no outline. Default.
 *   v1   A3 auto-luminance + B1 soft halo drop-shadow.
 *   v2   A3 auto-luminance + B2 4-direction hard drop-shadow.
 *   v3   A3 auto-luminance + B5 native SVG paint-order stroke.
 *   v4   A4 theme-aware bg + B2 4-direction hard drop-shadow.
 */

export type OutlineVariant = 'off' | 'v1' | 'v2' | 'v3' | 'v4';

const STORAGE_KEY = 'smart-icons:outline-variant';
const URL_PARAM = 'smart-icons-outline';
const VALID: ReadonlySet<OutlineVariant> = new Set([
  'off',
  'v1',
  'v2',
  'v3',
  'v4',
]);

let _cached: OutlineVariant | undefined;

export function getOutlineVariant(): OutlineVariant {
  if (_cached !== undefined) return _cached;
  _cached = readVariant();
  return _cached;
}

function readVariant(): OutlineVariant {
  // URL takes precedence — devtools workflow is to append the query
  // to the current dashboard URL and reload, rather than poke
  // localStorage manually.
  try {
    const q = new URL(globalThis.location.href).searchParams.get(URL_PARAM);
    if (q && VALID.has(q as OutlineVariant)) return q as OutlineVariant;
  } catch {
    // Non-browser context (tests, SSR) — fall through.
  }
  try {
    const s = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (s && VALID.has(s as OutlineVariant)) return s as OutlineVariant;
  } catch {
    // Safari private mode and similar can throw on storage access.
  }
  return 'off';
}

/** Set the variant for current + future page loads. Exposed via
 *  `window.__smartIcons.setOutlineVariant()` so devtools users can
 *  flip without editing storage by hand. Note that existing painted
 *  icons keep whatever decoration was applied at their last paint —
 *  call `__smartIcons.painter.repaintAll()` after to update them, or
 *  reload the page. */
export function setOutlineVariant(v: OutlineVariant): void {
  if (!VALID.has(v)) {
    throw new Error(`unknown outline variant: ${v}`);
  }
  _cached = v;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, v);
  } catch {
    // ignore
  }
  // eslint-disable-next-line no-console
  console.log(
    `[smart-icons:outline-proto] variant set to ${v} — call ` +
      '__smartIcons.painter.repaintAll() (or reload) to apply to existing icons',
  );
}

// --------------------------------------------------------------------
// Color / luminance helpers
// --------------------------------------------------------------------

// Single hidden DOM probe lets us resolve any CSS color string
// (named, hex, rgb(), hsl(), rgba()) into the canonical rgb()/rgba()
// form via getComputedStyle. Cheaper than writing our own parser and
// trivially correct for whatever colors HA's themes use.
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

/** Given a painted color, return the best black/white outline for
 *  contrast against that color (variants v1/v2/v3). */
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
    // Probe failed; default to black outline (safer on light themes
    // which are HA's default).
  }
  _outlineFromColorMemo.set(color, outline);
  return outline;
}

/** Walk up from a host (across shadow roots) to find the first
 *  ancestor with a non-transparent background, then return the
 *  contrasting outline color for that background (variant v4). */
export function autoContrastFromBackground(
  host: HTMLElement,
  fallback: string,
): string {
  let node: HTMLElement | null = host;
  let hops = 0;
  while (node && hops < 20) {
    const cs = getComputedStyle(node);
    const bg = cs.backgroundColor;
    // Browsers report transparent as rgba(0,0,0,0) or "transparent".
    if (
      bg &&
      bg !== 'transparent' &&
      !/^rgba?\([^)]*,\s*0\s*\)$/.test(bg)
    ) {
      const rgb = parseRgb(bg);
      if (rgb) {
        return relativeLuminance(rgb[0], rgb[1], rgb[2]) > 0.5
          ? '#000000'
          : '#ffffff';
      }
    }
    const root = node.getRootNode?.() as ShadowRoot | Document | undefined;
    if (node.parentElement) {
      node = node.parentElement;
    } else if (root && (root as ShadowRoot).host instanceof HTMLElement) {
      node = (root as ShadowRoot).host as HTMLElement;
    } else {
      node = null;
    }
    hops += 1;
  }
  return fallback;
}

// --------------------------------------------------------------------
// Decoration application
// --------------------------------------------------------------------

// `HTMLElement` already has style, dataset, and shadowRoot — alias
// kept for self-documenting call sites in the painter wire-up.
type Host = HTMLElement;

const FILTER_V2_OFFSETS = [
  '1px 0',
  '-1px 0',
  '0 1px',
  '0 -1px',
];

/** Apply color + variant-specific outline to a painted host.
 *
 *  Idempotent: setting the same string repeatedly is a no-op in the
 *  browser's eyes; we guard equality before writing to avoid even
 *  triggering setter-side observers. Always sets
 *  `dataset.smartIconsOwned` so the existing release path knows what
 *  to clean up.
 */
export function applyDecoration(host: Host, color: string): void {
  // Color: same write the painter did pre-prototype.
  if (host.style.color !== color) host.style.color = color;
  host.dataset.smartIconsOwned = 'color';

  const variant = getOutlineVariant();
  if (variant === 'off') {
    // Variant disabled — ensure no leftover filter / SVG stroke from
    // a previous variant remains.
    if (host.style.filter) host.style.filter = '';
    releaseSvgStroke(host);
    return;
  }

  const outline =
    variant === 'v4'
      ? autoContrastFromBackground(host, autoContrastOutline(color))
      : autoContrastOutline(color);

  if (variant === 'v3') {
    // Native SVG stroke variant — reach into the shadow root rather
    // than applying a CSS filter on the host.
    if (host.style.filter) host.style.filter = '';
    applySvgStroke(host, outline);
    return;
  }

  // Drop-shadow variants (v1 soft, v2/v4 hard 4-direction).
  let filter: string;
  if (variant === 'v1') {
    filter = `drop-shadow(0 0 1.5px ${outline})`;
  } else {
    filter = FILTER_V2_OFFSETS.map(
      (off) => `drop-shadow(${off} 0 ${outline})`,
    ).join(' ');
  }
  // Make sure stroke variant is cleaned up if we previously had v3.
  releaseSvgStroke(host);
  if (host.style.filter !== filter) host.style.filter = filter;
}

/** Reset everything `applyDecoration` may have set. Called by the
 *  painter when an entity stops being painted (color cleared, host
 *  unowned). */
export function releaseDecoration(host: Host): void {
  if (!host.dataset.smartIconsOwned) return;
  host.style.color = '';
  if (host.style.filter) host.style.filter = '';
  delete host.dataset.smartIconsOwned;
  releaseSvgStroke(host);
}

// --------------------------------------------------------------------
// SVG stroke variant (v3)
// --------------------------------------------------------------------

// ha-state-icon's actual SVG element can live one or more shadow
// boundaries deep — ha-state-icon → ha-icon → ha-svg-icon → <svg>.
// The exact depth varies by HA version and icon source. Try every
// path we know about, no-op when we don't find one.
function forEachPath(host: Host, fn: (p: SVGPathElement) => void): void {
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

function applySvgStroke(host: Host, color: string): void {
  forEachPath(host, (p) => {
    p.style.paintOrder = 'stroke fill';
    p.style.stroke = color;
    // 1.5px stroke width is a starting point; the prototype writeup
    // will tell us whether thicker (closes the gap on thin glyphs at
    // small sizes) or thinner (less blob risk on detailed glyphs) is
    // the right ship value.
    p.style.strokeWidth = '1.5';
    p.style.strokeLinejoin = 'round';
  });
}

function releaseSvgStroke(host: Host): void {
  forEachPath(host, (p) => {
    p.style.paintOrder = '';
    p.style.stroke = '';
    p.style.strokeWidth = '';
    p.style.strokeLinejoin = '';
  });
}
