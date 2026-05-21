/**
 * Caches entity states for the painter and fans out `state_changed` events.
 *
 * v0.1 subscribes to *all* `state_changed` events and filters client-side.
 * On most HA installs that's well under a few hundred events per minute,
 * and the handler is O(1) per event. A per-entity subscription model is a
 * later optimization (DESIGN.md § 7.4) — the high-traffic case is unusual.
 *
 * The cache stores the full attribute bag, not just the state value. The
 * painter reads `smart_icons_color` from here rather than from a host's
 * `stateObj` — that path is racy because Lit's card re-render (which
 * rebinds the new `stateObj` onto `<ha-state-icon>`) is microtask-
 * scheduled in parallel with our paint, and there's no ordering
 * guarantee. Reading from our own synchronous cache removes that race
 * (DESIGN.md § 7.5).
 */

import type { HassConnection, HassStates } from './types';

type Listener = (entityId: string, newState: string | undefined) => void;

interface StateSnapshot {
  state: string;
  attributes: Record<string, unknown>;
}

interface StateChangedEvent {
  data: {
    entity_id: string;
    new_state: { state: string; attributes?: Record<string, unknown> } | null;
    old_state: { state: string; attributes?: Record<string, unknown> } | null;
  };
}

export class StateWatcher {
  private states = new Map<string, StateSnapshot>();
  private listeners = new Set<Listener>();
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(private readonly conn: HassConnection) {}

  async start(initialStates: HassStates): Promise<void> {
    for (const [id, s] of Object.entries(initialStates)) {
      this.states.set(id, { state: s.state, attributes: s.attributes ?? {} });
    }
    this.unsubscribe = await this.conn.subscribeEvents<StateChangedEvent>(
      (event) => this.handleStateChanged(event),
      'state_changed'
    );
  }

  async stop(): Promise<void> {
    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = null;
    }
    this.states.clear();
    this.listeners.clear();
  }

  getState(entityId: string): string | undefined {
    return this.states.get(entityId)?.state;
  }

  /** Read a state attribute from our own synchronously-updated cache.
   *  Preferred over `host.stateObj.attributes[name]` for any attribute
   *  we wrote ourselves server-side — the host's stateObj is only as
   *  fresh as the next Lit render of the parent card. */
  getAttribute(entityId: string, name: string): unknown {
    return this.states.get(entityId)?.attributes[name];
  }

  onChange(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private handleStateChanged(event: StateChangedEvent): void {
    const id = event.data.entity_id;
    const ns = event.data.new_state;
    if (ns == null) {
      this.states.delete(id);
    } else {
      this.states.set(id, {
        state: ns.state,
        attributes: ns.attributes ?? {},
      });
    }
    for (const cb of this.listeners) cb(id, ns?.state);
  }
}
