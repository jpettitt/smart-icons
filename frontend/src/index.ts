/**
 * Bootstrap entry point.
 *
 * Waits for HA's `home-assistant` element to be ready with a usable
 * `hass.connection`, wires together the rule store + state watcher +
 * painter, and parks debug handles on `window.__smartIcons` so the
 * dev console can poke at the live state.
 *
 * The panel UI (Door 2) is loaded lazily from a separate module that
 * registers `<smart-icons-panel>` — landing in chunk 2.
 */

import { Painter } from './painter';
import { RuleStore } from './rule-store';
import { StateWatcher } from './state-watcher';
import type { Hass } from './types';

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 30_000;


async function waitForHass(): Promise<Hass> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const root = document.querySelector('home-assistant') as
      | (HTMLElement & { hass?: Hass })
      | null;
    if (root?.hass?.connection) return root.hass;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('smart-icons: timed out waiting for home-assistant.hass');
}

async function bootstrap(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[smart-icons] starting');
  const hass = await waitForHass();

  const rules = new RuleStore();
  const watcher = new StateWatcher(hass.connection);
  const painter = new Painter(watcher);

  // Painter is state-driven: any source/target state change can affect
  // a painted host's smart_icons_color attribute, so re-evaluate on each.
  // The backend injector is the authority — we just bridge attribute →
  // CSS color here. A blanket repaintAll() per change is fine (it's
  // rAF-batched and per-host evaluation is O(1)).
  watcher.onChange(() => painter.repaintAll());

  // RuleStore is loaded for the panel UI (chunk 2) and to surface
  // rule snapshots; the painter no longer reads it. Hydrate from
  // localStorage so the panel has rules ready synchronously.
  rules.hydrateFromCache();

  painter.start();

  (window as unknown as { __smartIcons: unknown }).__smartIcons = {
    rules,
    watcher,
    painter,
  };
  // eslint-disable-next-line no-console
  console.log('[smart-icons] painter started');

  // Server sync happens in parallel; the painter will repaint as
  // state_changed events flow in (each one carries the latest
  // smart_icons_color attribute the injector wrote).
  await Promise.all([
    watcher.start(hass.states),
    rules.connect(hass.connection),
  ]);
  // eslint-disable-next-line no-console
  console.log('[smart-icons] ready', { rules: rules.all().length });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[smart-icons] failed to start', err);
});
