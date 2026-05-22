/**
 * Color painter for `<ha-state-icon>` hosts.
 *
 * Reads each painted entity's `smart_icons_color` attribute from a
 * `StateWatcher` cache and applies it as inline `style.color`. The
 * backend `IconInjector` is responsible for computing the value
 * (server-side rule evaluation against the source entity); the painter
 * is just the local DOM-side bridge that turns the attribute into an
 * actual CSS color.
 *
 * Why not read from the host's own `stateObj.attributes`?
 * On a `state_changed` event, our painter and HA's card Lit re-renders
 * are both microtask-scheduled in the same tick, and there's no
 * ordering guarantee. If the painter's microtask runs before the
 * card's, `host.stateObj` is still the previous snapshot — we paint
 * with stale data and the color appears stuck until the next
 * remount (dashboard switch, hard reload). Reading from StateWatcher
 * — which is updated synchronously inside the event dispatch, before
 * any microtask runs — removes that race.
 *
 * Icon glyph swap is NOT done here — that runs entirely server-side via
 * the standard `attributes.icon` mechanism that templated entities use.
 * The painter only exists because HA has no native attribute the
 * frontend respects for icon color.
 *
 * Discovery uses a shadow-piercing MutationObserver tree (catch-up
 * scans at 100/500/2000 ms cover late-mounted Lovelace tiles); see
 * DESIGN.md § 7.2.
 */

import type { StateWatcher } from './state-watcher';
import type { IconHost } from './types';
import { SMART_ICONS_COLOR_ATTR } from './types';

interface IconHostWithStateObj extends HTMLElement {
  stateObj?: {
    entity_id: string;
    state: string;
    attributes?: Record<string, unknown>;
  };
}

const DATA_OWNED = 'smartIconsOwned';
const CATCHUP_SCAN_DELAYS_MS = [100, 500, 2000] as const;

export class Painter {
  private observers = new Set<MutationObserver>();
  private observedRoots = new WeakSet<Document | ShadowRoot>();
  private knownHosts = new Set<IconHostWithStateObj>();
  private running = false;
  private repaintScheduled = false;
  private catchupTimers: ReturnType<typeof setTimeout>[] = [];

  /** Optional state cache. When provided, the painter reads
   *  smart_icons_color from here instead of host.stateObj — see the
   *  module-level comment for why this matters. Tests that don't need
   *  the racy real-world timing can omit it and fall back to host
   *  reads (so existing painter unit tests keep working). */
  constructor(private readonly watcher?: StateWatcher) {}

  start(root: Document | ShadowRoot = document): void {
    if (this.running) return;
    this.running = true;
    this.attachAndScan(root);

    // Lovelace renders cards asynchronously; mutation observers don't
    // always catch every shadow root before its content is filled in.
    // Catch-up scans are idempotent — adopt() de-dupes, attachAndScan
    // de-dupes observers.
    this.catchupTimers = CATCHUP_SCAN_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        if (this.running) this.scanForIconsAndShadows(root);
      }, delay)
    );
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    for (const t of this.catchupTimers) clearTimeout(t);
    this.catchupTimers = [];
    for (const mo of this.observers) mo.disconnect();
    this.observers.clear();
    for (const host of this.knownHosts) this.release(host);
    this.knownHosts.clear();
  }

  repaintAll(): void {
    if (!this.running || this.repaintScheduled) return;
    this.repaintScheduled = true;
    // queueMicrotask over requestAnimationFrame: rAF is paused on
    // hidden/backgrounded windows (and unreliable in headless test
    // browsers); microtasks always run. The visual difference is
    // negligible for a single CSS color write per host.
    queueMicrotask(() => {
      this.repaintScheduled = false;
      for (const host of this.knownHosts) {
        if (host.isConnected) this.paintHost(host);
        else this.knownHosts.delete(host);
      }
    });
  }

  private attachAndScan(root: Document | ShadowRoot | Element): void {
    if (
      (root === document || root instanceof ShadowRoot) &&
      !this.observedRoots.has(root)
    ) {
      const mo = new MutationObserver((records) => this.handleMutations(records));
      mo.observe(root, { childList: true, subtree: true, attributes: false });
      this.observers.add(mo);
      this.observedRoots.add(root);
    }
    this.scanForIconsAndShadows(root as Element | Document | ShadowRoot);
  }

  private scanForIconsAndShadows(node: Element | Document | ShadowRoot): void {
    // If the input itself is a custom element with a shadow root, descend
    // into it — see DESIGN.md § 7.2 for why this hop is load-bearing.
    const ownShadow = (node as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
    if (ownShadow) this.attachAndScan(ownShadow);

    const icons = (node as Element).querySelectorAll?.('ha-state-icon');
    if (icons) {
      for (const el of icons) this.adopt(el as IconHostWithStateObj);
    }
    const candidates = (node as Element).querySelectorAll?.('*');
    if (!candidates) return;
    for (const el of candidates) {
      const sr = (el as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
      if (sr) this.attachAndScan(sr);
    }
  }

  private handleMutations(records: MutationRecord[]): void {
    if (!this.running) return;
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n instanceof Element) this.scanForIconsAndShadows(n);
      }
    }
  }

  private adopt(host: IconHostWithStateObj): void {
    if (!host.isConnected) return;
    if (!this.knownHosts.has(host)) {
      this.knownHosts.add(host);
    }
    this.paintHost(host);
  }

  private paintHost(host: IconHostWithStateObj): void {
    // Resolve the entity stateObj — most ha-state-icons carry it on
    // their own `stateObj` property, but some surfaces (state-badge
    // wrappers, certain card rows) only put it on the parent and
    // the inner ha-state-icon has nothing. resolveStateObj walks up
    // until it finds one.
    const stateObj = this.resolveStateObj(host);
    const entityId = stateObj?.entity_id;
    if (!entityId) return;

    // Prefer the StateWatcher cache when wired up (production). It
    // tracks the connection-layer truth synchronously, so we don't
    // race Lit's stateObj rebind. Fall back to the resolved stateObj
    // for tests that construct a bare Painter() without a watcher.
    const color = (this.watcher
      ? this.watcher.getAttribute(entityId, SMART_ICONS_COLOR_ATTR)
      : stateObj?.attributes?.[SMART_ICONS_COLOR_ATTR]) as
      | string
      | null
      | undefined;

    if (color != null && color !== '') {
      if (host.style.color !== color) host.style.color = color;
      host.dataset[DATA_OWNED] = 'color';
    } else if (host.dataset[DATA_OWNED]) {
      this.release(host);
    }
  }

  private release(host: IconHostWithStateObj): void {
    if (!host.dataset[DATA_OWNED]) return;
    host.style.color = '';
    delete host.dataset[DATA_OWNED];
  }

  /** Find the entity stateObj this `<ha-state-icon>` represents.
   *
   *  Fast path: `host.stateObj` — HA passes a `stateObj` property
   *  to ha-state-icon in most surfaces (tiles, more-info, dev
   *  tools, etc). In some contexts (notably `<state-badge>`
   *  wrappers used by entities-card rows and more-info headers)
   *  the immediate ha-state-icon has no `stateObj` of its own —
   *  the data lives on the wrapping element and HA either only
   *  passes data-* attributes down, or hasn't finished propagating
   *  the property when we paint.
   *
   *  Slow path: walk up through the DOM, hopping across shadow-root
   *  boundaries, and use the first ancestor that carries a
   *  `stateObj.entity_id`. The first state-badge / row going up is
   *  always the entity wrapper for the icon, so the walk terminates
   *  quickly. A 12-hop guard prevents a pathological DOM from
   *  burning cycles. */
  private resolveStateObj(
    host: IconHostWithStateObj,
  ): IconHostWithStateObj['stateObj'] | undefined {
    if (host.stateObj?.entity_id) return host.stateObj;

    let node: Node | null =
      host.parentNode ??
      ((host.getRootNode() as ShadowRoot).host ?? null);
    let hops = 0;
    while (node && hops < 12) {
      const obj = (node as { stateObj?: IconHostWithStateObj['stateObj'] })
        .stateObj;
      if (obj?.entity_id) return obj;
      const root = node.getRootNode?.();
      if (node.parentNode) {
        node = node.parentNode;
      } else if (root && (root as ShadowRoot).host) {
        node = (root as ShadowRoot).host;
      } else {
        node = null;
      }
      hops += 1;
    }
    return undefined;
  }
}

// Re-export so tests can spec it explicitly.
export type { IconHost };
