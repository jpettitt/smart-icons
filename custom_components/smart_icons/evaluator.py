"""Pure rule-evaluation functions, mirror of frontend/src/evaluator.ts.

Both implementations must stay in sync — backend evaluation runs in the
injector to produce icon + color attributes that flow to HA's frontend
naturally, while the TS evaluator is kept for future panel/preview UI.
A divergence between them would mean what the painter previews and what
the integration actually applies disagree.

Semantics follow DESIGN.md § 4.2:
- thresholds: first matching entry wins; an entry with no comparator is
  the "else" branch; non-numeric source state on a numeric comparator
  skips that entry.
- mapping: exact string match; `_else` is the fallback; missing key with
  no `_else` → None.
- template: storage-only — runtime evaluation is demand-driven
  (see TODO.md). evaluate_rule returns None for template-mode rules.

"Release sentinels" — `""`, `"inherit"`, `"unset"`, `None` — in either
decoration field mean "fall back to defaults"; a decoration that ends up
with both fields released yields None.
"""

from __future__ import annotations

from typing import Any

from .const import (
    MAPPING_ELSE_KEY,
    MODE_MAPPING,
    MODE_THRESHOLDS,
)
from .rule import Rule

_RELEASE_SENTINELS = frozenset({"", "inherit", "unset"})
_COMPARATORS = ("lt", "lte", "gt", "gte", "eq")


def _normalize_field(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str) and value in _RELEASE_SENTINELS:
        return None
    return value


def _normalize_decoration(d: dict[str, Any] | None) -> dict[str, str | None] | None:
    if not d:
        return None
    color = _normalize_field(d.get("color"))
    icon = _normalize_field(d.get("icon"))
    if color is None and icon is None:
        return None
    return {"color": color, "icon": icon}


def _entry_comparator(entry: dict[str, Any]) -> str | None:
    for cmp in _COMPARATORS:
        if cmp in entry:
            return cmp
    return None


def _coerce_numeric(state: str | None) -> float | None:
    if state is None or state == "":
        return None
    try:
        return float(state)
    except (TypeError, ValueError):
        return None


def evaluate_thresholds(
    thresholds: list[dict[str, Any]], source_state: str
) -> dict[str, str | None] | None:
    numeric = _coerce_numeric(source_state)
    for entry in thresholds:
        cmp = _entry_comparator(entry)
        matched = False
        if cmp is None:
            # Final "else" branch always matches.
            matched = True
        elif cmp == "eq":
            eq = entry["eq"]
            if isinstance(eq, (int, float)):
                matched = numeric is not None and numeric == eq
            else:
                matched = source_state == str(eq)
        else:
            # Numeric comparators require numeric state.
            if numeric is None:
                continue
            threshold = entry[cmp]
            if cmp == "lt":
                matched = numeric < threshold
            elif cmp == "lte":
                matched = numeric <= threshold
            elif cmp == "gt":
                matched = numeric > threshold
            elif cmp == "gte":
                matched = numeric >= threshold
        if matched:
            return _normalize_decoration(
                {"color": entry.get("color"), "icon": entry.get("icon")}
            )
    return None


def evaluate_mapping(
    mapping: dict[str, dict[str, Any]], source_state: str
) -> dict[str, str | None] | None:
    if source_state in mapping:
        return _normalize_decoration(mapping[source_state])
    if MAPPING_ELSE_KEY in mapping:
        return _normalize_decoration(mapping[MAPPING_ELSE_KEY])
    return None


def evaluate_rule(
    rule: Rule, source_state: str | None
) -> dict[str, str | None] | None:
    """Return the decoration this rule produces, or None if no match."""
    if not rule.enabled:
        return None
    if source_state is None:
        return None
    if rule.mode == MODE_THRESHOLDS and rule.thresholds:
        return evaluate_thresholds(rule.thresholds, source_state)
    if rule.mode == MODE_MAPPING and rule.mapping:
        return evaluate_mapping(rule.mapping, source_state)
    # Template mode is storage-only — runtime evaluation deferred to
    # demand-driven (see TODO.md). Falls through to None.
    return None


def pick_winner(
    rule_decorations: list[tuple[Rule, dict[str, str | None] | None]],
) -> dict[str, str | None] | None:
    """Choose the highest-priority rule with a non-null decoration.

    Equal priorities: first occurrence wins. Matches the TS evaluator's
    behavior (and matches DESIGN.md's "winner takes all" rule).
    """
    best_priority: float = float("-inf")
    best: dict[str, str | None] | None = None
    for rule, decoration in rule_decorations:
        if decoration is None:
            continue
        if rule.priority > best_priority:
            best_priority = rule.priority
            best = decoration
    return best
