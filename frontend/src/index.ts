/**
 * Bootstrap entry point.
 *
 * Waits for HA's `home-assistant` element to be ready with a usable
 * `hass.connection`, wires together the state watcher + painter, and
 * parks debug handles on `window.__smartIcons` so the dev console can
 * poke at the live state.
 *
 * This bundle is loaded on *every* Lovelace page via `add_extra_js_url`
 * and runs for every authenticated HA user — admin or not. The
 * critical paint path is WS-free: rule decorations arrive via
 * `smart_icons_color` on each entity's state attributes, written
 * server-side by the injector, delivered through HA's native state
 * subscription. The painter does NOT call any admin-gated WS command —
 * rule management stays behind the panel chunk.
 *
 * The painter does make two non-admin WS calls at bootstrap (see
 * `wireOptions`): a one-shot `smart_icons/get_options` to read the
 * installation-wide outline preference, and a subscription to the
 * `smart_icons_options_updated` bus event so admin toggles take
 * effect live for every viewer. Both endpoints are intentionally
 * accessible to non-admin users — the option surface is small and
 * exposes no admin-sensitive data.
 *
 * The panel UI (Door 2) is loaded lazily from a separate module that
 * registers `<smart-icons-panel>` — landing in chunk 2. That chunk is
 * the only one that talks to the admin-gated `smart_icons/*` commands.
 */

import { isOutlineEnabled, setOutlineEnabled } from './outline';
import { Painter, patchHaStateIcon, type PatchResult } from './painter';
import { StateWatcher } from './state-watcher';
import type { Hass } from './types';

const WS_GET_OPTIONS = 'smart_icons/get_options';
const EVENT_OPTIONS_UPDATED = 'smart_icons_options_updated';
const OPTION_OUTLINE_ENABLED = 'outline_enabled';

interface SmartIconsOptions {
  outline_enabled?: boolean;
  [key: string]: unknown;
}

/** Read installation-wide options once at bootstrap and subscribe to
 *  future changes via the HA bus event. The `get_options` WS command
 *  is *not* admin-gated (see `websocket_api.py`) precisely because
 *  this painter runs for every authenticated user. The
 *  `smart_icons_options_updated` event is similarly bus-level and
 *  visible to all users.
 *
 *  On any error (WS command rejected, event subscribe rejected) the
 *  module-level default (`outline_enabled = true`) stands, matching
 *  the installation default. Painted icons still appear; only the
 *  ability to *disable* outlines mid-session is lost. */
async function wireOptions(hass: Hass, painter: Painter): Promise<void> {
  const apply = (opts: SmartIconsOptions | undefined): void => {
    if (!opts) return;
    if (typeof opts[OPTION_OUTLINE_ENABLED] === 'boolean') {
      const before = isOutlineEnabled();
      setOutlineEnabled(opts[OPTION_OUTLINE_ENABLED] as boolean);
      if (before !== opts[OPTION_OUTLINE_ENABLED]) {
        painter.repaintAll();
      }
    }
  };

  try {
    const result = await hass.connection.sendMessagePromise<{
      options: SmartIconsOptions;
    }>({ type: WS_GET_OPTIONS });
    apply(result.options);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[smart-icons] could not read options (defaulting to outline on)',
      err,
    );
  }

  try {
    await hass.connection.subscribeEvents<{ data: SmartIconsOptions }>(
      (event) => apply(event.data),
      EVENT_OPTIONS_UPDATED,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[smart-icons] could not subscribe to options updates ' +
        '(option toggles will need a page reload)',
      err,
    );
  }
}

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

/** Try to patch `ha-state-icon`'s `stateObj` setter. If the class
 *  isn't registered yet, wait via `customElements.whenDefined` and
 *  try once more. If that still fails, emit a one-line warning naming
 *  the reason — operator can search logs / GitHub issues for it. The
 *  DOM-crawler in painter.start() keeps working, so a failed patch
 *  degrades to the v0.2.2b1 behavior rather than no-paint-at-all. */
function schedulePatch(): void {
  const announceFailure = (reason: string | undefined): void => {
    // eslint-disable-next-line no-console
    console.warn(
      '[smart-icons] could not patch ha-state-icon (' +
        (reason ?? 'unknown') +
        ') — painted icons may not appear in surfaces where the DOM-' +
        'crawler fallback misses mounts (e.g. Lovelace view switches). ' +
        "If you're seeing un-painted icons, this warning is the cause.",
    );
  };

  const first: PatchResult = patchHaStateIcon();
  if (first.ok) return;
  if (first.reason && first.reason.includes('not defined')) {
    customElements
      .whenDefined('ha-state-icon')
      .then(() => {
        const second = patchHaStateIcon();
        if (!second.ok) announceFailure(second.reason);
      })
      .catch(() => {
        // `whenDefined` rejects only if the element name is invalid,
        // which it isn't. Defensive only.
        announceFailure('whenDefined rejected');
      });
  } else {
    announceFailure(first.reason);
  }
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

  // Hook ha-state-icon's stateObj setter so every entity binding —
  // initial mount, view switch, dashboard switch, entity reassign —
  // applies smart_icons_color synchronously inside Lit's property
  // pipeline. Bypasses the DOM-walking / MutationObserver chain that
  // missed view-switch mounts in 0.2.2b1. The crawler stays as a
  // defensive fallback in case HA refactors ha-state-icon's property
  // shape (we'd then see the warning below and degrade gracefully).
  schedulePatch();

  (window as unknown as { __smartIcons: unknown }).__smartIcons = {
    watcher,
    painter,
  };
  // eslint-disable-next-line no-console
  console.log('[smart-icons] painter started');

  await wireOptions(hass, painter);

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
