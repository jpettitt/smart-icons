/**
 * Color painter for `<ha-state-icon>` hosts.
 *
 * Reads each host's `stateObj.attributes.smart_icons_color` and applies
 * it as inline `style.color`. The backend `IconInjector` is responsible
 * for computing the value (server-side rule evaluation against the
 * source entity); the painter is just the local DOM-side bridge that
 * turns the attribute into an actual CSS color.
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
    const entityId = host.stateObj?.entity_id;
    if (!entityId) return;

    const attrs = host.stateObj?.attributes;
    const color = (attrs?.[SMART_ICONS_COLOR_ATTR] ?? null) as string | null;

    if (color != null) {
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
}

// Re-export so tests can spec it explicitly.
export type { IconHost };
