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
  target: string;
  source: string;
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

export interface Hass {
  connection: HassConnection;
  states: HassStates;
}

export interface SubscribeEvent {
  type: 'added' | 'updated' | 'removed';
  id: string;
  rule: Rule;
}
