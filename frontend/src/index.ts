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
  const painter = new Painter(
    () => rules.all(),
    (id) => watcher.getState(id) ?? hass.states[id]?.state
  );

  await watcher.start(hass.states);
  await rules.connect(hass.connection);

  // Any rule mutation invalidates every painted host — small enough to
  // just repaint everything; the painter coalesces into a single rAF.
  rules.subscribe(() => painter.repaintAll());

  // State changes only matter when at least one rule's source is this entity.
  // Quick filter then repaint; the painter handles per-host evaluation.
  watcher.onChange((entityId) => {
    for (const r of rules.all()) {
      if (r.source === entityId) {
        painter.repaintAll();
        return;
      }
    }
  });

  painter.start();

  (window as unknown as { __smartIcons: unknown }).__smartIcons = {
    rules,
    watcher,
    painter,
  };
  // eslint-disable-next-line no-console
  console.log('[smart-icons] ready', { rules: rules.all().length });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[smart-icons] failed to start', err);
});
