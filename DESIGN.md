# smart-icons — Design Document

> **Status:** v0.2.0b2 shipped (beta). v0.1 and v0.2 features are
> implemented and in use; v0.3 work (template-mode evaluation, Door 1
> entity-settings injection, YAML loader) is sketched in § 11 but not
> started. This document mixes design intent with as-built notes —
> § 11 (Roadmap) tracks what's actually done.
>
> Last substantive revision 2026-05-21 (admin-gating of WS + panel).

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
│    __init__.py         async_setup_entry, wire store/injector/WS  │
│    config_flow.py      single-instance "click to install" flow    │
│    const.py            DOMAIN, storage keys, ATTR_* constants     │
│    rule.py             Rule dataclass + voluptuous validation     │
│    store.py            Store wrapper, cache, subscriber fan-out   │
│    evaluator.py        pure rule evaluation (thresholds/mapping)  │
│    injector.py         state-changed subscriber, writes target    │
│                        entities' attributes.icon + smart_icons_color│
│    websocket_api.py    list / upsert / delete / subscribe / version│
│                        (all admin-gated)                          │
│    frontend.py         StaticPathConfig + add_extra_js_url +      │
│                        async_register_built_in_panel (admin-only) │
│    brand/              integration icon (icon.png, icon@2x.png)   │
│    static/             built JS bundles (committed for HACS)      │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ websocket (admin only)
┌──────────────────────────────┴─────────────────────────────────────┐
│ HA Frontend — two bundles                                          │
│                                                                    │
│  smart_icons.js (~3 KB) — loaded on every Lovelace page            │
│    index.ts          bootstrap watcher + painter, no WS calls     │
│    state-watcher.ts  caches all state_changed; exposes attributes │
│    painter.ts        shadow-piercing MutationObserver applies     │
│                      smart_icons_color → style.color              │
│    evaluator.ts      pure functions kept for future preview UI    │
│                                                                    │
│  smart_icons_panel.js (~60 KB) — lazy-loaded by the sidebar panel  │
│    panel/index.ts            element-registration entry point     │
│    panel/smart-icons-panel.ts  table view + Add/Edit/Duplicate/Del│
│    panel/rule-editor.ts      Lit form (Apply to / React to /      │
│                              Decoration / Options sections)       │
│    panel/styles.ts           shared CSS, HA-themed via CSS vars   │
│    rule-store.ts             WS client used only by the panel     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Two bundles, both served by the integration. Painter bundle is WS-free so
non-admin users still see correctly painted icons on their dashboards;
only the panel bundle talks to `smart_icons/*` WS commands.

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
  "source_attribute": null,        // optional attribute on `source`; e.g. "azimuth"
                                    //   to drive off `sun.sun.azimuth` instead of state
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

A registered sidebar panel (Settings → Smart Icons) hosting full rule
management. v0.1 ships the minimum:

- Table: target / source (with `.attribute` suffix when set) / mode /
  enabled toggle / priority / edit + delete buttons.
- `+ Add rule` button opens an `<ha-dialog>`-wrapped
  `<smart-icons-rule-editor>` form.
- The form is grouped into **Apply to** / **React to** / **Decoration** /
  **Options** sections. Enabled toggle lives in the dialog header so
  it's always visible.
- Entity fields use `ha-selector` with an `{ entity: {} }` selector
  config — HA's higher-level dispatcher and the same code path its
  options flows use. Reaching directly for `ha-entity-picker` worked
  rendering-wise but had a CSS click-area bug in the dialog context;
  routing through `ha-selector` sidesteps it because HA handles the
  picker selection internally. Falls back to plain input + datalist
  if the chunk isn't loaded yet.
- Icon fields use `ha-icon-picker` (same `.label` pattern, same
  fallback shape but with an `<ha-icon>` preview swatch).
- Color fields use a native `<input type="color">` swatch next to a
  text input that accepts hex / named colors / `var(--…)`.
- Source-attribute field has a `<datalist>` populated live from
  `hass.states[source].attributes`, with a hint that updates as the
  user types showing `entity.attribute` vs `entity` (state).

Deferred to v0.2+: sortable / searchable table, drag-reorder priority,
live preview pane, YAML import/export, compatibility-status badge.

The panel registers via `async_register_built_in_panel` (custom panel
mode) pointing at `/smart_icons_static/smart_icons_panel.js` — a
separate Lit bundle (~40 KB) lazy-loaded only when the user opens the
panel. The always-on `smart_icons.js` painter bundle stays at ~4.5 KB.

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

### 7.0 Architecture — server-side glyph, client-side color

After validating the §7.6 PoC and then hitting real-world fragility in
the frontend-only painter (Lit's render cycle overwrote our inner
`<ha-icon>` writes on Lovelace view switches), v0.1 lands a split
architecture:

- **Server-side**: the `IconInjector`
  ([`injector.py`](custom_components/smart_icons/injector.py))
  subscribes to `state_changed` for each rule's `source` entity, runs
  the evaluator
  ([`evaluator.py`](custom_components/smart_icons/evaluator.py)),
  and writes the winning decoration onto the matching `target`
  entity's state attributes:
  - `attributes.icon` — HA's native glyph mechanism. Every
    `<ha-state-icon>` reads it without our help. This is the same
    attribute templated entities use for their dynamic icons, so we
    ride a code path HA already supports.
  - `attributes.smart_icons_color` — our namespaced extension that
    carries the desired CSS color. HA has no native attribute the
    frontend honors for icon color, so we need a small painter to
    bridge attribute → `style.color`.

- **Client-side**: the [`Painter`](#72-the-painter-color-only) is now color-only
  and **state-driven**. It walks the DOM, reads each host's
  `stateObj.attributes.smart_icons_color`, and writes `style.color`.
  No rule evaluation, no `RuleStore` dependency in the paint path, no
  DOM races — we're just translating an attribute that's already
  flowing through HA's natural state-change machinery.

The benefits this unlocked:

- **No icon flash on reload.** The state arrives with the right icon
  already in `attributes.icon`; Lovelace's first render is already
  correct.
- **Glyph survives Lovelace remount.** Switching dashboards rebuilds
  every `<ha-state-icon>`, but each fresh one reads the same
  `stateObj.attributes.icon` and renders our value naturally.
- **Works in all HA surfaces.** Mobile apps, voice-display devices,
  and anything else that reads HA state-attribute icons sees our
  decoration too — even though we never ship any code there.
- **Frontend bundle smaller.** 6.7 KB → 4.6 KB. The TS evaluator is
  retained for the future panel UI (live preview of pending rules) but
  is no longer wired into the painter.

What we accept in exchange:

- The Python evaluator must stay in sync with the TS evaluator. Both
  test suites cover the same semantics ([§ 4.2](#42-evaluation-semantics))
  to make a divergence loud.
- Releasing a rule cleans up `smart_icons_color` but leaves the last
  injected `icon` on the target's state until the owning integration
  pushes its own update. Documented; acceptable in v0.1.
- Calling `hass.states.async_set` fires `state_changed`. Automations
  triggered on transitions are unaffected, but ones triggered on raw
  events would see the synthetic update.

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
  swaps the rendered SVG immediately. The parent *may* re-derive the icon
  on the next state change; we re-apply on each mutation. The full
  validation plan is in [§ 7.6](#76-glyph-swap-validation-plan-poc) —
  load-bearing for v0.2.

By patching `ha-state-icon` we hit all of these for free. Cards that bypass
it (custom SVG, image-with-overlay, etc.) are out of scope.

### 7.2 The Painter (color only)

The painter's job in v0.1 is small: read each
`<ha-state-icon>`'s `stateObj.attributes.smart_icons_color` attribute
and apply it as inline `style.color` on the host. That's it. No rule
evaluation, no `RuleStore` dependency in the paint path, no inner-
element mutation. Glyph swap is server-side (see [§ 7.0](#70-architecture--server-side-glyph-client-side-color)).

```text
┌─────────────────────────────────────────────────────────────────┐
│ StateWatcher                                                    │
│   subscribes to state_changed for all entities                 │
│   on every change → painter.repaintAll() (batched, microtask)  │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Painter                                                         │
│   shadow-piercing MutationObserver tree + catch-up scans       │
│   on each known ha-state-icon host:                             │
│     read host.stateObj.attributes.smart_icons_color             │
│     if present : host.style.color = color                       │
│     if absent and previously owned : host.style.color = ""      │
│   tag host.dataset.smartIconsOwned = "color"                    │
└─────────────────────────────────────────────────────────────────┘
```

**Why blanket-repaint on every state change?** A painted host's
decoration only depends on its own `stateObj.attributes.smart_icons_color`
— which only changes via a `state_changed` event for that host's
entity. Per-host evaluation is O(1) and the whole pass is batched into
one microtask, so even on a dashboard with hundreds of icons the
total work is sub-millisecond.

**Why batch with `queueMicrotask` and not `requestAnimationFrame`?**
`requestAnimationFrame` is paused on backgrounded windows and
unreliable in headless test browsers. The visual difference between
"paint next microtask" and "paint next animation frame" for a single
CSS color write is negligible.

**Shadow-root piercing.** Lovelace cards, the main view, and many
`ha-*` components each have their own shadow roots; `MutationObserver`
does not cross shadow boundaries automatically. The painter attaches a
fresh observer on each shadow root it discovers (recursively, on
observed `childList` mutations) so `ha-state-icon` elements created
inside *new* shadow trees — for example after navigating between
dashboards, which fully tears down the previous view — get picked up.
Catch-up scans at 100 / 500 / 2000 ms post-`start()` cover Lovelace
renders that don't fire usable child-list mutations.

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

- One `MutationObserver` per shadow root the painter discovers, with
  `childList: true, subtree: true`. Subtree observation is cheap when
  filtered to ha-state-icon discovery only.
- Repaints batched into a single microtask via `queueMicrotask`. A
  burst of `state_changed` events on a busy dashboard collapses to one
  paint pass.
- Per-icon paint is O(1) attribute read + one style write — negligible.
- The frontend `StateWatcher` subscribes to *all* `state_changed`
  events. v0.1 takes the simplicity over narrowing to per-entity
  subscriptions; if a future profile shows the broadcast handler as
  hot, narrow then.
- Server-side template evaluation (v0.2) will reuse HA's existing
  template engine, cached and re-fired only on dependency change.

### 7.5 Theme & dark-mode interaction

Inline `style.color` beats `--state-icon-color` and friends. That's the
intended behavior — users opting into smart-icons want override. Document
this prominently so theme authors don't file bugs.

If a user wants their rule to *respect* dark mode, they can specify
`var(--my-themed-var)` as the color and the theme stays in charge. In v1
this is a YAML-only path — the UI uses `ha-color-picker` which emits hex
strings. The store and renderer accept any CSS color value regardless of
which door entered it.

### 7.6 Glyph-swap validation plan (PoC)

[§ 7.1](#71-element-targeting) assumes the glyph swap can be implemented by
setting the inner `<ha-icon>`'s `icon` attribute and re-applying on mutations.
This is **load-bearing for the v0.2 glyph-swap feature** — if the parent
`ha-state-icon` immediately re-derives synchronously after our write, the
attribute-level mechanism is unwinnable and we need a different approach.

This section captures the experiment that confirms which case we're in
*before* we write the painter. Run once against a live HA; record the case
and HA version below.

**Result:** **Case A — clean** (HA 2026.5.2 in the dev container, macOS,
2026-05-18). Manual override of the inner `<ha-icon>`'s `icon` attribute
survived a state change on the target entity with **zero** parent-driven
mutations on the observed shadow root. Color override via `style.color`
on the outer host worked as expected. Dashboard navigation tore down the
host element entirely (per-host observer received no events; a fresh host
with the default glyph appeared on return) — this is normal DOM teardown,
not a write-fight, and is handled by the painter rooting its
`MutationObserver` higher per [§ 7.2](#72-the-painter-color-only). Case D and E
ruled out by direct observation; C ruled out by the lack of any sync
re-derive after `setAttribute`.

#### 7.6.1 Setup

1. Open the HA frontend in a browser, pick a visible target entity (a light
   or sensor on the default Lovelace view works), and open a second tab on
   the same HA so we can toggle the entity without losing DevTools focus.
2. Open DevTools → Console. Paste the script below — do not refresh after.
3. We can run against the Docker dev container or any existing HA install;
   the script is read-only-ish (touches one icon, self-cleans on tab close).

#### 7.6.2 Script (~25 lines)

```js
function deepQSA(root, sel) {
  const out = []; const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (n.querySelectorAll) try { out.push(...n.querySelectorAll(sel)); } catch {}
    if (n.shadowRoot) stack.push(n.shadowRoot);
    for (const c of n.children || []) stack.push(c);
  }
  return out;
}

const TARGET_ID = "light.kitchen";  // change to a visible entity
const host = deepQSA(document, "ha-state-icon")
  .find(x => x.stateObj?.entity_id === TARGET_ID);
if (!host) throw new Error(`no ha-state-icon for ${TARGET_ID}`);

const inner = host.shadowRoot.querySelector("ha-icon");
const orig = inner.getAttribute("icon");
console.log("original icon:", orig);

const mo = new MutationObserver(records => {
  for (const r of records) {
    console.log(performance.now().toFixed(1), r.type,
      r.attributeName || "(child)", "→", inner?.getAttribute("icon"));
  }
});
mo.observe(host.shadowRoot, { attributes: true, childList: true, subtree: true });

inner.setAttribute("icon", "mdi:alert-octagon");
console.log("forced override → mdi:alert-octagon. mo.disconnect() to stop.");
window.__smartIconsPoc = { host, inner, orig, mo };
```

#### 7.6.3 Scenarios to drive

1. **T+0 (immediately after paste).** Visual: icon should be the
   alert-octagon. If it visually reverts within a few hundred ms, that's
   case **C**.
2. **Unrelated state change.** Toggle some *other* entity. Our icon should
   not change; console should show no attribute mutations on `icon`.
3. **Target state change.** Toggle the target entity from the other tab.
   Does the parent rewrite `icon`? Within the same tick or async?
4. **Theme flip.** Settings → Profile → toggle dark mode. Does the inner
   icon survive?
5. **Viewport churn.** Scroll the icon off-screen and back. Some cards
   lazy-render and may rebuild the element.
6. **Idle 30s.** Anything fire on its own?

#### 7.6.4 Decision matrix

| Observation | Case | Implication for [§ 7.2](#72-the-painter-color-only) |
| --- | --- | --- |
| Icon persists through all 6 scenarios, zero parent-driven `icon` mutations | **A — clean** | Apply once on element-discovery; observer only needs `childList` on `home-assistant-main` to catch new `ha-state-icon` instances. Cheapest path. |
| Parent rewrites `icon` only during scenarios 3 / 5 (state change or rebuild) | **B — expected** | Current design works as drafted. Painter re-applies in the observer callback, coalesced to one `requestAnimationFrame`. |
| Parent rewrites `icon` *synchronously after our `setAttribute`* in scenario 1 | **C — write-fight** | Attribute-level override is unwinnable. Fallbacks, in order of preference: **C1** monkey-patch `ha-state-icon.prototype` (its render or icon-deriving getter) to pre-empt derivation; **C2** replace the inner `<ha-icon>` with a wrapper that ignores parent writes; **C3** CSS `mask-image` overlay (no attribute touching, but harder to source mdi as SVG at runtime). |
| Parent rebuilds the entire inner `<ha-icon>` element on state change | **D — element churn** | Observer needs `childList` on the shadow root, not just attributes; re-apply after every child mutation. Cache the original `icon` to compute revert on rule removal. Small extension of B. |
| Inner `<ha-icon>` is somewhere other than `host.shadowRoot` (light-DOM, slotted) | **E — wrong tree** | [§ 7.1](#71-element-targeting)'s assumption is wrong. Painter targeting reworked to find the actual glyph element. Cheap fix, but invalidates the [§ 9.2](#92-frontend-typescript--two-bundles) painter sketch. |

#### 7.6.5 Outcomes

- **Case A or B**: keep [§ 7.2](#72-the-painter-color-only) as drafted; v0.2 glyph-swap
  cleared to implement. Update the **Result** line above with the case and
  HA version.
- **Case C**: add a §7.7 documenting the chosen fallback (C1/C2/C3) and
  reasoning; bump v0.2 "Icon glyph swap" complexity in
  [§ 11.2](#v02--multi-target-glob-polish) and re-estimate.
- **Case D**: amend [§ 7.2](#72-the-painter-color-only) painter loop to handle child
  rebuilds; cache intrinsic icon for revert.
- **Case E**: rewrite [§ 7.1](#71-element-targeting) targeting paragraph
  before any painter code is written.

#### 7.6.6 Time-box

- Setup + script paste: 5 min.
- Six scenarios: 15 min.
- Case A or B: write up the **Result** line, done — ~30 min total.
- Case C / D / E: another 1–2 hours characterizing the fallback, then stop
  and re-design before continuing.

## 8. WebSocket API

All commands under the `smart_icons/` namespace, registered via
`websocket_api.async_register_command`. Schemas validated with voluptuous.
**Every command is admin-gated** via `@websocket_api.require_admin`; a
non-admin user gets an `unauthorized` error from each. The painter bundle
does not call the WS API — it reads `smart_icons_color` from each entity's
state attributes directly — so non-admin dashboards still render correctly.

| Type | Purpose | Payload | Response |
| --- | --- | --- | --- |
| `smart_icons/list` | snapshot of all rules | — | `{ rules: Rule[] }` |
| `smart_icons/upsert` | add or update | `{ rule: Rule }` (id optional) | `{ id, rule }` |
| `smart_icons/delete` | remove by id | `{ rule_id }` | `{ success: true }` |
| `smart_icons/subscribe` | push updates | — | stream of `{ type: "added"\|"updated"\|"removed", rule, id }` |
| `smart_icons/version` | compat info | — | `{ integration, ha_version, schema_version }` |

A `smart_icons/render_template` command for live Jinja preview lands in
v0.3 alongside template-mode evaluation.

## 9. Component breakdown

### 9.1 Backend (Python) — `custom_components/smart_icons/`

| File | Responsibility |
| --- | --- |
| `__init__.py` | `async_setup_entry`, wires Store + injector + WS + frontend; idempotent setup |
| `manifest.json` | `domain`, `name`, `version`, `dependencies: ["frontend","websocket_api"]`, `iot_class: "calculated"`, `integration_type: "service"` |
| `config_flow.py` | Minimal single-step flow; just "Add" — no inputs needed |
| `const.py` | Constants — `DOMAIN`, storage keys, `ATTR_ICON`, `ATTR_SMART_ICONS_COLOR`, defaults |
| `store.py` | `RuleStore` wrapping `Store`; cache, subscribers, migrations |
| `rule.py` | `@dataclass(slots=True)` Rule type + validation helpers |
| `evaluator.py` | Pure rule evaluation — `evaluate_thresholds`, `evaluate_mapping`, `evaluate_rule`, `pick_winner`. Mirrors `frontend/src/evaluator.ts` ([§ 7.0](#70-architecture--server-side-glyph-client-side-color)). |
| `injector.py` | `IconInjector` — subscribes to source-entity `state_changed`, evaluates rules, writes `attributes.icon` + `attributes.smart_icons_color` to target via `hass.states.async_set`. |
| `websocket_api.py` | Five command handlers, voluptuous schemas |
| `frontend.py` | `async_register_static_paths` + `add_extra_js_url`; serves the bundled JS at `/smart_icons_static/smart_icons.js` |

Estimated size: **~700 lines** of Python (was ~400 before server-side
injection moved here from the frontend), plus boilerplate and tests.
Heavy reuse of HA helpers; the novel logic is the injector's
rule-source subscription bookkeeping.

### 9.2 Frontend (TypeScript) — two bundles

**Painter bundle (`smart_icons.js`, ~3 KB)** loaded on every Lovelace page
via `add_extra_js_url`. Talks to HA's native state subscription only — no
calls to `smart_icons/*` WS commands, so it works for every authenticated
user regardless of admin status.

| Module | Responsibility |
| --- | --- |
| `index.ts` | Wait for `<home-assistant>`; bootstrap watcher + painter. No WS API calls. |
| `state-watcher.ts` | Subscribe to all `state_changed`; cache the full attribute bag per entity. Exposes `getAttribute(entityId, name)` so the painter avoids racing Lit's stateObj rebind. |
| `painter.ts` | Color-only, state-driven. Shadow-piercing MutationObserver + catch-up scans; reads `smart_icons_color` from the watcher and applies `style.color`. |
| `evaluator.ts` | Pure functions kept for future panel preview. **Not** wired into the painter (server-side injection handles applied evaluation); must stay semantically in sync with `evaluator.py`. |

**Panel bundle (`smart_icons_panel.js`, ~60 KB)** lazy-loaded by HA's
custom-panel loader when the user opens the Smart Icons sidebar entry.
Admin-only — non-admin users never see the entry.

| Module | Responsibility |
| --- | --- |
| `panel/index.ts` | Entry point; side-effect imports register `<smart-icons-panel>` and `<smart-icons-rule-editor>`. |
| `panel/smart-icons-panel.ts` | Sidebar page — rules table with Edit / Duplicate / Delete, action error banner, ha-dialog delete confirmation. Responsive layout via CSS container query. |
| `panel/rule-editor.ts` | Lit form for one rule. Section-grouped (Apply to / React to / Decoration / Options); multi-entity selector + glob list with live "Matches N entities" preview; recorder-backed state autocomplete on mapping cells. |
| `panel/styles.ts` | Shared CSS for the panel and editor, themed with HA's CSS variables. |
| `rule-store.ts` | WS client — `smart_icons/list` + `smart_icons/subscribe`, plus localStorage cache for synchronous panel hydration. Used only by the panel bundle. |

Build via `esbuild` → two ESM bundles. The split keeps the always-on
bundle small enough that loading it on every Lovelace page is invisible.

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
│       ├── evaluator.py
│       ├── injector.py
│       ├── websocket_api.py
│       ├── frontend.py
│       ├── strings.json
│       ├── translations/en.json
│       └── static/
│           ├── smart_icons.js         (painter bundle, committed for HACS)
│           └── smart_icons_panel.js   (panel bundle, lazy-loaded)
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── esbuild.config.mjs
│   ├── web-test-runner.config.mjs
│   ├── src/                      (see § 9.2)
│   ├── test/                     (open-wc/testing suites)
│   └── dist/                     (built JS, committed for HACS)
├── tests/                        (pytest, backend)
│   ├── conftest.py
│   ├── test_store.py
│   ├── test_websocket_api.py
│   └── test_rule_validation.py
├── dev/                          (developer environment, not shipped)
│   ├── docker-compose.yml        (HA + bind-mounted integration)
│   ├── configuration.yaml        (minimal HA config for dev)
│   └── README.md                 (how to run, hot-reload notes)
└── .github/
    └── workflows/
        ├── ci.yml                (pytest + eslint + tsc + wtr + build)
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

### v0.1 — proof of life

*Shipped 2026-05-19.*

- [x] **Dev environment**: `dev/docker-compose.yml` runs HA with this
  repo's `custom_components/smart_icons/` bind-mounted.
- [x] Python skeleton: integration, config flow, Store, WS `list/upsert/delete/subscribe/version`.
- [x] Frontend skeleton: RuleStore, StateWatcher, Painter.
- [x] **Server-side icon injection** ([§ 7.0](#70-architecture--server-side-glyph-client-side-color))
  — evaluator + injector run in Python; glyph swap rides HA's native
  `attributes.icon` mechanism. Frontend painter is color-only.
- [x] Modes: `thresholds`, `mapping` (template accepted at storage
  layer; runtime evaluation deferred to v0.3).
- [x] Auto-register frontend resource on setup.
- [x] Initial-paint polish: `localStorage` rule cache for the panel UI's
  synchronous hydration before the WS round trip.
- [x] Panel (Door 2) — sidebar entry; table + add/edit/delete dialog;
  `ha-selector` + `ha-icon-picker` (with `.label` set) plus
  datalist/preview fallbacks; section-grouped form; source-attribute
  support.
- [x] CI workflow: pytest + tsc + wtr + build on PR.

### v0.2 — multi-target, glob, polish

*Shipped 2026-05-21 (beta).*

- [x] **Icon glyph swap** alongside color (full decoration model from
  § 4.1) — landed in v0.1 via the server-side injector.
- [x] **Multi-target rules** — `targets: [...]` list; auto-migrates legacy
  `target: <entity_id>` on load.
- [x] **Glob target patterns** — `*`, `?`, `[set]` resolved against
  `hass.states` at apply time. Newly-added entities matching an existing
  glob pick up the rule via an `entity_registry_updated` listener; entities
  appearing post-restart (when their owning integration hasn't published
  state yet at integration setup time) are caught via a `state_changed`
  listener filtered for `old_state is None`.
- [x] **Per-target source semantics** — multi-target/glob rules with no
  explicit source default to each target reacting to its own state and
  `source_attribute`.
- [x] **Mapping-state autocomplete** — recorder-backed `<datalist>` of
  states the source entity has been observed in over the last 7 days,
  plus its current state.
- [x] **Admin-gating** — both WS API and panel registration are
  admin-only ([§ 8](#8-websocket-api)). Painter bundle is WS-free so
  non-admin dashboards still render painted icons correctly.
- [x] **Rule editor UX overhaul** — section-grouped layout, sticky save
  bar, inline validation errors, Duplicate action, reorderable threshold
  entries, ha-dialog delete confirmation.
- [x] **Responsive panel** — container-query-driven card-stack layout
  that correctly tracks the HA sidebar (where viewport-based media
  queries miss it).
- [x] **Painter color race fix** — StateWatcher caches the full attribute
  bag synchronously; painter reads from there instead of from
  `host.stateObj`, eliminating the Lit-render-timing race.
- [x] HACS manifest. Integration icon via the brands-proxy convention
  (`custom_components/smart_icons/brand/`).

### v0.3 — template mode + Door 1

- [ ] **Template mode evaluation** — Jinja rendered server-side via HA's
  template machinery; `smart_icons/render_template` WS command for the
  panel's live preview, rate-limited per connection.
- [ ] **Door 1** — entity settings dialog injection with a kill-switch,
  so individual entity pages get a "Smart Icon" section.
- [ ] **YAML loader** (Door 3) — `smart_icons:` block; the supported path
  for CSS variables and named colors the `ha-color-picker` UI doesn't
  expose.
- [ ] Translations — en plus framework for community PRs.

### v0.4+ — polish

- [ ] Drag-reorder priority in panel
- [ ] Import/export YAML
- [ ] "Suggest a rule" wizard (pick target, pick source, pick mode by type)
- [ ] Optional `opacity` decoration property
- [ ] Politeness layer — per-property stand-down when other plugins own
  `style.color`
- [ ] Caching of resolved glob-target sets ([§ 9.1](#91-backend-python--custom_componentssmart_icons)
  pre-check is O(rules × globs × all-entities) per state change; cache + invalidate on rule + registry events).

## 12. Resolved questions

Decisions, kept here as a historical record. Cross-referenced into the
relevant body sections; this list is for context, not authority.

1. **Panel placement.** → **Sidebar entry** ("Smart Icons" with a palette
   icon). Originally planned as a sub-page under `Settings → Devices &
   services`, but HA's integration cards don't offer a clean way to launch
   a custom UI from a config entry without faking an options flow. The
   sidebar entry uses `async_register_built_in_panel` directly and lands
   on the panel in one click. Discoverability handled by the entity-
   settings injection (Door 1, v0.2).
2. **Per-user vs. per-install rules.** → Per-install for v1. Optional
   `users: [...]` filter may be added later if households actually ask.
3. **Color picker UX.** → Use HA's built-in `ha-color-picker` (HS-based) and
   serialize to hex on save. CSS variables (`var(--…)`) and named colors are
   supported by the store + renderer, but in v1 they are entry-only via YAML
   (Door 3, v0.2+). The custom-picker idea is parked.
4. **Icon `opacity` property.** → Deferred to v0.3.
5. **Bundle delivery.** → Served from the integration at
   `/smart_icons_static/smart_icons.js`. HACS install gets both halves.
6. **Frontend testing.** → `@open-wc/testing` (Web Test Runner) in CI from
   **v0.1**, alongside a Docker-based HA dev container that auto-loads the
   integration for integration / smoke testing. See [§ 11.1](#v01--proof-of-life)
   and [§ 9.3](#93-repository-layout).

---

*See [TODO.md](TODO.md) for the working punch list.*
