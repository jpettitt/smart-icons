/**
 * The Painter walks the DOM, finds `<ha-state-icon>` elements, evaluates
 * any rules whose target matches the icon's entity, and applies the
 * winning decoration (color on the outer host, glyph on the inner
 * `<ha-icon>`). On rule changes or source-state changes the painter
 * re-walks its known set; new `<ha-state-icon>` elements appearing in
 * the DOM (e.g. on dashboard navigation) are discovered via a single
 * shadow-piercing MutationObserver tree.
 *
 * v0.1 keeps the politeness layer minimal — we always paint when a rule
 * matches. The full per-property stand-down behavior (DESIGN.md § 7.3)
 * lands in v0.2.
 */

import type { Decoration, Rule } from './types';
import { evaluateRule, pickWinner } from './evaluator';

type RuleProvider = () => Rule[];
type StateGetter = (entityId: string) => string | undefined;

const DATA_OWNED = 'smartIconsOwned';

interface IconHost extends HTMLElement {
  stateObj?: { entity_id: string; state?: string };
  shadowRoot: ShadowRoot;
}

export class Painter {
  private observers = new Set<MutationObserver>();
  private observedRoots = new WeakSet<Document | ShadowRoot>();
  private intrinsicIcons = new WeakMap<HTMLElement, string | null>();
  private knownHosts = new Set<IconHost>();
  private running = false;
  private repaintScheduled = false;

  constructor(
    private readonly getRules: RuleProvider,
    private readonly getState: StateGetter
  ) {}

  start(root: Document | ShadowRoot = document): void {
    if (this.running) return;
    this.running = true;
    this.attachAndScan(root);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    for (const mo of this.observers) mo.disconnect();
    this.observers.clear();
    for (const host of this.knownHosts) this.release(host);
    this.knownHosts.clear();
  }

  /**
   * Re-evaluate every known host. Batched into the next animation frame
   * so a flurry of rule/state updates only paints once.
   */
  repaintAll(): void {
    if (!this.running || this.repaintScheduled) return;
    this.repaintScheduled = true;
    requestAnimationFrame(() => {
      this.repaintScheduled = false;
      for (const host of this.knownHosts) {
        if (host.isConnected) this.paintHost(host);
        else this.knownHosts.delete(host);
      }
    });
  }

  /** Discovery: walk a root looking for ha-state-icon elements and shadow roots. */
  private attachAndScan(root: Document | ShadowRoot | Element): void {
    if ((root === document || root instanceof ShadowRoot) && !this.observedRoots.has(root)) {
      const mo = new MutationObserver((records) => this.handleMutations(records));
      mo.observe(root, { childList: true, subtree: true, attributes: false });
      this.observers.add(mo);
      this.observedRoots.add(root);
    }
    this.scanForIconsAndShadows(root as Element | Document | ShadowRoot);
  }

  private scanForIconsAndShadows(node: Element | Document | ShadowRoot): void {
    // If the input itself is a custom element with a shadow root, descend
    // into it. handleMutations hands us added nodes — those are usually
    // custom elements (hui-tile-card etc.) whose entire content lives in
    // their shadow tree; querySelectorAll on their *light* DOM finds nothing.
    // Without this hop we'd attach observers to the parent shadow root,
    // see the new card added, scan its (empty) light DOM, and silently drop
    // the entire subtree on the floor.
    const ownShadow = (node as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
    if (ownShadow) this.attachAndScan(ownShadow);

    // Paint any ha-state-icon in this subtree.
    const icons = (node as Element).querySelectorAll?.('ha-state-icon');
    if (icons) {
      for (const el of icons) this.adopt(el as IconHost);
    }
    // Walk one level of shadow roots and recurse into each.
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

  /** First time we see a host, snapshot its intrinsic glyph and paint it. */
  private adopt(host: IconHost): void {
    if (!host.isConnected) return;
    if (!this.knownHosts.has(host)) {
      const inner = host.shadowRoot?.querySelector('ha-icon');
      if (inner) this.intrinsicIcons.set(host, inner.getAttribute('icon'));
      this.knownHosts.add(host);
    }
    this.paintHost(host);
  }

  /** Evaluate rules for this host's entity and apply the winning decoration. */
  private paintHost(host: IconHost): void {
    const entityId = host.stateObj?.entity_id;
    if (!entityId) return;

    const rules = this.getRules().filter((r) => r.target === entityId && r.enabled);
    if (rules.length === 0) {
      this.release(host);
      return;
    }

    const decorations: (Decoration | null)[] = rules.map((r) =>
      evaluateRule(r, this.getState(r.source) ?? host.stateObj?.state)
    );
    const winner = pickWinner(rules, decorations);

    if (!winner) {
      this.release(host);
      return;
    }

    const inner = host.shadowRoot?.querySelector('ha-icon');

    // Color: write only when the value would change. Setting style.color
    // to the same value still fires our observer in some browsers, so the
    // equality check both saves work and prevents observer storms.
    if (winner.color != null) {
      if (host.style.color !== winner.color) host.style.color = winner.color;
    } else if (host.dataset[DATA_OWNED]?.includes('color')) {
      host.style.color = '';
    }

    if (winner.icon != null && inner) {
      if (inner.getAttribute('icon') !== winner.icon) {
        inner.setAttribute('icon', winner.icon);
      }
    } else if (host.dataset[DATA_OWNED]?.includes('icon') && inner) {
      const intrinsic = this.intrinsicIcons.get(host);
      if (intrinsic != null && inner.getAttribute('icon') !== intrinsic) {
        inner.setAttribute('icon', intrinsic);
      }
    }

    const parts: string[] = [];
    if (winner.color != null) parts.push('color');
    if (winner.icon != null) parts.push('icon');
    host.dataset[DATA_OWNED] = parts.join(',');
  }

  /** Restore intrinsic glyph and clear inline color; forget ownership. */
  private release(host: IconHost): void {
    const owned = host.dataset[DATA_OWNED];
    if (!owned) return;
    if (owned.includes('color')) host.style.color = '';
    if (owned.includes('icon')) {
      const inner = host.shadowRoot?.querySelector('ha-icon');
      const intrinsic = this.intrinsicIcons.get(host);
      if (inner && intrinsic != null) inner.setAttribute('icon', intrinsic);
    }
    delete host.dataset[DATA_OWNED];
  }
}
