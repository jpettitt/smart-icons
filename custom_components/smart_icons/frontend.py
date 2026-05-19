"""Frontend resource registration.

Serves the bundled JS at `/smart_icons_static/smart_icons.js` and adds it
as a Lovelace `extra_js_url` so every dashboard loads it without per-user
or per-card config. If the bundle file isn't present (e.g. nobody has run
`npm run build` yet in dev), we log a warning and bail — the integration
remains useful for storage/WS even without the frontend.
"""

from __future__ import annotations

import logging
import os

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

URL_BASE = "/smart_icons_static"
BUNDLE_FILENAME = "smart_icons.js"
URL_JS = f"{URL_BASE}/{BUNDLE_FILENAME}"


async def async_register_frontend(hass: HomeAssistant) -> bool:
    """Register the bundle as a static path and Lovelace extra JS.

    Returns True if the bundle was registered, False if the file is missing.
    Idempotent: the underlying HA helpers tolerate the same URL being added
    twice on hot-reload.
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
    _LOGGER.debug("Smart Icons frontend registered at %s", URL_JS)
    return True
