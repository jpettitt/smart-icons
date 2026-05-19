/**
 * Frontend mirror of the backend RuleStore. Loads the initial snapshot
 * via `smart_icons/list` then subscribes to `smart_icons/subscribe` for
 * incremental add/update/remove events. Exposes a tiny reactive surface:
 * `all()`, `byTarget()`, `sources()`, and `subscribe(cb)` for views.
 */

import type { HassConnection, Rule, SubscribeEvent } from './types';

type Listener = (rules: Rule[]) => void;

export class RuleStore {
  private rules = new Map<string, Rule>();
  private listeners = new Set<Listener>();
  private unsubscribe: (() => Promise<void>) | null = null;

  async connect(conn: HassConnection): Promise<void> {
    const snapshot = await conn.sendMessagePromise<{ rules: Rule[] }>({
      type: 'smart_icons/list',
    });
    this.rules = new Map(snapshot.rules.map((r) => [r.id, r]));
    this.emit();

    this.unsubscribe = await conn.subscribeMessage<SubscribeEvent>(
      (event) => this.handleEvent(event),
      { type: 'smart_icons/subscribe' }
    );
  }

  async disconnect(): Promise<void> {
    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = null;
    }
    this.rules.clear();
    this.listeners.clear();
  }

  all(): Rule[] {
    return [...this.rules.values()];
  }

  byTarget(entityId: string): Rule[] {
    const out: Rule[] = [];
    for (const r of this.rules.values()) {
      if (r.target === entityId) out.push(r);
    }
    return out;
  }

  /** Unique set of source entities referenced by enabled rules. */
  sources(): Set<string> {
    const out = new Set<string>();
    for (const r of this.rules.values()) {
      if (r.enabled) out.add(r.source);
    }
    return out;
  }

  /** Subscribe to rule-set changes; callback fires immediately with the current snapshot. */
  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    cb(this.all());
    return () => this.listeners.delete(cb);
  }

  private handleEvent(event: SubscribeEvent): void {
    if (event.type === 'removed') {
      this.rules.delete(event.id);
    } else {
      this.rules.set(event.id, event.rule);
    }
    this.emit();
  }

  private emit(): void {
    const snapshot = this.all();
    for (const cb of this.listeners) cb(snapshot);
  }
}
