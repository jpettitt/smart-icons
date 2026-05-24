/**
 * YAML serialization + parsing for Smart Icons rules.
 *
 * Phase 1 of the YAML editing feature — see `docs/yaml-editing.md` for
 * the broader design. This module owns the rule ↔ YAML mapping in both
 * directions:
 *
 *   ruleToYaml(rule)   → gist-friendly YAML for one rule
 *   rulesToYaml(rules) → wrapped in `rules:` for bulk export
 *   yamlToImportable(text) → unvalidated rule dicts ready for upsert,
 *                            plus a single human-readable parse error
 *                            if the YAML failed to parse or didn't
 *                            match the expected top-level shape.
 *
 * The module deliberately does not do semantic validation of rule
 * contents — that's the server's job (voluptuous in `rule.py`). On
 * import, each rule is sent through `smart_icons/upsert` and any
 * shape/content error is surfaced via the existing WS error path.
 *
 * Why drop these fields on export:
 *   id, created, updated      — auto-managed; the server reassigns them
 *   source_kind               — legacy field, no longer meaningful
 *   enabled (when default)    — true is the default; only emit when false
 *   source (when empty)       — empty source means per-target inferred
 *   source_attribute (null)   — null/missing are equivalent
 *   priority (when default)   — 10 is the default
 */

import yaml from 'js-yaml';

import type { Rule } from '../types';

/** Stable key order used for both single-rule and bulk YAML output.
 *  Matches the panel's section grouping: Apply to → React to →
 *  Decoration → Options. Makes copy-pasted YAML diffable and predictable. */
const KEY_ORDER = [
  'targets',
  'source',
  'source_attribute',
  'mode',
  'mapping',
  'thresholds',
  'enabled',
  'priority',
] as const;

type ExportableRule = Partial<Rule>;

/** Drop auto-managed and default-valued fields, then re-key the result
 *  in a stable order so the same rule always serializes to the same
 *  YAML. Ids never appear in exported YAML — they're internal storage
 *  keys. The `replace_all` save path mints fresh ids server-side for
 *  any rule that arrives without one, which is every rule in this
 *  flow. */
function stripForExport(rule: Rule): ExportableRule {
  const stripped: Record<string, unknown> = { ...rule };
  delete stripped.id;
  delete stripped.created;
  delete stripped.updated;
  delete stripped.source_kind;
  if (rule.enabled !== false) delete stripped.enabled;
  if (!rule.source) delete stripped.source;
  if (rule.source_attribute === null || rule.source_attribute === undefined) {
    delete stripped.source_attribute;
  }
  if (rule.priority === 10) delete stripped.priority;

  const ordered: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (key in stripped) ordered[key] = stripped[key];
  }
  return ordered as ExportableRule;
}

const DUMP_OPTS: yaml.DumpOptions = {
  indent: 2,
  lineWidth: 100,
  noRefs: true,
  // sortKeys: false — preserve our explicit order above.
};

/** Serialize a single rule to canonical YAML. Used by the rule
 *  editor's "Show code editor" toggle. Ids stripped. */
export function ruleToYaml(rule: Rule): string {
  return yaml.dump(stripForExport(rule), DUMP_OPTS);
}

/** Serialize a list of rules wrapped under a top-level `rules:` key.
 *  Used by the panel's whole-config code view; the `replace_all` save
 *  path treats the result as the new state of the world. */
export function rulesToYaml(rules: Rule[]): string {
  return yaml.dump(
    { rules: rules.map((r) => stripForExport(r)) },
    DUMP_OPTS,
  );
}

/** Find the [start, end) line ranges of each rule in a YAML document.
 *
 *  Used by the panel's whole-config code view to focus the textarea
 *  on a specific rule when the user clicks an entry in the inline
 *  rule-error list. Works on our canonical block-style output:
 *
 *      rules:
 *        - targets: [...]      ← rule 0 starts here
 *          ...
 *        - targets: [...]      ← rule 1 starts here
 *          ...
 *
 *  Top-level mapping (single rule, no `rules:` wrapper) returns one
 *  range covering the whole document. Returns fewer ranges than rules
 *  when the YAML uses flow style or unusual indentation — the caller
 *  treats a missing range as "non-clickable error" and falls back to
 *  showing the error text without the jump-to behavior. */
export function findRuleLineRanges(
  text: string,
): Array<{ start: number; end: number }> {
  const lines = text.split('\n');
  if (!/^rules:/m.test(text)) {
    return [{ start: 0, end: lines.length }];
  }

  // Canonical output: `  - ` at 2-space indent. Accept 0–4 leading
  // spaces so a paste of the same YAML with mildly different
  // indentation still works.
  const startRe = /^[ ]{0,4}-[ ]/;
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (startRe.test(lines[i])) starts.push(i);
  }

  return starts.map((s, idx) => ({
    start: s,
    end: idx + 1 < starts.length ? starts[idx + 1] : lines.length,
  }));
}

export interface ImportResult {
  /** Rule dicts ready to send to `smart_icons/upsert`. Empty when
   *  parseError is set. Each entry is whatever the YAML parsed to —
   *  the server validates the shape and contents. */
  rules: Array<Partial<Rule>>;
  /** Human-readable parse / shape error message, or null on success. */
  parseError: string | null;
  /** Optional 1-indexed line position for `parseError`. Set when the
   *  parser gave us a `mark` (YAML syntax errors) or when we can pin
   *  the shape error to a specific source line (e.g. the `rules:`
   *  declaration). The panel uses this to make the error clickable
   *  and auto-scroll to the offending line. */
  errorLine?: number;
  /** Optional 1-indexed column alongside `errorLine`. */
  errorColumn?: number;
  /** Optional zero-based rule index for shape errors that name a
   *  specific entry under `rules:` (e.g. "Rule N is not a mapping").
   *  Mutually exclusive with `errorLine` in practice. */
  errorRuleIndex?: number;
}

/** Parse pasted YAML into a list of rule dicts ready for upsert.
 *  Accepts either a single rule (a top-level mapping) or a bulk
 *  payload with a top-level `rules:` sequence. Anything else returns
 *  a clear error — with a location pin when one is available, so the
 *  panel can jump the textarea selection straight to the problem. */
export function yamlToImportable(text: string): ImportResult {
  let doc: unknown;
  try {
    // Don't trim — we want positions reported back to be valid
    // offsets into the original textarea content.
    doc = yaml.load(text);
  } catch (err) {
    return parseFailure(err);
  }

  if (doc === null || doc === undefined) {
    return { rules: [], parseError: 'Empty YAML — paste a rule above.' };
  }

  if (typeof doc !== 'object' || Array.isArray(doc)) {
    return {
      rules: [],
      parseError:
        'YAML must be a single rule (mapping) or a top-level `rules:` list.',
      errorLine: 1,
    };
  }

  // Bulk shape: { rules: [...] }
  if ('rules' in doc) {
    const r = (doc as { rules: unknown }).rules;
    if (!Array.isArray(r)) {
      return {
        rules: [],
        parseError: 'Top-level `rules:` must be a list of rule mappings.',
        errorLine: findFirstMatchingLine(text, /^rules:/),
      };
    }
    // Filter out non-mapping entries with an inline error rather than
    // failing the whole import — the server would reject them anyway.
    const filtered: Array<Partial<Rule>> = [];
    for (let i = 0; i < r.length; i++) {
      const entry = r[i];
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        return {
          rules: [],
          parseError: `Rule ${i + 1} is not a mapping — each entry under \`rules:\` must be a YAML object.`,
          errorRuleIndex: i,
        };
      }
      filtered.push(entry as Partial<Rule>);
    }
    return { rules: filtered, parseError: null };
  }

  // Single rule (top-level mapping that's not the bulk form).
  return { rules: [doc as Partial<Rule>], parseError: null };
}

/** Build an ImportResult from a thrown parser exception. js-yaml's
 *  YAMLException carries a `mark` with zero-based line/column when
 *  the failure is positional; we render that as `Line N, col C: …`
 *  and surface the raw positions so the panel can scroll to them. */
function parseFailure(err: unknown): ImportResult {
  if (err instanceof yaml.YAMLException) {
    const mark = err.mark;
    if (mark) {
      return {
        rules: [],
        parseError: `Line ${mark.line + 1}, col ${mark.column + 1}: ${err.reason}`,
        errorLine: mark.line + 1,
        errorColumn: mark.column + 1,
      };
    }
    return { rules: [], parseError: err.reason ?? err.message };
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return { rules: [], parseError: m };
  }
  return { rules: [], parseError: String(err) };
}

/** Find the 1-indexed line number of the first line in `text` that
 *  matches `re`. Returns undefined when nothing matches. */
function findFirstMatchingLine(text: string, re: RegExp): number | undefined {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return i + 1;
  }
  return undefined;
}
