"""Frontend resource registration.

Two bundles ship under `/smart_icons_static/`:

- `smart_icons.js` — the always-on color painter, loaded on every
  Lovelace page via `add_extra_js_url`.
- `smart_icons_panel.js` — the management panel, lazy-loaded only when
  the user navigates to the Smart Icons sidebar entry.

If either bundle is missing the integration logs and continues — the
storage/WS layer still works without the frontend.
"""

from __future__ import annotations

import logging
import os

from homeassistant.components.frontend import (
    add_extra_js_url,
    async_register_built_in_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import (
    PANEL_BUNDLE_FILENAME,
    PANEL_ELEMENT_NAME,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
)

_LOGGER = logging.getLogger(__name__)

URL_BASE = "/smart_icons_static"
BUNDLE_FILENAME = "smart_icons.js"
URL_JS = f"{URL_BASE}/{BUNDLE_FILENAME}"
URL_PANEL_JS = f"{URL_BASE}/{PANEL_BUNDLE_FILENAME}"


async def async_register_frontend(hass: HomeAssistant) -> bool:
    """Register both bundles as static paths and wire them up.

    Returns True if at least the painter bundle was registered.
    Idempotent: the underlying HA helpers tolerate the same URL being
    added twice on hot-reload.
    """
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    bundle_path = os.path.join(static_dir, BUNDLE_FILENAME)

    if not os.path.isfile(bundle_path):
        _LOGGER.warning(
            "Smart Icons frontend bundle not found at %s. "
            "Build it with `cd frontend && npm run build` (see frontend/README.md). "
            "The integration's storage and WebSocket API still work; only the "
            "icon-painting UI is unavailable until the bundle is in place.",
            bundle_path,
        )
        return False

    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, static_dir, cache_headers=False)]
    )
    add_extra_js_url(hass, URL_JS)
    _LOGGER.debug("Smart Icons painter bundle registered at %s", URL_JS)

    # Register the sidebar panel only if its bundle exists. Missing-panel
    # is a softer failure mode than missing-painter — users can still
    # drive the integration via the WS API.
    panel_bundle_path = os.path.join(static_dir, PANEL_BUNDLE_FILENAME)
    if os.path.isfile(panel_bundle_path):
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            frontend_url_path=PANEL_URL_PATH,
            config={
                "_panel_custom": {
                    "name": PANEL_ELEMENT_NAME,
                    "module_url": URL_PANEL_JS,
                    "embed_iframe": False,
                    "trust_external": False,
                }
            },
            # Admin-only: rule management mutates the appearance of every
            # entity across the install. Non-admin users still see the
            # results on their dashboards (the painter reads
            # `smart_icons_color` from each entity's state attributes,
            # which doesn't go through our WS API), they just can't
            # author rules. Matches the admin-gated WS commands.
            require_admin=True,
        )
        _LOGGER.debug("Smart Icons panel registered at /%s", PANEL_URL_PATH)
    else:
        _LOGGER.info(
            "Panel bundle missing at %s; sidebar panel not registered. "
            "The painter still works.",
            panel_bundle_path,
        )

    return True
