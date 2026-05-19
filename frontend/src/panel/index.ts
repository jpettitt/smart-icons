/**
 * Entry point for the panel bundle.
 *
 * Imported once when HA mounts `_panel_custom` with this bundle's
 * `module_url`. Importing the panel element registers it via
 * `@customElement('smart-icons-panel')`, which is the name HA expects
 * (see `const.PANEL_ELEMENT_NAME`). The rule-editor element is also
 * registered as a side effect of the panel's own imports.
 */

import './smart-icons-panel.js';
