/**
 * Entry point for the panel bundle.
 *
 * Imported once when HA mounts `_panel_custom` with this bundle's
 * `module_url`. Importing the panel element registers it via
 * `@customElement('smart-icons-panel')`, which is the name HA expects
 * (see `const.PANEL_ELEMENT_NAME`). The rule-editor element is also
 * registered as a side effect of the panel's own imports.
 */

// Build-time banner so we can confirm in DevTools which bundle is
// loaded after a rebuild + container restart. `__BUILD_TIME__` is
// inlined via esbuild --define in package.json; the declare tells
// TypeScript the symbol exists at compile time. Unbundled runs (tests,
// dev server) won't have the define and the symbol is undefined —
// that's fine for the banner; the live bundle is what we care about.
declare const __BUILD_TIME__: string;
// eslint-disable-next-line no-console
console.info(`[smart-icons] panel bundle build ${__BUILD_TIME__}`);

import './smart-icons-panel.js';
