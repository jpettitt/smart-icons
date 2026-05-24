/**
 * Pure rule-evaluation functions: no DOM, no I/O, easy to unit-test.
 *
 * Mirror of `custom_components/smart_icons/evaluator.py`. A divergence
 * between them would mean what the (future) preview UI shows and what
 * the backend injector actually writes disagree.
 *
 * The semantics match DESIGN.md § 4.2:
 *   - thresholds: first matching entry wins; trailing entry with no
 *     comparator is the "else" branch; non-numeric state on a numeric
 *     comparator yields no match for that entry.
 *   - mapping: exact string match on `source.state`; `_else` is the
 *     fallback bucket; missing key + no `_else` → null.
 *
 * (Template mode existed in v0.2 and the v0.3 alpha line but was
 * always inert. Removed entirely in v0.3.0a3.)
 *
 * Per-field merge semantics (v0.3.0a3): `evaluate*` return SPARSE
 * position objects — only fields the matching entry positively
 * addressed appear. `mergeDecorations` layers positions by priority
 * and inflates to the dense {color, icon, background_color} shape.
 *
 * Two kinds of "position":
 *   - positive: a non-empty string value the painter should apply
 *   - release: explicit null / "" / "inherit" / "unset" sentinel —
 *     the rule says "this field should be cleared regardless of what
 *     lower-priority rules contribute."
 *
 * Absence of a field on a rule means "no opinion" and lets lower-
 * priority rules contribute that field.
 */

import type { Decoration, Rule, ThresholdEntry } from './types';

const RELEASE_SENTINELS = new Set(['', 'inherit', 'unset']);
const COMPARATORS = ['lt', 'lte', 'gt', 'gte', 'eq'] as const;
const DECORATION_FIELDS = ['color', 'icon', 'background_color'] as const;

type DecorationField = (typeof DECORATION_FIELDS)[number];

/** Sparse per-field positions a rule takes on a decoration. Only fields
 *  the rule explicitly addresses are present. A value of `null` is an
 *  explicit release (sentinel), distinguished from "field absent."
 *
 *  The merger inflates this to the dense `Decoration` shape the
 *  injector / painter expect; intermediate evaluator returns stay
 *  sparse so the merger can tell "no position" from "release." */
export type DecorationPositions = Partial<Record<DecorationField, string | null>>;

/** Dense decoration emitted by `mergeDecorations`. Same shape as the
 *  v0.2 `Decoration` interface for backward compatibility — every
 *  field is present (null when unaddressed or explicitly released). */
export interface MergedDecoration {
  color: string | null;
  icon: string | null;
  background_color: string | null;
}

function normalizeFieldValue(v: string | null | undefined): string | null {
  if (v == null) return null;
  if (RELEASE_SENTINELS.has(v)) return null;
  return v;
}

/** Build the sparse positions object from a raw decoration dict. Only
 *  keys present in the input become positions; sentinels become null
 *  positions; everything else passes through. */
function normalizeDecoration(
  d: Record<string, unknown> | null | undefined
): DecorationPositions | null {
  if (!d) return null;
  const positions: DecorationPositions = {};
  for (const key of DECORATION_FIELDS) {
    if (!(key in d)) continue;
    positions[key] = normalizeFieldValue(d[key] as string | null | undefined);
  }
  return Object.keys(positions).length > 0 ? positions : null;
}

function entryComparator(t: ThresholdEntry): typeof COMPARATORS[number] | null {
  for (const c of COMPARATORS) {
    if (t[c] !== undefined) return c;
  }
  return null;
}

export function evaluateThresholds(
  thresholds: ThresholdEntry[],
  sourceState: string
): DecorationPositions | null {
  const numericState = Number(sourceState);
  const numericOK = !Number.isNaN(numericState) && sourceState.trim() !== '';

  for (const t of thresholds) {
    const cmp = entryComparator(t);
    let matched = false;

    if (cmp === null) {
      matched = true;
    } else if (cmp === 'eq') {
      const eq = t.eq;
      if (typeof eq === 'number') {
        matched = numericOK && numericState === eq;
      } else {
        matched = sourceState === String(eq);
      }
    } else {
      if (!numericOK) continue;
      switch (cmp) {
        case 'lt':
          matched = numericState < (t.lt as number);
          break;
        case 'lte':
          matched = numericState <= (t.lte as number);
          break;
        case 'gt':
          matched = numericState > (t.gt as number);
          break;
        case 'gte':
          matched = numericState >= (t.gte as number);
          break;
      }
    }

    if (matched) {
      // Pass the entry directly — normalizeDecoration only considers
      // keys that exist on it, so absent decoration fields stay absent
      // (no position) while explicit sentinels become explicit releases.
      return normalizeDecoration(t as Record<string, unknown>);
    }
  }
  return null;
}

export function evaluateMapping(
  mapping: Record<string, Decoration>,
  sourceState: string
): DecorationPositions | null {
  if (Object.prototype.hasOwnProperty.call(mapping, sourceState)) {
    return normalizeDecoration(
      mapping[sourceState] as unknown as Record<string, unknown>
    );
  }
  if (Object.prototype.hasOwnProperty.call(mapping, '_else')) {
    return normalizeDecoration(
      mapping._else as unknown as Record<string, unknown>
    );
  }
  return null;
}

export function evaluateRule(
  rule: Rule,
  sourceState: string | undefined
): DecorationPositions | null {
  if (!rule.enabled) return null;
  if (sourceState == null) return null;

  if (rule.mode === 'thresholds' && rule.thresholds) {
    return evaluateThresholds(rule.thresholds, sourceState);
  }
  if (rule.mode === 'mapping' && rule.mapping) {
    return evaluateMapping(rule.mapping, sourceState);
  }
  return null;
}

/** Layer per-rule positions into a final decoration. Highest-priority
 *  rule that takes a position on a field wins that field; lower-
 *  priority rules fill in fields no higher-priority rule addressed.
 *  Equal priorities: declaration order (first in the input list) wins.
 *
 *  Returns null when no rule positions on anything; otherwise returns
 *  the dense {color, icon, background_color} shape with null in any
 *  unaddressed-or-explicitly-released slot — the painter/injector
 *  treats both equivalently (clear any attribute we'd previously set). */
export function mergeDecorations(
  rules: Rule[],
  positions: (DecorationPositions | null)[]
): MergedDecoration | null {
  // Pair each rule with its index so we can use index as the stable
  // tiebreaker for equal priorities.
  const indexed = rules
    .map((rule, idx) => ({ rule, idx, dec: positions[idx] }))
    .filter((row): row is { rule: Rule; idx: number; dec: DecorationPositions } => row.dec !== null);
  if (indexed.length === 0) return null;
  indexed.sort((a, b) => {
    if (a.rule.priority !== b.rule.priority) return b.rule.priority - a.rule.priority;
    return a.idx - b.idx;
  });

  const merged: Partial<Record<DecorationField, string | null>> = {};
  for (const { dec } of indexed) {
    for (const field of DECORATION_FIELDS) {
      if (field in merged) continue;
      if (field in dec) merged[field] = dec[field] ?? null;
    }
    if (Object.keys(merged).length === DECORATION_FIELDS.length) break;
  }
  if (Object.keys(merged).length === 0) return null;
  return {
    color: merged.color ?? null,
    icon: merged.icon ?? null,
    background_color: merged.background_color ?? null,
  };
}

/** Back-compat alias for v0.2 callers. Same behavior as
 *  mergeDecorations. */
export const pickWinner = mergeDecorations;
