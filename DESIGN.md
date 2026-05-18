# smart-icons — Design Document

> **Status:** draft v0.1 — pre-implementation. Subject to change as we
> prototype. Last revised 2026-05-18.

## 1. Motivation

Home Assistant's default Lovelace cards (`entities`, `tile`, `glance`,
`more-info` header, sidebar) color icons based on the *owning* entity's
domain and state. A `light` is amber when on, grey when off; a `binary_sensor`
of class `motion` is red when triggered, grey otherwise. The user has almost
no control over this mapping, and **no** way to drive an icon's color from a
*different* entity's state.

The existing escape hatches all have the same shape: switch the card to a
templated custom card (`custom:button-card`, `mushroom`, `template-entity-row`)
or inject per-card CSS via `card-mod`. Both bind the rule to the card it
lives in. The same rule, re-stated for every dashboard.

**smart-icons** decouples the rule from the card. Declare once, apply
everywhere that entity is rendered.

The same mechanism also handles **icon glyph swapping** — change
`mdi:home` to `mdi:home-alert` when an alarm trips, or pick a different
weather glyph per condition — using the same rule modes (thresholds,
mapping, template). Color and glyph are independent properties of a single
"decoration" rule; either or both can be set.

## 2. Goals & non-goals

### Goals

- Drive any entity's displayed icon **color** from any other entity's state.
- Drive any entity's icon **glyph** (the `mdi:…` graphic itself) from any
  other entity's state — using the same rule modes as color.
- Work on the **default** Lovelace cards without per-card config.
- Support three rule modes: thresholds, value→decoration mapping, Jinja
  templates. A "decoration" is any combination of color + glyph.
- One-click install via the Integrations panel (no manual resource wiring).
- Persist rules in HA's normal storage so they survive restarts and ride
  along in backups.
- Degrade gracefully — if the addon breaks on a new HA version, icons revert
  to default behavior; nothing else changes.

### Non-goals (for v1)

- Decorating icons in cards that render their own SVGs (mini-graph-card,
  apex-charts-card, custom paths in button-card). These don't go through
  `ha-state-icon`; we don't try to intercept them.
- Arbitrary SVG injection — glyph swap is limited to icon strings the
  existing `<ha-icon>` element can resolve (mdi, hass, plus any custom
  icon packs the user already has installed).
- Animations, transitions, blink-on-alarm effects. Static decoration only in v1.
- Multi-property theming (background, border, badge color). Just the icon.
- Replacing themes — themes set defaults; smart-icons overrides per-entity.

## 3. Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│ HA Backend (Python integration)                                    │
│                                                                    │
│  custom_components/smart_icons/                                    │
│    __init__.py        async_setup_entry, register WS, serve JS    │
│    config_flow.py     trivial "click to install" config flow      │
│    const.py           DOMAIN, STORAGE_KEY, STORAGE_VERSION        │
│    store.py           Store wrapper, in-memory cache, migrations  │
│    websocket_api.py   list / upsert / delete / subscribe / render │
│    frontend.py        registers /smart_icons.js as Lovelace resrc │
│    yaml_loader.py     (v0.2) read smart_icons: from config        │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ websocket
┌──────────────────────────────┴─────────────────────────────────────┐
│ HA Frontend (single JS bundle)                                     │
│                                                                    │
│  src/                                                              │
│    index.ts          bootstrap, wait for hass, wire components    │
│    rule-store.ts     subscribes to WS; exposes reactive snapshot  │
│    state-watcher.ts  subscribes to source entities' state_changed │
│    evaluator.ts      pure: (rule, sourceState) → color | null     │
│    painter.ts        MutationObserver + style.color application   │
│    panel/            <smart-icons-panel> Lit element              │
│    editor/           <smart-icons-rule-editor> reusable form      │
│    dialog-inject.ts  patches entity-registry-settings render()    │
│    compat.ts         HA version detection + feature flags         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Single bundle, served by the integration. No HACS dependency, though we'll
publish a HACS manifest for distribution.

## 4. Rule model

### 4.1 Schema (storage form)

A rule produces a **decoration** — `{ color?, icon? }` — for its `target`
entity. Either field is optional; you can color without changing the glyph,
swap the glyph without changing color, or do both. The same three modes
(thresholds / mapping / template) cover both axes.

```jsonc
{
  "id": "01HXYZ...",               // ULID, server-assigned
  "target": "light.kitchen",       // entity whose icon is decorated
  "source": "sensor.kitchen_temp", // entity driving the decoration (default: target)
  "mode": "thresholds",            // "thresholds" | "mapping" | "template"

  // mode=thresholds — evaluated in order, first match wins; final entry with
  // no comparator is the "else" branch. Each entry may set color, icon, or both.
  "thresholds": [
    { "lt": 18, "color": "#3366ff", "icon": "mdi:snowflake" },
    { "lt": 25, "color": "#33cc66" },
    { "color": "#ff3333", "icon": "mdi:fire" }
  ],

  // mode=mapping — exact string match on source.state; values are decorations.
  "mapping": {
    "movie":  { "color": "#000000", "icon": "mdi:movie-open" },
    "party":  { "color": "#ff00ff", "icon": "mdi:party-popper" },
    "_else":  { "color": "#888888" }
  },

  // mode=template — Jinja, evaluated server-side. May return either a plain
  // color string (back-compat / shorthand) or a JSON object
  // {"color": "...", "icon": "..."}. Literal "inherit" / "unset" / "" /
  // null releases the icon back to defaults.
  "template": "{{ {'color':'#ff0000','icon':'mdi:home-alert'} if is_state('alarm.house','triggered') else 'inherit' }}",

  "enabled": true,
  "priority": 10,                  // tiebreaker when multiple rules hit the same target
  "created": "2026-05-18T15:00:00Z",
  "updated": "2026-05-18T15:00:00Z",
  "source_kind": "ui"              // "ui" | "yaml" — YAML rules are read-only in the UI
}
```

### 4.2 Evaluation semantics

- A rule yields a `{ color?, icon? }` decoration or `null`.
- `color` and `icon` are **independent** — a rule can set just one, just the
  other, or both. Unset fields fall through to HA's defaults (color) or to
  the entity's own configured icon (glyph).
- One rule per `(target, priority)` slot. Multiple rules for the same target
  are allowed but only the highest-priority **enabled** one with a non-null
  evaluation result applies. This lets users layer overrides (alarm > normal).
  When the winning rule sets only `color`, the glyph is **not** affected by
  lower-priority rules — winner takes all, by design, to keep mental model
  simple.
- Color values: any CSS color string (`#rgb`, `#rrggbb`, `rgb(...)`,
  `rgba(...)`, `hsl(...)`, named colors, or a CSS variable `var(--my-var)`).
- Icon values: any string `<ha-icon>` can resolve — typically `mdi:foo`,
  `hass:foo`, or a custom-pack prefix the user has installed.
- The literal `"inherit"`, `"unset"`, `""`, or `null` (in a color or icon
  field, or as a whole decoration) means *release this property* — back to
  HA defaults.
- Threshold comparators: `lt`, `lte`, `gt`, `gte`, `eq`. Numeric coercion on
  source state; if coercion fails the rule yields null (released).
- Mapping: `_else` is the fallback bucket. Missing key + no `_else` → null.
- Template: evaluated server-side via existing `render_template` machinery;
  cached, re-rendered on dependency change (HA already tracks template deps).

### 4.3 Validation (server-side)

- `target` must be a known entity_id format; not required to exist yet
  (allow forward declaration).
- `source` likewise; default = `target`.
- Mode-specific shape checked with voluptuous schemas.
- Color strings validated by a relaxed regex (we don't try to be a CSS parser
  — anything the browser would accept passes).
- Icon strings validated against a `prefix:name` shape; we don't try to
  verify the icon actually exists in any installed pack (the renderer will
  fall back to a placeholder if it's missing, which is the right UX).
- Reject template strings exceeding a sensible length (4 KB).
- At least one of `color` / `icon` must be set in any non-empty decoration;
  an empty `{}` is treated as `null` (released).

## 5. Configuration UX

Three doors into the same store. Door 2 is the source of truth; doors 1 and 3
are convenience.

### 5.1 Door 1 — Inline in the entity settings dialog

When the user opens any entity's settings (cog icon in more-info), an
additional **Smart Icon** section appears below the existing fields. Empty
state shows a single "Add color rule…" button. Populated state shows a
compact summary ("colored by `sensor.kitchen_temp`, 3 thresholds") with
edit/remove buttons.

**Injection mechanics.** HA's `entity-registry-settings` is a LitElement.
We monkey-patch its `render()` to append our editor:

```ts
customElements.whenDefined("entity-registry-settings").then(() => {
  const Cls = customElements.get("entity-registry-settings")!;
  const origRender = Cls.prototype.render;
  Cls.prototype.render = function () {
    const original = origRender.call(this);
    return html`
      ${original}
      <smart-icons-rule-editor
        .hass=${this.hass}
        .entityId=${this.entry?.entity_id}
      ></smart-icons-rule-editor>
    `;
  };
});
```

Constraints:
- `render()` fires many times; the appended element must be stable across
  re-renders (Lit handles that as long as we return the same template
  shape).
- HA frontend uses MWC + their own `ha-*` wrappers. Our editor must use
  those primitives (`ha-textfield`, `ha-select`, `ha-formfield`,
  `ha-color-picker`) or it'll look pasted-on.
- Patch is wrapped in `try/catch`; failure logs once and disables Door 1
  for the session. Door 2 still works.
- We register a compatibility shim per HA major version
  (see [§ 10 Compatibility](#10-compatibility-and-risks)).

### 5.2 Door 2 — Smart Icons panel

A registered sidebar panel (or sub-page under `Settings → Devices &
services`) hosting full rule management:

- Sortable, searchable table: target / source / mode / enabled toggle.
- Inline editor on row expand (same `<smart-icons-rule-editor>` as Door 1).
- Drag-reorder for priority within a target.
- **Live preview pane**: pick an entity, scrub a fake `source.state` value,
  watch a sample `ha-state-icon` re-color in real time.
- Import / export YAML for backup and sharing.
- "Compatibility status" badge: shows HA version, whether dialog injection
  is active, last error from compat layer.

Panel registers via `async_register_built_in_panel` (or the custom-panel
equivalent), pointing at a static URL served by the integration. Element is
a Lit-based SPA — no React, no bundler magic beyond esbuild.

### 5.3 Door 3 — YAML

```yaml
# configuration.yaml (v0.2+)
smart_icons:
  rules:
    - target: light.kitchen
      source: sensor.kitchen_temp
      thresholds:
        - { lt: 18, color: "#3366ff" }
        - { lt: 25, color: "#33cc66" }
        - { color: "#ff3333" }
    - target: media_player.living_room_tv
      template: >
        {{ '#000000' if is_state('input_select.scene','movie') else 'inherit' }}
```

Loaded at startup, merged into the store with `source_kind: "yaml"`. UI
shows them but disables edit/delete (consistent with how HA treats
YAML-defined automations and scripts).

Defer to v0.2 — Doors 1 and 2 cover the common case.

## 6. Persistence

Use `homeassistant.helpers.storage.Store`:

```python
# store.py
from homeassistant.helpers.storage import Store
from .const import DOMAIN, STORAGE_VERSION

STORAGE_KEY = f"{DOMAIN}.rules"

class RuleStore:
    def __init__(self, hass):
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._rules: dict[str, Rule] = {}
        self._listeners: list[Callable] = []

    async def async_load(self) -> None: ...
    async def async_save(self) -> None: ...        # debounced
    def all(self) -> list[Rule]: ...
    def by_target(self, entity_id: str) -> list[Rule]: ...
    async def upsert(self, rule: Rule) -> str: ...
    async def delete(self, rule_id: str) -> None: ...
    def subscribe(self, cb: Callable) -> Callable: ...
```

Backing file: `.storage/smart_icons.rules`. Pure JSON:

```json
{
  "version": 1,
  "minor_version": 1,
  "key": "smart_icons.rules",
  "data": {
    "rules": [ /* Rule objects from § 4.1 */ ]
  }
}
```

Benefits inherited from `Store`:

- Atomic writes, debounced (~10 s) to avoid disk thrash on bulk edits.
- Included automatically in HA backups / snapshots.
- Versioned: we get a `async_migrate_func` hook for schema changes.
- Per-installation (not per-user). Matches HA's model — these are dashboard
  decorations, not user prefs.

### 6.1 Migrations

Bump `STORAGE_VERSION` on breaking schema changes; provide an upgrader:

```python
async def _async_migrate(old_major: int, old_minor: int, old_data: dict) -> dict:
    if old_major < 2:
        # example: rename "threshold" → "thresholds"
        for r in old_data["rules"]:
            if "threshold" in r:
                r["thresholds"] = r.pop("threshold")
    return old_data
```

## 7. Rendering pipeline

The interesting bit.

### 7.1 Element targeting

HA renders entity icons via the `<ha-state-icon>` custom element. It takes
a `stateObj` (the full state object) or just `hass + entityId`. It's used by:

- `hui-entities-card` rows
- `hui-tile-card`
- `hui-glance-card`
- `ha-more-info-content` header
- Sidebar entity items
- Many third-party cards that delegate to it

Internally, `ha-state-icon` derives an mdi name and renders an inner
`<ha-icon icon="mdi:…">`. We get **both** levers from this:

- **Color** lives on the outer `ha-state-icon` (CSS `color` cascades into
  the SVG). Set `style.color`, done.
- **Glyph** lives on the inner `<ha-icon>`'s `icon` attribute. Setting it
  swaps the rendered SVG immediately. The parent may re-derive the icon on
  the next state change, so we re-apply on each mutation.

By patching `ha-state-icon` we hit all of these for free. Cards that bypass
it (custom SVG, image-with-overlay, etc.) are out of scope.

### 7.2 The Painter

```text
┌─────────────────────────────────────────────────────────────────┐
│ RuleStore (cached map: target → Rule[])                         │
└──────────────┬──────────────────────────────────────────────────┘
               │ rule changes
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ StateWatcher                                                    │
│   subscribes to state_changed for ∪{rule.source for all rules} │
│   on change → compute new decoration for every dependent target │
│   emit (target → { color?, icon? }) deltas                      │
└──────────────┬──────────────────────────────────────────────────┘
               │ decoration map
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Painter                                                         │
│   MutationObserver rooted at <home-assistant-main>              │
│   on observed ha-state-icon:                                    │
│     read entityId from .stateObj or attribute                   │
│     look up decoration in current map                           │
│     if .color : el.style.color = color                          │
│     if .icon  : innerHaIcon.setAttribute("icon", icon)          │
│     tag el.dataset.smartIcons = "color"|"icon"|"both"           │
│     else if previously owned: clear style.color and/or          │
│         remove our icon override (revert to derived glyph)      │
│   on decoration map delta: re-walk our tagged element registry  │
└─────────────────────────────────────────────────────────────────┘
```

The inner `<ha-icon>` is a child of `ha-state-icon` and may be re-rendered
when its parent's `stateObj` updates. Our observer's subtree watch catches
those re-renders so we re-apply the override on the same animation frame.

For glyph override specifically, we also remember the entity's *intrinsic*
icon (what `ha-state-icon` would have rendered without us) so that on
release we put exactly that back, not whatever was there a moment ago.

### 7.3 Politeness

Other plugins also set `style.color` on icons and some swap glyphs. We don't
want a paint war.

Rules:

- Before painting, check `element.dataset.smartIconsOwned`. If absent **and**
  the property we're about to set is already non-default
  (`element.style.color` already set, or the inner `<ha-icon>`'s `icon`
  attribute differs from what `stateObj` would derive), **stand down** for
  that property. Log once at debug level. We can still own the *other*
  property if it's free.
- Set `dataset.smartIconsOwned = "color"|"icon"|"both"` when we paint.
- On rule removal or decoration → null, clear what we set: restore
  `style.color = ""` and/or write the cached intrinsic icon back to the
  inner `<ha-icon>`. Then clear the dataset flag.

### 7.4 Performance

- Single `MutationObserver`; subtree observation is cheap when filtered.
- Coalesce mutations into a `requestAnimationFrame` batch.
- Per-icon paint is O(1) lookup + one style write — negligible.
- State subscription scoped to the union of rule sources, not all entities.
- Server-side template evaluation cached by HA's existing template engine,
  re-fired only on dependency change. We do not poll.

### 7.5 Theme & dark-mode interaction

Inline `style.color` beats `--state-icon-color` and friends. That's the
intended behavior — users opting into smart-icons want override. Document
this prominently so theme authors don't file bugs.

If a user wants their rule to *respect* dark mode, they can specify
`var(--my-themed-var)` as the color and the theme stays in charge.

## 8. WebSocket API

All commands under the `smart_icons/` namespace, registered via
`websocket_api.async_register_command`. Schemas validated with voluptuous.

| Type | Purpose | Payload | Response |
| --- | --- | --- | --- |
| `smart_icons/list` | snapshot of all rules | — | `{ rules: Rule[] }` |
| `smart_icons/upsert` | add or update | `{ rule: Rule }` (id optional) | `{ id }` |
| `smart_icons/delete` | remove by id | `{ id }` | `{ success: true }` |
| `smart_icons/subscribe` | push updates | — | stream of `{ type: "added"\|"updated"\|"removed", rule, id }` |
| `smart_icons/render_template` | preview Jinja | `{ template, variables? }` | `{ result, error? }` |
| `smart_icons/version` | compat info | — | `{ integration, ha_version, schema_version }` |

`render_template` reuses HA's existing template machinery; rate-limited
per-connection to avoid editor abuse.

## 9. Component breakdown

### 9.1 Backend (Python) — `custom_components/smart_icons/`

| File | Responsibility |
| --- | --- |
| `__init__.py` | `async_setup_entry`, wires Store + WS + frontend; idempotent setup |
| `manifest.json` | `domain`, `name`, `version`, `dependencies: ["frontend","websocket_api"]`, `iot_class: "calculated"`, `integration_type: "service"` |
| `config_flow.py` | Minimal single-step flow; just "Add" — no inputs needed |
| `const.py` | Constants — `DOMAIN = "smart_icons"`, storage keys, defaults |
| `store.py` | `RuleStore` wrapping `Store`; cache, subscribers, migrations |
| `websocket_api.py` | Five command handlers, voluptuous schemas |
| `frontend.py` | `async_register_static_paths` + `add_extra_js_url`; serves the bundled JS at `/smart_icons_static/smart_icons.js` |
| `rule.py` | `@dataclass(slots=True)` Rule type + validation helpers |

Estimated size: **~400 lines** of Python total, plus boilerplate (manifest,
strings.json, tests). Heavy reuse of HA helpers; little novel logic.

### 9.2 Frontend (TypeScript) — bundled to one JS file

| Module | Responsibility |
| --- | --- |
| `index.ts` | Wait for `<home-assistant>` to exist; bootstrap everything |
| `rule-store.ts` | WS subscribe, expose `{ rules, byTarget(id), subscribe(cb) }` |
| `state-watcher.ts` | Subscribe to relevant `state_changed`; emit color-map deltas |
| `evaluator.ts` | Pure functions: `evaluateThresholds`, `evaluateMapping`. Template mode round-trips via `render_template` WS. |
| `painter.ts` | The `MutationObserver` + politeness layer |
| `panel/smart-icons-panel.ts` | `<smart-icons-panel>` — Lit page for Door 2 |
| `panel/rule-table.ts` | Sortable/searchable rule list |
| `panel/preview-pane.ts` | Live evaluator preview |
| `editor/smart-icons-rule-editor.ts` | The reusable form (used by Doors 1 & 2) |
| `dialog-inject.ts` | Door 1: monkey-patch `entity-registry-settings` |
| `compat.ts` | Detect HA version; gate features; surface status to panel |
| `ha-types.d.ts` | Local type stubs for HA internals we reference |

Estimated size: **~1,500–2,000 lines** of TS, dominated by the panel UI.
Build via `esbuild` → single ESM bundle, ~30–50 KB gzipped.

### 9.3 Repository layout

```text
smart-icons/
├── LICENSE
├── README.md
├── DESIGN.md
├── TODO.md
├── CHANGELOG.md                  (added at first release)
├── hacs.json                     (HACS manifest)
├── custom_components/
│   └── smart_icons/
│       ├── __init__.py
│       ├── manifest.json
│       ├── config_flow.py
│       ├── const.py
│       ├── store.py
│       ├── rule.py
│       ├── websocket_api.py
│       ├── frontend.py
│       ├── strings.json
│       └── translations/en.json
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── esbuild.config.mjs
│   ├── src/                      (see § 9.2)
│   └── dist/                     (built JS, committed for HACS)
├── tests/
│   ├── conftest.py
│   ├── test_store.py
│   ├── test_websocket_api.py
│   └── test_rule_validation.py
└── .github/
    └── workflows/
        ├── ci.yml                (pytest + eslint + tsc + build)
        └── release.yml           (tag → GH release + bundled zip)
```

## 10. Compatibility and risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| HA frontend internals shift between releases (most likely on dialog injection) | High over time | `compat.ts` per-version detection; fail silent; Door 2 always works |
| Other plugins fight us for `style.color` | Medium | Politeness rule (§ 7.3); document interop with card-mod & button-card |
| Themes set `--state-icon-color` and users expect themes to win | Low | Document the precedence; offer `var(--…)` color values as escape hatch |
| Cards that bypass `ha-state-icon` (mini-graph, etc.) | Certain | Out of scope; explicitly named in README |
| Template DoS via expensive Jinja | Low | Reuse HA's existing template throttling; cap template length |
| Rule store corruption | Low | `Store` is atomic; backups cover us; provide an import-from-YAML recovery path |
| Storage growth (someone makes 10k rules) | Low | Soft warning at 500 rules in the panel; no hard limit |

## 11. Roadmap

### v0.1 — proof of life (1–2 weekends)

- [ ] Python skeleton: integration, config flow, Store, WS `list/upsert/delete`
- [ ] Frontend skeleton: RuleStore, StateWatcher, Painter
- [ ] Modes: `thresholds`, `mapping` only (no template yet)
- [ ] Panel (Door 2) — minimal table + add/edit/delete dialog
- [ ] Auto-register frontend resource on setup
- [ ] Dogfood on author's dashboard for a week

### v0.2 — usable for early adopters

- [ ] **Icon glyph swap** alongside color (full decoration model from § 4.1)
- [ ] Door 1 — entity settings dialog injection (with kill-switch)
- [ ] Template mode + live preview pane in panel
- [ ] Politeness layer (don't fight other plugins, per-property)
- [ ] YAML loader (Door 3)
- [ ] HACS manifest, packaging, screenshots
- [ ] Translations: en, plus framework for community PRs

### v0.3+ — polish

- [ ] Drag-reorder priority in panel
- [ ] Import/export YAML
- [ ] "Suggest a rule" wizard (pick target, pick source, pick mode by type)
- [ ] Icon-glyph picker UI (browse mdi by category, search, recents)
- [ ] Optional `opacity` decoration property

## 12. Open questions

1. **Panel placement.** Top-level sidebar entry vs. sub-page under
   `Settings → Devices & services → Smart Icons`? The latter is more
   conventional for a "service" integration; the former is more discoverable.
   Lean: sub-page.
2. **Per-user vs. per-install rules.** HA storage is per-install. Some
   households may want "Alice's dashboard uses these colors, Bob's doesn't."
   Out of scope for v1; could later add an optional `users: [...]` filter
   evaluated client-side.
3. **Color picker UX.** HA ships an `ha-color-picker` for lights (HS-based).
   For arbitrary CSS strings we may need a small custom picker that supports
   hex + named + `var()` input. Probably write our own.
4. **What about icon `opacity`?** Trivial extension once we own `style`.
   Defer to v0.3 unless a v0.1 user asks.
5. **Bundle-as-Lovelace-resource vs. served-from-integration.** Serving from
   the integration sidesteps "did you add the resource?" support load.
   Trade-off: harder to ship via HACS without the Python side. Going with
   integration-served; HACS install gets both halves.
6. **Testing the frontend.** Lit + @open-wc/testing in CI? Or rely on manual
   testing in HA dev container? Manual for v0.1, automated by v0.2.

---

*See [TODO.md](TODO.md) for the working punch list.*
