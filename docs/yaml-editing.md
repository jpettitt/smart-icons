# YAML editing — feature design

> **Status:** design. Targets v0.2.1 (phase 1) → v0.3 (phases 2 & 3).
> Replaces the previously-roadmapped Door 3 (`configuration.yaml` block).
> Last revised 2026-05-21.

## 1. Motivation

Two user-facing needs, neither well-served by the current panel-only UX:

1. **Sharing.** A user has built up a useful Smart Icons setup — say, a
   lock-status rule with a tasteful color palette, or a sun-azimuth rule
   with hand-picked thresholds. They want to share it: drop it in a gist,
   paste it into a forum post, send it to a friend. Right now the only
   way to communicate a rule is screenshots and prose.
2. **Power-user authoring.** Some rules are awkward in a form — long
   threshold lists, mapping with many states, copy-paste from someone
   else's working YAML. A YAML view-and-edit is the standard escape hatch.

HA's own trajectory points the same way. Automations, scripts, scenes,
helpers, blueprints, dashboards — all of them now have an in-UI "Edit
in YAML" toggle alongside the form editor, and HA has been actively
*reducing* its reliance on `configuration.yaml` for new feature
configuration. New integrations don't ship YAML loaders by default.

Following that pattern means dropping our v0.3 plan for a
`smart_icons:` block in `configuration.yaml` (Door 3 in the legacy
design) and putting all YAML interaction inside the panel.

## 2. Goals & non-goals

### Goals

- **Export a rule as YAML** ready to paste into a gist, forum, README.
- **Import one or many rules from YAML** pasted into the panel.
- **Edit any rule in YAML** as an alternative to the form (matching HA's
  automation-editor pattern: a per-rule toggle, not a global mode).
- **Bulk export of all rules** for a "here's my whole Smart Icons setup"
  snapshot.
- Mirror HA's UX conventions so users coming from the automation /
  script editor don't have to learn a second pattern.

### Non-goals

- **No `configuration.yaml` integration.** Rules continue to live in HA
  storage (`.storage/smart_icons.rules`), reachable only through the
  panel or the WebSocket API. This was previously the "Door 3" plan;
  the user-facing motivation (sharing, power-user authoring) is fully
  satisfied by in-UI YAML.
- **No file-based rule sources.** A "load YAML from a path" flag would
  duplicate the storage / config-YAML schism we're trying to avoid.
- **No diff/merge UI** for bulk import. Imported rules are appended as
  new rules (each gets a fresh ULID); existing rules are not touched
  unless the user explicitly invokes "replace all" (phase 3, gated by
  a confirmation modal).
- **No YAML-to-YAML migration helper.** The schema migration from
  legacy `target` → `targets` is already done server-side at
  storage-validation time; pasted YAML using the old form still works.

## 3. Phases

| Phase | Ships in | What lands | Approx scope |
| --- | --- | --- | --- |
| **1 — Share & receive** | v0.2.1 | "Copy as YAML" per rule (read-only modal); "Import YAML" on panel header; accepts single rule or `rules:` list | ~150 LOC TS, 4 tests |
| **2 — Per-rule YAML edit** | v0.3 | Form ↔ YAML toggle inside the rule editor (HA automation-editor pattern); round-trips back to the form on save | ~250 LOC TS, +4 tests |
| **3 — Bulk export + replace mode** | v0.3 | "Export all rules" → modal with full `rules:` list ready to copy; "Import" gains "Append / Replace all" toggle (replace requires typed confirmation) | ~350 LOC TS, +4 tests |

Each phase is independent: phase 1 can ship in a point release without
needing phases 2 or 3. The library (js-yaml) and the serializer added
in phase 1 are reused by 2 and 3 — no rewrites.

## 4. YAML schema

The serializer produces canonical YAML using `js-yaml`'s default flow,
with key order matching the panel's section grouping: target → source
→ mode → mode-specific payload → optional fields. Auto-managed fields
(`id`, `created`, `updated`, `source_kind`) are dropped on export and
ignored on import. The legacy singular `target` field is accepted on
import but never emitted on export.

### 4.1 Single rule

What the rule editor's "Copy as YAML" produces and what the import
dialog accepts as a one-rule paste:

```yaml
# Each lock decorates itself based on its own state
targets:
  - lock.*
mode: mapping
mapping:
  locked:
    color: green
    icon: mdi:lock-check-outline
  unlocked:
    color: "#ff0000"
    icon: mdi:lock-open-alert-outline
  _else:
    color: magenta
    icon: mdi:lock-open-alert-outline
priority: 10
```

Fields omitted from the example: `enabled` (default `true`), `source`
(per-target inferred), `source_attribute` (not set).

### 4.2 Multi-rule bulk format

What the "Export all rules" button produces (phase 3) and what the
import dialog accepts for bulk import (phase 1):

```yaml
rules:
  - targets: [light.kitchen]
    source: input_select.scene
    mode: mapping
    mapping:
      movie: { color: "#000000", icon: mdi:movie-open }
      _else: { color: "#cccccc" }
  - targets: [lock.*]
    mode: mapping
    mapping:
      locked: { color: green, icon: mdi:lock-check-outline }
      unlocked: { color: "#ff0000", icon: mdi:lock-open-alert-outline }
  - targets: [sun.sun]
    source_attribute: elevation
    mode: thresholds
    thresholds:
      - lte: -6
        color: "#001144"
        icon: mdi:weather-night
      - lte: 0
        color: "#ffaa00"
        icon: mdi:weather-sunset
      - color: "#ffeb3b"
        icon: mdi:weather-sunny
```

The top-level `rules:` key is required for bulk; a paste of a bare
sequence (without the `rules:` wrapper) is rejected with a clear
error pointing to the missing key. A paste of a single rule (no
list, no `rules:` wrapper) is accepted and treated as a one-rule
import.

### 4.3 Comments

YAML comments survive a round-trip *within a single editing session*
(via `js-yaml`'s default loader, which preserves leading-line comments
when re-dumped immediately). They do **not** survive a full
export-edit-import cycle once stored: HA's `Store` is JSON, comments
are dropped on save. That trade-off is acceptable for a sharing tool
— the comment in the gist is the documentation, not data we round-trip.

## 5. UI patterns

### 5.1 Where the buttons live

Following HA conventions:

**Panel header.** The current `+ Add rule` button is joined by an
overflow `⋮` menu containing:

- Import YAML (phase 1)
- Export all as YAML (phase 3)

The overflow menu collapses easily onto small screens and matches
the HA "Helpers" / "Automations" page layout.

**Per-rule actions.** The current row actions are `Edit | Duplicate |
Delete`. Phase 1 adds:

- `⋮` overflow → `Copy as YAML`

The 3-dot menu pattern keeps the row clean and is HA's standard
"secondary actions" surface (the same pattern automation rows use).

**Rule editor.** Phase 2 adds a small toggle in the editor's existing
dialog header — next to the Enabled switch:

- `[ Visual | YAML ]` segmented control

Toggling to `YAML` swaps the section-grouped form for a single
`<textarea>` containing the rule as YAML. Toggling back to `Visual`
parses the YAML, fills the form, and switches views. If the YAML is
invalid, the `Visual` toggle is disabled and the error is shown
above the textarea — identical to HA's automation editor behavior.

This mirrors HA's automation editor exactly enough that a user who
has used "Edit in YAML" anywhere else in HA needs no relearning.

### 5.2 Modals

The "Copy as YAML" and "Import YAML" actions open `ha-dialog`
modals consistent with the existing delete-confirm and rule-editor
dialogs. They share the panel's `--dialog-content-padding: 0`
override and admin-only gating.

**Copy dialog:**

```text
┌───────────────────────────────────────────┐
│ Rule YAML                          [×]    │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ targets:                            │  │
│  │   - lock.*                          │  │
│  │ mode: mapping                       │  │
│  │ ...                                 │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [ Copy to clipboard ]    [ Close ]       │
└───────────────────────────────────────────┘
```

The textarea is read-only and pre-selected on open, so a user who
prefers Cmd-A / Cmd-C over the button works too.

**Import dialog:**

```text
┌───────────────────────────────────────────┐
│ Import YAML                        [×]    │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ <empty>                             │  │
│  │ Paste YAML here...                  │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ⓘ Accepts a single rule or a `rules:`    │
│    list. Comments are allowed.            │
│                                           │
│  [ Cancel ]              [ Import ]       │
└───────────────────────────────────────────┘
```

On Import:

- Parse with `js-yaml` (`safeLoad` equivalent — `SAFE_SCHEMA`).
- For each rule in the result, send through `smart_icons/upsert`.
- Show a summary banner: `Imported 3 rules.` or
  `Imported 2 rules, 1 failed: <error>`.
- Failed rules are listed with their index and the server's
  validation message; user can edit and retry.

### 5.3 Replace mode (phase 3)

Bulk import gains a toggle:

- `[ ● Append ]  [ ○ Replace all existing rules ]`

`Append` is the default. `Replace` requires the user to type the
word `REPLACE` into a confirmation field before the button enables.
Implementation: on submit, delete every existing rule, then upsert
the imported set. A single error halts the operation mid-way; we
don't try to roll back (atomicity would require a backend transaction
not currently in the WS API). The banner reports what actually
happened.

## 6. Implementation

### 6.1 Library

**`js-yaml@^4`** — the standard JS YAML library, MIT-licensed, ~25 KB
minified+gzipped. Lazy-imported only by the panel bundle, never by
the painter bundle. Same trade-off as the rest of the panel chunk:
admins only, loaded on first panel open, doesn't affect non-admin
dashboard performance.

Alternatives considered and rejected:

- **JSON only.** Built-in, no dependency. But JSON is awful for
  human-written content (no comments, no trailing commas, double-
  quote requirements). Defeats the "post to a gist" use case.
- **Tiny YAML subset.** Risky — what subset is "safe"? Users will
  paste real YAML with anchors, comments, multi-doc separators, and
  we'd reject or, worse, mis-parse it.
- **YAML-via-`hass.connection`** (server-side parsing). HA's
  template engine has YAML support, but we'd be making an extra
  round-trip per parse for no gain over a small client-side library.

### 6.2 Serializer

A pure module, `panel/yaml.ts`, exporting:

```ts
function ruleToYaml(rule: Rule): string;
function rulesToYaml(rules: Rule[]): string;  // wraps in `rules:` list
function yamlToRules(text: string): {
  rules: Partial<Rule>[];
  errors: { index: number; message: string }[];
};
```

The serializer drops auto-managed fields, normalizes empty `source`
to omitted, prefers inline-flow for small mappings (e.g.
`{ color: "#000", icon: mdi:movie }`), and orders keys
deterministically so the same rule always produces the same YAML
(stable diffs, copy-paste-friendly).

### 6.3 Backend changes

**None.** All YAML handling is in the panel. The existing WS API
already accepts rule dicts via `smart_icons/upsert`; phase 1 just
sends N upserts for an N-rule import. The server already validates
each rule, so import errors are reported back through the WS error
channel and surfaced in the import dialog.

This is the same reason a `configuration.yaml` loader is no longer
needed — the WS endpoint *is* the integration's "schema-aware
import endpoint."

### 6.4 Phase 2 form ↔ YAML round-trip

The editor maintains *one* canonical state: `working: WorkingState`
(the existing internal form representation, see
[`rule-editor.ts`](../frontend/src/panel/rule-editor.ts)). YAML is
just a view of that state.

- **Visual → YAML:** serialize `working` via the serializer + `js-yaml`.
- **YAML → Visual:** parse, run through `yamlToRules()`, hydrate
  `WorkingState` exactly like the editor does today when receiving a
  `Rule` for edit.

If the user toggles to YAML, edits, then toggles back, the form
re-fills from the parsed YAML. If they toggle to YAML, edit invalidly,
and save: the save button is disabled until either the YAML parses or
they toggle back to the form (which is locked behind a successful
parse).

## 7. Validation and errors

Three validation layers, in order:

1. **YAML syntax** (`js-yaml`) — line number + column from the
   parser's exception. Reported as `Line 4, col 3: …`.
2. **Shape** — top-level must be a mapping (single rule) or have a
   `rules:` key with a sequence value. Anything else is a clear
   error message pointing at the wrong shape.
3. **Semantic** — server-side voluptuous validation, returned via
   the WS error channel. Per-rule errors are listed under the
   imported-rule index (e.g. "Rule 2: rule must specify 'targets'").

For phase 2 (in-editor YAML), the existing editor error surface
(`errorMessage` / `inline-error` divs) is reused. Server-side
errors propagate through the existing `editorError` state.

All three layers' errors are *recoverable* — the user can edit the
YAML and retry without losing their pasted content.

## 8. Testing

### Phase 1

- `ruleToYaml` round-trips all 4 modes (mapping, thresholds,
  template-storage, multi-target with glob) — output matches a golden.
- `yamlToRules` accepts the documented single-rule and `rules:`
  shapes; rejects malformed top-level shape with a clear message.
- Import dialog with a 3-rule paste creates 3 rules and shows the
  success banner.
- Import dialog with one bad rule among three reports 2 imported,
  1 failed, with the failure message visible.

### Phase 2

- Visual → YAML → Visual round-trip on each mode preserves the
  rule exactly (deep-equal on the `WorkingState`).
- Toggling to YAML, making it invalid, attempting to save — Save
  button is disabled, error shown.
- Toggling to Visual with invalid YAML is blocked.

### Phase 3

- "Export all rules" with 5 rules produces a valid `rules:` list
  that re-imports to identical rules (modulo IDs).
- Replace mode without typed `REPLACE` keeps the import button
  disabled.
- Replace mode with typed confirmation deletes existing rules and
  imports new ones; failure mid-way leaves the partial state and
  reports correctly.

## 9. Migration and compatibility

- **No schema change.** The WS API and storage format are unchanged.
  Existing rules continue to work; legacy singular-`target` rules are
  already auto-migrated at load time (rule.py validate_rule).
- **The `source_kind: "yaml"`** field in the schema (intended for
  flagging configuration.yaml-loaded rules as read-only) is no longer
  meaningful in this design. We'll leave the field in storage for
  backwards compatibility — older stored rules may have
  `source_kind: "ui"` set — but the UI treats every rule as editable,
  and we stop emitting `source_kind` in the serializer's output. Field
  is removed from documentation as a planned future-cleanup item.
- **HACS:** no impact. Same bundle, same admin gating.

## 10. Risks and open questions

### Risks

- **`js-yaml` bundle size.** ~25 KB gzipped. Panel bundle goes from
  ~60 KB → ~85 KB. Acceptable — panel is lazy-loaded and admin-only,
  and the alternative (JSON-only sharing) materially hurts the
  feature's usefulness. Re-evaluate if HA ever ships a YAML
  primitive we can borrow.
- **Comments not surviving storage.** Documented in § 4.3. A user
  expecting their commented YAML to round-trip after restart will
  be surprised. Mitigated by the import dialog's hint text and the
  use case orientation (share via gist, not commented-in-place
  editing).
- **Replace-all is destructive.** Phase 3 confirmation gate
  (`type REPLACE`) plus a banner on success that names the count
  deleted should be enough; an "undo last bulk operation" is a
  parking-lot item for v0.3+.

### Open questions

1. **Naming.** "Edit in YAML" matches HA's automation editor exactly.
   Should we use the same string? Probably yes — consistency wins.
2. **Inline vs block YAML output.** For small mappings (e.g. a
   2-entry color+icon pair) the inline form is much more compact
   (`{ color: green, icon: mdi:lock }` vs four lines). Currently
   the serializer prefers inline for short maps and block for longer
   ones. Threshold: maps with ≤2 keys and total length ≤80 chars
   go inline. Revisit if user feedback suggests otherwise.
3. **YAML editor enhancements.** Phase 2 uses a plain `<textarea>`.
   HA's automation editor uses a CodeMirror-backed editor with
   syntax highlighting and tab handling. Worth adding? CodeMirror
   adds another ~80 KB which is more than the YAML library itself.
   Recommend: ship phase 2 with the plain textarea; revisit
   syntax highlighting as a separate v0.3+ polish item if users ask.

## 11. Rollout

- **v0.2.1** — Phase 1 only. Point release; CHANGELOG entry calls out
  "share a rule as a gist."
- **v0.3** — Phases 2 and 3 alongside the planned template-mode work.
  CHANGELOG entry calls out the "Edit in YAML" toggle and bulk
  export.

If phase 1 has unexpected demand for editing pasted YAML before
import, we can pull phase 2 forward into a v0.2.2 — the shape of
phase 1 leaves that door open.
