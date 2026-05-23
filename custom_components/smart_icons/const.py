"""Constants for the Smart Icons integration."""

from __future__ import annotations

DOMAIN = "smart_icons"

STORAGE_KEY = f"{DOMAIN}.rules"
STORAGE_VERSION = 1
STORAGE_MINOR_VERSION = 1

WS_LIST = f"{DOMAIN}/list"
WS_UPSERT = f"{DOMAIN}/upsert"
WS_DELETE = f"{DOMAIN}/delete"
WS_REPLACE_ALL = f"{DOMAIN}/replace_all"
WS_SUBSCRIBE = f"{DOMAIN}/subscribe"
WS_VERSION = f"{DOMAIN}/version"
WS_GET_OPTIONS = f"{DOMAIN}/get_options"
WS_UPDATE_OPTIONS = f"{DOMAIN}/update_options"

# Installation-wide options stored alongside rules in the same Store
# doc. Schema is an open dict so we can grow the set without bumping
# STORAGE_VERSION; unknown keys round-trip through the WS layer
# untouched so future-versioned panels stay backward compatible.
OPTION_OUTLINE_ENABLED = "outline_enabled"
DEFAULT_OPTIONS: dict = {OPTION_OUTLINE_ENABLED: True}

# HA bus event fired when admin changes any option via the WS update
# command. Carries the full updated options dict as data. The frontend
# painter subscribes to this so non-admin users still see option
# changes take effect without needing to read our admin-gated WS API.
EVENT_OPTIONS_UPDATED = f"{DOMAIN}_options_updated"

DATA_STORE = "store"
DATA_INJECTOR = "injector"
DATA_UNSUB_WS = "unsub_ws"

MAX_TEMPLATE_LENGTH = 4096

MODE_THRESHOLDS = "thresholds"
MODE_MAPPING = "mapping"
MODE_TEMPLATE = "template"

VALID_MODES = (MODE_THRESHOLDS, MODE_MAPPING, MODE_TEMPLATE)
SOURCE_KIND_UI = "ui"
SOURCE_KIND_YAML = "yaml"
VALID_SOURCE_KINDS = (SOURCE_KIND_UI, SOURCE_KIND_YAML)

MAPPING_ELSE_KEY = "_else"

# State-attribute keys that the injector writes onto target entities.
# `icon` is HA's standard glyph attribute — every ha-state-icon reads it.
# `smart_icons_color` is our namespaced extension that the frontend
# painter reads to apply CSS `color` to the icon host.
ATTR_ICON = "icon"
ATTR_SMART_ICONS_COLOR = "smart_icons_color"

# Sidebar panel registration. URL path is the slug after /<frontend_url_path>.
# The custom element name must match the @customElement('smart-icons-panel')
# in frontend/src/panel/smart-icons-panel.ts.
PANEL_URL_PATH = "smart-icons"
PANEL_ELEMENT_NAME = "smart-icons-panel"
PANEL_BUNDLE_FILENAME = "smart_icons_panel.js"
PANEL_TITLE = "Smart Icons"
PANEL_ICON = "mdi:palette-outline"
