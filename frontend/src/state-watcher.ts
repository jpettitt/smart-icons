/**
 * Caches entity states for the painter and fans out `state_changed` events.
 *
 * Subscribes to *all* `state_changed` events and filters client-side.
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
 *
 * Bootstrap (start()) uses HA's `get_states` WS command to fetch the
 * authoritative initial-state snapshot instead of trusting
 * `<home-assistant>.hass.states` to be populated. The latter is filled
 * asynchronously by HA's connection layer and was empty for some
 * slow-bootstrapping setups, leaving the watcher cache permanently
 * missing slow-moving entities (temperatures, locks). Events that
 * arrive during the get_states fetch are buffered then drained on
 * top of the snapshot — no race, no lost events.
 */

import type { HassConnection } from './types';

/** Listener signature: receives the changed entity's id, the new
 *  state value (undefined if the entity was removed from the state
 *  machine), and BOTH the old and new attribute bags so callers can
 *  detect transitions on specific keys (e.g. "did the smart-icons
 *  decoration just appear / disappear here?"). Either bag is
 *  undefined when there's no corresponding state (entity newly
 *  appeared → oldAttributes undefined; entity removed → newAttributes
 *  undefined). */
type Listener = (
  entityId: string,
  newState: string | undefined,
  oldAttributes: Record<string, unknown> | undefined,
  newAttributes: Record<string, unknown> | undefined,
) => void;

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

/** Shape of an entry in HA's `get_states` response. Same fields the
 *  WebSocket connection delivers from the server's canonical state
 *  store, used here to bootstrap our cache without depending on
 *  `<home-assistant>.hass.states` being populated yet. */
interface GetStatesEntry {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export class StateWatcher {
  private states = new Map<string, StateSnapshot>();
  private listeners = new Set<Listener>();
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(private readonly conn: HassConnection) {}

  async start(): Promise<void> {
    // Canonical "bootstrap a cache from a stream" pattern. We don't
    // trust `<home-assistant>.hass.states` here — that map is
    // populated asynchronously by HA's connection layer and may be
    // empty when our bundle's bootstrap reaches this point (the
    // pre-v0.2.2b2 race that caused slow-moving entities like
    // temperatures and locks to never enter our cache).
    //
    // Instead:
    //   1. Subscribe FIRST, with events queued into a local buffer
    //      while we fetch initial state. The buffer guarantees no
    //      event is lost during the await for get_states.
    //   2. Fetch `get_states` — HA's authoritative current snapshot,
    //      same WS command HA's own connection extension uses.
    //   3. Populate the cache from the snapshot.
    //   4. Drain the buffer in FIFO order on top of the snapshot.
    //      Server-side ordering guarantees events in the buffer that
    //      pre-date the snapshot are no-ops (snapshot already
    //      includes them); events that post-date the snapshot bring
    //      the cache forward to the latest known state.
    //   5. Switch the handler to direct mode for the rest of the
    //      session.
    let bufferMode = true;
    const buffer: StateChangedEvent[] = [];

    this.unsubscribe = await this.conn.subscribeEvents<StateChangedEvent>(
      (event) => {
        if (bufferMode) buffer.push(event);
        else this.handleStateChanged(event);
      },
      'state_changed',
    );

    const states = await this.conn.sendMessagePromise<GetStatesEntry[]>({
      type: 'get_states',
    });
    for (const s of states) {
      this.states.set(s.entity_id, {
        state: s.state,
        attributes: s.attributes ?? {},
      });
    }

    // JS is single-threaded — no events can fire between the snapshot
    // application above, this drain loop, and the mode flip below, so
    // we don't need a re-drain or lock.
    for (const event of buffer) this.handleStateChanged(event);
    buffer.length = 0;
    bufferMode = false;
  }

  async stop(): Promise<void> {
    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = null;
    }
    this.states.clear();
    this.listeners.clear();
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
    // Snapshot the old attributes before we mutate the cache — listeners
    // diff old vs new to decide whether to react (e.g. the painter only
    // repaints when smart-icons-specific keys cross the boundary, not on
    // every unrelated state_changed event).
    const oldAttrs = this.states.get(id)?.attributes;
    if (ns == null) {
      this.states.delete(id);
    } else {
      this.states.set(id, {
        state: ns.state,
        attributes: ns.attributes ?? {},
      });
    }
    const newAttrs = ns ? (ns.attributes ?? {}) : undefined;
    for (const cb of this.listeners) cb(id, ns?.state, oldAttrs, newAttrs);
  }
}
