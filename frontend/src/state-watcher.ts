/**
 * Caches entity states for the painter and fans out `state_changed` events.
 *
 * v0.1 subscribes to *all* `state_changed` events and filters client-side.
 * On most HA installs that's well under a few hundred events per minute,
 * and the handler is O(1) per event. A per-entity subscription model is a
 * later optimization (DESIGN.md § 7.4) — the high-traffic case is unusual.
 */

import type { HassConnection, HassStates } from './types';

type Listener = (entityId: string, newState: string | undefined) => void;

interface StateChangedEvent {
  data: {
    entity_id: string;
    new_state: { state: string } | null;
    old_state: { state: string } | null;
  };
}

export class StateWatcher {
  private states = new Map<string, string>();
  private listeners = new Set<Listener>();
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(private readonly conn: HassConnection) {}

  async start(initialStates: HassStates): Promise<void> {
    for (const [id, s] of Object.entries(initialStates)) {
      this.states.set(id, s.state);
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
    return this.states.get(entityId);
  }

  onChange(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private handleStateChanged(event: StateChangedEvent): void {
    const id = event.data.entity_id;
    const newState = event.data.new_state?.state;
    if (newState == null) {
      this.states.delete(id);
    } else {
      this.states.set(id, newState);
    }
    for (const cb of this.listeners) cb(id, newState);
  }
}
