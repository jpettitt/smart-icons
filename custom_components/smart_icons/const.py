"""Constants for the Smart Icons integration."""

from __future__ import annotations

DOMAIN = "smart_icons"

STORAGE_KEY = f"{DOMAIN}.rules"
STORAGE_VERSION = 1
STORAGE_MINOR_VERSION = 1

WS_LIST = f"{DOMAIN}/list"
WS_UPSERT = f"{DOMAIN}/upsert"
WS_DELETE = f"{DOMAIN}/delete"
WS_SUBSCRIBE = f"{DOMAIN}/subscribe"
WS_VERSION = f"{DOMAIN}/version"

DATA_STORE = "store"
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
