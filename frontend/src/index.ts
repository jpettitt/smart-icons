/**
 * Bootstrap entry point.
 *
 * Waits for HA's `home-assistant` element to be ready with a usable
 * `hass.connection`, wires together the state watcher + painter, and
 * parks debug handles on `window.__smartIcons` so the dev console can
 * poke at the live state.
 *
 * This bundle is loaded on *every* Lovelace page via `add_extra_js_url`
 * and runs for every authenticated HA user — admin or not. It does NOT
 * call the integration's WS API: the painter reads `smart_icons_color`
 * from each entity's state attributes (delivered via HA's native
 * state subscription), and the backend injector writes those attributes
 * server-side. Keeping this bundle WS-free means non-admin users still
 * see correctly painted icons on their dashboards, while rule
 * management stays admin-only behind the panel.
 *
 * The panel UI (Door 2) is loaded lazily from a separate module that
 * registers `<smart-icons-panel>` — landing in chunk 2. That chunk is
 * the only one that talks to `smart_icons/*` WS commands.
 */

import { Painter } from './painter';
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

  const watcher = new StateWatcher(hass.connection);
  const painter = new Painter(watcher);

  // Painter is state-driven: any source/target state change can affect
  // a painted host's smart_icons_color attribute, so re-evaluate on each.
  // The backend injector is the authority — we just bridge attribute →
  // CSS color here. A blanket repaintAll() per change is fine (it's
  // microtask-batched and per-host evaluation is O(1)).
  watcher.onChange(() => painter.repaintAll());

  painter.start();

  (window as unknown as { __smartIcons: unknown }).__smartIcons = {
    watcher,
    painter,
  };
  // eslint-disable-next-line no-console
  console.log('[smart-icons] painter started');

  await watcher.start();
  // watcher.start() is the moment our cache is reliably populated
  // (it fetches `get_states` authoritatively rather than trusting
  // `hass.states` to be ready). painter.start() ran earlier
  // (synchronously) and may have called paintHost on hosts while
  // the cache was still empty — those sit in knownHosts with no
  // color applied. One repaint pass now catches them all in one
  // batch from the freshly-filled cache.
  painter.repaintAll();
  // eslint-disable-next-line no-console
  console.log('[smart-icons] ready');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[smart-icons] failed to start', err);
});
