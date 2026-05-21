/**
 * Shared types for the smart-icons frontend bundle.
 *
 * These mirror the storage shapes validated server-side in
 * `custom_components/smart_icons/rule.py`. Keep them in sync — any
 * change there should be reflected here.
 */

export interface Decoration {
  color?: string | null;
  icon?: string | null;
}

export interface ThresholdEntry {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  eq?: number | string;
  color?: string | null;
  icon?: string | null;
}

export type RuleMode = 'thresholds' | 'mapping' | 'template';

export interface Rule {
  id: string;
  /** List of target entities or glob patterns. Each entry is either a
   *  literal `domain.object_id` or a pattern containing `*` / `?` /
   *  `[...]` that the backend injector resolves against `hass.states`
   *  at apply time. v0.1.x rules with a singular `target: string` are
   *  auto-migrated to `targets: [target]` on load. */
  targets: string[];
  source: string;
  /** When set, the injector reads this attribute on `source` rather than
   *  the entity's state. Lets rules drive off numeric attributes like
   *  `sun.sun.azimuth` or `weather.home.temperature`. */
  source_attribute?: string | null;
  mode: RuleMode;
  thresholds?: ThresholdEntry[];
  mapping?: Record<string, Decoration>;
  template?: string;
  enabled: boolean;
  priority: number;
  created: string;
  updated: string;
  source_kind: 'ui' | 'yaml';
}

/**
 * Subset of the home-assistant-js-websocket `Connection` API we use.
 * Typed loosely so we don't take a hard dep on the package — the real
 * `hass.connection` provided by HA satisfies this shape.
 */
export interface HassConnection {
  sendMessagePromise<R>(message: object): Promise<R>;
  subscribeMessage<E>(
    callback: (event: E) => void,
    message: { type: string }
  ): Promise<() => Promise<void>>;
  subscribeEvents<E>(
    callback: (event: E) => void,
    eventType: string
  ): Promise<() => Promise<void>>;
}

export interface HassStates {
  [entityId: string]: { state: string; attributes?: Record<string, unknown> };
}

// Custom attribute the backend injector writes onto target entities to
// carry a color override. HA doesn't have a native color attribute the
// frontend respects, so the painter applies this value as `style.color`
// on the outer `<ha-state-icon>`. Keep in sync with `const.py`.
export const SMART_ICONS_COLOR_ATTR = 'smart_icons_color';

export interface Hass {
  connection: HassConnection;
  states: HassStates;
}

// Convenience marker type for the `<ha-state-icon>` host. Most uses
// only need the entity_id and attribute bag off `stateObj`, so this
// stays minimal — narrow it where you actually depend on more.
export interface IconHost extends HTMLElement {
  stateObj?: {
    entity_id: string;
    state: string;
    attributes?: Record<string, unknown>;
  };
}

export interface SubscribeEvent {
  type: 'added' | 'updated' | 'removed';
  id: string;
  rule: Rule;
}
