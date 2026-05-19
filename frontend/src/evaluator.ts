/**
 * Pure rule-evaluation functions: no DOM, no I/O, easy to unit-test.
 *
 * The semantics match DESIGN.md § 4.2:
 *   - thresholds: first matching entry wins; trailing entry with no
 *     comparator is the "else" branch; non-numeric state on a numeric
 *     comparator yields no match for that entry.
 *   - mapping: exact string match on `source.state`; `_else` is the
 *     fallback bucket; missing key + no `_else` → null.
 *   - template: server-side only (v0.2). In v0.1 we return null so
 *     template rules are inert until the WS render command lands.
 *
 * "Release sentinels" — `""`, `"inherit"`, `"unset"`, `null` — in either
 * decoration field mean "fall back to defaults"; if the whole decoration
 * is sentinel-only, the rule yields null.
 */

import type { Decoration, Rule, ThresholdEntry } from './types';

const RELEASE_SENTINELS = new Set(['', 'inherit', 'unset']);
const COMPARATORS = ['lt', 'lte', 'gt', 'gte', 'eq'] as const;

function normalizeField(v: string | null | undefined): string | null {
  if (v == null) return null;
  if (RELEASE_SENTINELS.has(v)) return null;
  return v;
}

function normalizeDecoration(d: Decoration | undefined): Decoration | null {
  if (!d) return null;
  const color = normalizeField(d.color);
  const icon = normalizeField(d.icon);
  if (color == null && icon == null) return null;
  return { color, icon };
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
): Decoration | null {
  const numericState = Number(sourceState);
  const numericOK = !Number.isNaN(numericState) && sourceState.trim() !== '';

  for (const t of thresholds) {
    const cmp = entryComparator(t);
    let matched = false;

    if (cmp === null) {
      // Trailing else branch — always matches.
      matched = true;
    } else if (cmp === 'eq') {
      const eq = t.eq;
      if (typeof eq === 'number') {
        matched = numericOK && numericState === eq;
      } else {
        matched = sourceState === String(eq);
      }
    } else {
      // Numeric comparators require numeric state.
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
      return normalizeDecoration({ color: t.color, icon: t.icon });
    }
  }
  return null;
}

export function evaluateMapping(
  mapping: Record<string, Decoration>,
  sourceState: string
): Decoration | null {
  if (Object.prototype.hasOwnProperty.call(mapping, sourceState)) {
    return normalizeDecoration(mapping[sourceState]);
  }
  if (Object.prototype.hasOwnProperty.call(mapping, '_else')) {
    return normalizeDecoration(mapping._else);
  }
  return null;
}

export function evaluateRule(
  rule: Rule,
  sourceState: string | undefined
): Decoration | null {
  if (!rule.enabled) return null;
  if (sourceState == null) return null;

  if (rule.mode === 'thresholds' && rule.thresholds) {
    return evaluateThresholds(rule.thresholds, sourceState);
  }
  if (rule.mode === 'mapping' && rule.mapping) {
    return evaluateMapping(rule.mapping, sourceState);
  }
  // template mode lands in v0.2 — server-side render via WS command.
  return null;
}

/**
 * Pick the winning decoration when multiple rules target the same entity.
 * Highest priority rule with a non-null decoration takes it all — partial
 * merging (e.g. take color from one rule, icon from another) is intentionally
 * not supported in v1 to keep the mental model simple.
 */
export function pickWinner(
  rules: Rule[],
  decorations: (Decoration | null)[]
): Decoration | null {
  let bestPriority = -Infinity;
  let bestDecoration: Decoration | null = null;
  for (let i = 0; i < rules.length; i++) {
    const dec = decorations[i];
    if (!dec) continue;
    if (rules[i].priority > bestPriority) {
      bestPriority = rules[i].priority;
      bestDecoration = dec;
    }
  }
  return bestDecoration;
}
