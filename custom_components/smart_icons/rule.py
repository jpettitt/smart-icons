"""Rule type and validation for Smart Icons.

A rule produces a *decoration* — `{color?, icon?, background_color?}` —
for a target entity, driven by the state of a source entity. Two modes
are supported: thresholds (numeric ranges) and mapping (exact state →
decoration). The third mode that earlier versions accepted (template,
Jinja-driven decoration) is **removed in v0.3.0a3** — see the v0.3.0a3
CHANGELOG entry. Stored rules with `mode: template` fail validation
on load and are dropped (the store's load path catches `vol.Invalid`
and skips bad rules without aborting setup).

`background_color` is the Mushroom-style colored chip rendered behind
the icon (v0.3+). Independent of `color`: either, both, or neither may
be set in any given decoration.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import voluptuous as vol
from homeassistant.helpers import config_validation as cv

from .const import (
    MAPPING_ELSE_KEY,
    MODE_MAPPING,
    MODE_THRESHOLDS,
    SOURCE_KIND_UI,
    VALID_MODES,
    VALID_SOURCE_KINDS,
)


class BulkReplaceError(Exception):
    """Per-rule validation failures collected during a bulk replace.

    `errors` is a list of `(index, message)` tuples. The index is the
    zero-based position of the failing rule in the input list — the WS
    layer renders this back to the frontend so the editor can mark the
    specific rule(s) that need fixing.
    """

    def __init__(self, errors: list[tuple[int, str]]) -> None:
        self.errors = errors
        super().__init__(
            f"{len(errors)} rule(s) failed validation during replace_all"
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
        # Optional background color — when set, the painter renders a
        # Mushroom-style colored circle behind the icon. Accepts the
        # same value space as `color` (CSS color string, "", or
        # release sentinels).
        vol.Optional("background_color"): _DECORATION_VALUE,
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
        vol.Optional("background_color"): _DECORATION_VALUE,
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


def _target_string(v: Any) -> str:
    """Validate one target entry — either a literal `domain.object_id`
    entity id, or a glob pattern containing `*` / `?` / `[...]` that the
    injector resolves against `hass.states` at apply time."""
    if not isinstance(v, str) or not v:
        raise vol.Invalid("target must be a non-empty string")
    # Globs are allowed anywhere; literals must pass cv.entity_id.
    if any(c in v for c in "*?["):
        return v
    return cv.entity_id(v)


_RULE_BASE_SCHEMA = vol.Schema(
    {
        # Legacy single-target alias — accepted for back-compat with rules
        # stored under v0.1.x. Normalized into `targets` during validation
        # (see validate_rule below).
        vol.Optional("target"): _target_string,
        # Canonical list. Each entry is either an entity_id or a glob.
        vol.Optional("targets"): [_target_string],
        # Empty / missing source has special meaning for multi-target
        # rules: each resolved target acts as its own source ("per-target"
        # evaluation). For single-target rules it defaults to the target.
        vol.Optional("source"): vol.Any(cv.entity_id, ""),
        # When set, the injector reads `state.attributes[source_attribute]`
        # instead of `state.state` as the value fed to the evaluator. Lets
        # rules drive off numeric attributes like `sun.sun.azimuth` or
        # `weather.home.temperature` rather than the entity's main state.
        vol.Optional("source_attribute"): vol.Any(str, None),
        vol.Required("mode"): vol.In(VALID_MODES),
        vol.Optional("thresholds"): [_threshold_entry],
        vol.Optional("mapping"): _mapping_dict,
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

    # Normalize legacy `target` into the canonical `targets` list. After
    # this point, downstream code only deals with `targets`.
    targets = validated.get("targets")
    target_legacy = validated.get("target")
    if not targets and target_legacy:
        targets = [target_legacy]
    if not targets:
        raise vol.Invalid("rule must specify 'targets' (or legacy 'target')")
    # Drop the legacy alias so to_dict doesn't carry it around. Store the
    # normalized list back into the validated dict.
    validated.pop("target", None)
    validated["targets"] = targets

    mode = validated["mode"]
    if mode == MODE_THRESHOLDS:
        if not validated.get("thresholds"):
            raise vol.Invalid("mode=thresholds requires non-empty 'thresholds'")
    elif mode == MODE_MAPPING:
        if not validated.get("mapping"):
            raise vol.Invalid("mode=mapping requires non-empty 'mapping'")

    # Source handling depends on the target shape:
    # - Single literal target with no source given: default to the target
    #   so the "decorate this entity based on its own state" common case
    #   keeps working without extra config.
    # - Multi-target (list or glob) with no source: leave source empty,
    #   which the injector interprets as "each target is its own source".
    #   This is the natural mental model for glob rules — each matched
    #   entity reacts to its own state (and source_attribute).
    # - Source explicitly set: respected as-is, applied uniformly to
    #   every resolved target.
    source = validated.get("source")
    if not source:
        if (
            len(targets) == 1
            and not any(c in targets[0] for c in "*?[")
        ):
            validated["source"] = targets[0]
        else:
            validated["source"] = ""

    # Normalize empty source_attribute to None so the injector's
    # "is attribute set?" check is a clean `if rule.source_attribute:`.
    if "source_attribute" in validated:
        attr = validated["source_attribute"]
        validated["source_attribute"] = attr if attr else None

    return validated


@dataclass(slots=True)
class Rule:
    """In-memory representation of a stored rule.

    `targets` is the canonical list — each entry is either an
    entity_id or a glob the injector resolves at apply time.
    """

    targets: list[str]
    source: str
    mode: str
    id: str = ""
    enabled: bool = True
    priority: int = 10
    thresholds: list[dict[str, Any]] | None = None
    mapping: dict[str, dict[str, Any]] | None = None
    source_attribute: str | None = None
    created: str = ""
    updated: str = ""
    source_kind: str = SOURCE_KIND_UI

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Rule":
        """Build a Rule from an already-validated dict."""
        # validate_rule normalizes target → [target] into `targets`, but
        # tolerate either input here as a defense for direct callers.
        targets = data.get("targets")
        if not targets and "target" in data:
            targets = [data["target"]]
        if not targets:
            raise ValueError("Rule.from_dict requires 'targets' (or legacy 'target')")
        # Source may be empty (per-target evaluation) or a concrete entity
        # id. Don't substitute the first target here — validate_rule has
        # already done the "default for single-target literal" logic, so
        # whatever ends up in `data["source"]` is authoritative.
        return cls(
            id=data.get("id") or "",
            targets=list(targets),
            source=data.get("source", ""),
            source_attribute=data.get("source_attribute") or None,
            mode=data["mode"],
            enabled=data.get("enabled", True),
            priority=data.get("priority", 10),
            thresholds=data.get("thresholds"),
            mapping=data.get("mapping"),
            created=data.get("created") or "",
            updated=data.get("updated") or "",
            source_kind=data.get("source_kind", SOURCE_KIND_UI),
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a JSON-compatible dict; omits unset mode payloads."""
        out: dict[str, Any] = {
            "id": self.id,
            "targets": list(self.targets),
            "source": self.source,
            "mode": self.mode,
            "enabled": self.enabled,
            "priority": self.priority,
            "created": self.created,
            "updated": self.updated,
            "source_kind": self.source_kind,
        }
        if self.source_attribute is not None:
            out["source_attribute"] = self.source_attribute
        if self.thresholds is not None:
            out["thresholds"] = self.thresholds
        if self.mapping is not None:
            out["mapping"] = self.mapping
        return out
