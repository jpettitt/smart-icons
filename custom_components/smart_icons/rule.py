"""Rule type and validation for Smart Icons.

A rule produces a *decoration* — `{color?, icon?}` — for a target entity,
driven by the state of a source entity. Three modes (thresholds, mapping,
template) are accepted at the storage layer; thresholds and mapping are
fully validated in v0.1, while template strings are accepted but their
runtime evaluation is deferred to v0.2.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import voluptuous as vol
from homeassistant.helpers import config_validation as cv

from .const import (
    MAPPING_ELSE_KEY,
    MAX_TEMPLATE_LENGTH,
    MODE_MAPPING,
    MODE_TEMPLATE,
    MODE_THRESHOLDS,
    SOURCE_KIND_UI,
    VALID_MODES,
    VALID_SOURCE_KINDS,
)

# A decoration field may be:
#  - a non-empty string (color value or icon string)
#  - one of the "release" sentinels: "", "inherit", "unset", None
# We accept all of these at the storage layer; the evaluator interprets
# the sentinels as "fall back to defaults" (see DESIGN.md § 4.2).
_DECORATION_VALUE = vol.Any(str, None)

DECORATION_SCHEMA = vol.Schema(
    {
        vol.Optional("color"): _DECORATION_VALUE,
        vol.Optional("icon"): _DECORATION_VALUE,
    },
    extra=vol.PREVENT_EXTRA,
)

_COMPARATORS = ("lt", "lte", "gt", "gte", "eq")

_THRESHOLD_ENTRY = vol.Schema(
    {
        vol.Optional("lt"): vol.Coerce(float),
        vol.Optional("lte"): vol.Coerce(float),
        vol.Optional("gt"): vol.Coerce(float),
        vol.Optional("gte"): vol.Coerce(float),
        # eq is the only comparator that may be string-typed (string-state
        # comparison) or numeric; coerce-then-fallback handled at eval time.
        vol.Optional("eq"): vol.Any(vol.Coerce(float), str),
        vol.Optional("color"): _DECORATION_VALUE,
        vol.Optional("icon"): _DECORATION_VALUE,
    },
    extra=vol.PREVENT_EXTRA,
)


def _threshold_entry(entry: dict[str, Any]) -> dict[str, Any]:
    """Validate one threshold entry — at most one comparator, plus decoration."""
    validated = _THRESHOLD_ENTRY(entry)
    comparators = [c for c in _COMPARATORS if c in validated]
    if len(comparators) > 1:
        raise vol.Invalid(
            f"threshold entry may have at most one comparator, got {comparators}"
        )
    return validated


def _mapping_dict(mapping: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Validate a mapping dict — keys are strings, values are decorations."""
    if not isinstance(mapping, dict):
        raise vol.Invalid("mapping must be an object")
    return {str(k): DECORATION_SCHEMA(v) for k, v in mapping.items()}


_RULE_BASE_SCHEMA = vol.Schema(
    {
        vol.Required("target"): cv.entity_id,
        vol.Optional("source"): cv.entity_id,
        vol.Required("mode"): vol.In(VALID_MODES),
        vol.Optional("thresholds"): [_threshold_entry],
        vol.Optional("mapping"): _mapping_dict,
        vol.Optional("template"): vol.All(str, vol.Length(max=MAX_TEMPLATE_LENGTH)),
        vol.Optional("enabled", default=True): bool,
        vol.Optional("priority", default=10): int,
        vol.Optional("id"): vol.Any(str, None),
        vol.Optional("created"): vol.Any(str, None),
        vol.Optional("updated"): vol.Any(str, None),
        vol.Optional("source_kind", default=SOURCE_KIND_UI): vol.In(VALID_SOURCE_KINDS),
    }
)


def validate_rule(data: dict[str, Any]) -> dict[str, Any]:
    """Validate a rule dict; return the normalized form. Raises vol.Invalid."""
    validated = _RULE_BASE_SCHEMA(dict(data))

    mode = validated["mode"]
    if mode == MODE_THRESHOLDS:
        if not validated.get("thresholds"):
            raise vol.Invalid("mode=thresholds requires non-empty 'thresholds'")
    elif mode == MODE_MAPPING:
        if not validated.get("mapping"):
            raise vol.Invalid("mode=mapping requires non-empty 'mapping'")
        # _else is a reserved key but optional; ensure no double-underscore weirdness.
        # Empty mappings (after dropping _else) are still valid — just means "release
        # for any non-else value", which is consistent with the release semantics.
    elif mode == MODE_TEMPLATE:
        tpl = validated.get("template")
        if not tpl or not tpl.strip():
            raise vol.Invalid("mode=template requires non-empty 'template'")

    # source defaults to target — done here so the dataclass and downstream
    # consumers see the resolved value without re-deriving each time.
    validated.setdefault("source", validated["target"])

    return validated


@dataclass(slots=True)
class Rule:
    """In-memory representation of a stored rule."""

    target: str
    source: str
    mode: str
    id: str = ""
    enabled: bool = True
    priority: int = 10
    thresholds: list[dict[str, Any]] | None = None
    mapping: dict[str, dict[str, Any]] | None = None
    template: str | None = None
    created: str = ""
    updated: str = ""
    source_kind: str = SOURCE_KIND_UI

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Rule":
        """Build a Rule from an already-validated dict."""
        return cls(
            id=data.get("id") or "",
            target=data["target"],
            source=data.get("source") or data["target"],
            mode=data["mode"],
            enabled=data.get("enabled", True),
            priority=data.get("priority", 10),
            thresholds=data.get("thresholds"),
            mapping=data.get("mapping"),
            template=data.get("template"),
            created=data.get("created") or "",
            updated=data.get("updated") or "",
            source_kind=data.get("source_kind", SOURCE_KIND_UI),
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a JSON-compatible dict; omits unset mode payloads."""
        out: dict[str, Any] = {
            "id": self.id,
            "target": self.target,
            "source": self.source,
            "mode": self.mode,
            "enabled": self.enabled,
            "priority": self.priority,
            "created": self.created,
            "updated": self.updated,
            "source_kind": self.source_kind,
        }
        if self.thresholds is not None:
            out["thresholds"] = self.thresholds
        if self.mapping is not None:
            out["mapping"] = self.mapping
        if self.template is not None:
            out["template"] = self.template
        return out
