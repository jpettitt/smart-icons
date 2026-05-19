/**
 * Frontend mirror of the backend RuleStore. Loads the initial snapshot
 * via `smart_icons/list` then subscribes to `smart_icons/subscribe` for
 * incremental add/update/remove events. Exposes a tiny reactive surface:
 * `all()`, `byTarget()`, `sources()`, and `subscribe(cb)` for views.
 *
 * To eliminate the flash of default icons on dashboard reload, the store
 * also persists a snapshot to `localStorage` on every change. Callers
 * can `hydrateFromCache()` synchronously before the WS round trip so the
 * painter has rules to apply from the very first frame. `connect()`
 * reconciles against the server when it eventually completes.
 */

import type { HassConnection, Rule, SubscribeEvent } from './types';

type Listener = (rules: Rule[]) => void;

const CACHE_KEY = 'smart_icons.rules_cache.v1';

export class RuleStore {
  private rules = new Map<string, Rule>();
  private listeners = new Set<Listener>();
  private unsubscribe: (() => Promise<void>) | null = null;

  /**
   * Synchronously populate from the localStorage snapshot. Safe to call
   * before connect(); the WS list response will replace whatever we
   * loaded here. Returns the number of rules hydrated (0 if no cache,
   * unavailable storage, or parse error).
   */
  hydrateFromCache(): number {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { rules?: Rule[] } | null;
      const list = parsed?.rules;
      if (!Array.isArray(list) || list.length === 0) return 0;
      this.rules = new Map(list.map((r) => [r.id, r]));
      this.emit();
      return list.length;
    } catch {
      // Quota errors, parse errors, no localStorage in test envs — fine,
      // the server sync will populate.
      return 0;
    }
  }

  async connect(conn: HassConnection): Promise<void> {
    const snapshot = await conn.sendMessagePromise<{ rules: Rule[] }>({
      type: 'smart_icons/list',
    });
    this.rules = new Map(snapshot.rules.map((r) => [r.id, r]));
    this.writeCache();
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
    this.writeCache();
    this.emit();
  }

  private writeCache(): void {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ rules: this.all() })
      );
    } catch {
      // Storage quota, private mode, etc. — non-fatal; the cache is an
      // optimization, not a correctness requirement.
    }
  }

  private emit(): void {
    const snapshot = this.all();
    for (const cb of this.listeners) cb(snapshot);
  }
}
