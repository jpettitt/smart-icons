"""Pure rule-evaluation functions, mirror of frontend/src/evaluator.ts.

Both implementations must stay in sync — backend evaluation runs in the
injector to produce icon + color + background attributes that flow to
HA's frontend naturally, while the TS evaluator is kept for future
panel/preview UI. A divergence between them would mean what the painter
previews and what the integration actually applies disagree.

Semantics follow DESIGN.md § 4.2:
- thresholds: first matching entry wins; an entry with no comparator is
  the "else" branch; non-numeric source state on a numeric comparator
  skips that entry.
- mapping: exact string match; `_else` is the fallback; missing key with
  no `_else` → None.

(Template mode existed in v0.2 and the v0.3 alpha line but was always
inert — runtime evaluation was deferred to "demand-driven." It is
removed entirely in v0.3.0a3 since no real user demand surfaced.)

Per-field merging (v0.3.0a3): when multiple rules target the same
entity, fields are layered by priority. The highest-priority rule that
takes a *position* on a field (color, icon, or background_color) wins
that field. Lower-priority rules can fill in fields the winner did not
address — so a high-priority chip-only rule can coexist with a
low-priority color rule without erasing it. This replaces the v0.2
"winner takes all" rule, which surprised users once `background_color`
joined the decoration set.

Two kinds of "position":
- positive: a non-empty string value the painter should apply
- release: explicit null / "" / "inherit" / "unset" sentinel — the
  rule is saying "this field should be cleared, regardless of what
  lower-priority rules contribute"
Absence of a field on a rule means "I have no opinion on this field"
and lets lower-priority rules contribute.
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
_DECORATION_FIELDS = ("color", "icon", "background_color")


def _normalize_field(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str) and value in _RELEASE_SENTINELS:
        return None
    return value


def _normalize_decoration(d: dict[str, Any] | None) -> dict[str, str | None] | None:
    """Return the per-field positions this decoration takes.

    Sparse dict: only fields the input dict mentions appear in the
    output. A field present-but-sentinel maps to None (explicit
    release); a field present-with-value maps to the value; a field
    absent from the input is absent from the output (no position).

    Returns None when the input is empty / takes no positions.
    """
    if not d:
        return None
    positions: dict[str, str | None] = {}
    for key in _DECORATION_FIELDS:
        if key not in d:
            continue
        positions[key] = _normalize_field(d[key])
    return positions or None


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
            # Pass the entry directly — _normalize_decoration only
            # considers keys present in the dict, so absent decoration
            # fields stay absent (no position) and explicit sentinels
            # become explicit releases.
            return _normalize_decoration(entry)
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
    return None


def merge_decorations(
    rule_decorations: list[tuple[Rule, dict[str, str | None] | None]],
) -> dict[str, str | None] | None:
    """Layer per-rule decoration positions into a single final decoration.

    Highest-priority rule that takes a position on a field wins that
    field. Lower-priority rules fill in fields no higher-priority rule
    addressed. Equal priorities: declaration order (first occurrence)
    wins, matching the TS evaluator and the v0.2 tiebreaker.

    Returns a dict with all three decoration fields (None for fields no
    rule positioned on, OR fields where the winning position was a
    sentinel release). The injector treats both the same — pop the
    attribute if it's no longer set. Returns None only when no rule
    positioned on anything, so callers can distinguish "no decoration"
    from "decoration explicitly clears the host."
    """
    indexed = [
        (rule.priority, idx, dec)
        for idx, (rule, dec) in enumerate(rule_decorations)
        if dec is not None
    ]
    if not indexed:
        return None
    # Sort: higher priority first; for ties, earlier declaration index
    # first (negate priority so the natural ascending sort gives us
    # high-priority-first).
    indexed.sort(key=lambda t: (-t[0], t[1]))

    merged: dict[str, str | None] = {}
    for _prio, _idx, dec in indexed:
        for field in _DECORATION_FIELDS:
            if field in merged:
                continue  # already taken by a higher-priority rule
            if field in dec:
                merged[field] = dec[field]
        if len(merged) == len(_DECORATION_FIELDS):
            break  # every field claimed; no need to keep walking

    if not merged:
        # No rule took any field-level position (shouldn't happen
        # because _normalize_decoration returns None when sparse, but
        # defend against future shape changes).
        return None
    # Inflate to the dense shape the injector expects. Fields not
    # claimed by any rule remain None — same as "field released."
    return {field: merged.get(field) for field in _DECORATION_FIELDS}


# Back-compat alias. Old callers can switch incrementally.
pick_winner = merge_decorations
