/**
 * Entry point for the panel bundle.
 *
 * Imported once when HA mounts `_panel_custom` with this bundle's
 * `module_url`. Importing the panel element registers it via
 * `@customElement('smart-icons-panel')`, which is the name HA expects
 * (see `const.PANEL_ELEMENT_NAME`). The rule-editor element is also
 * registered as a side effect of the panel's own imports.
 */

// Version banner so we can confirm in DevTools which bundle is
// loaded after a rebuild + container restart. `__BUILD_VERSION__`
// is inlined from package.json via esbuild --define; the declare
// tells TypeScript the symbol exists at compile time. Reproducible
// across rebuilds — the bundle byte-matches a fresh build off the
// same source, which CI's "verify committed bundles" step relies
// on. The user-facing payoff: the banner tells you the release id
// directly, no version lookup needed.
declare const __BUILD_VERSION__: string;
// eslint-disable-next-line no-console
console.info(`[smart-icons] panel bundle ${__BUILD_VERSION__}`);

import './smart-icons-panel.js';
