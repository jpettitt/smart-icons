# Using HA frontend elements in this integration

What we've learned (sometimes the hard way) about using
`ha-*` Web Components in a custom HA integration's panel and
painter bundles. Internal / contributor reference — not
user-facing.

Adapted from the sibling reference in
[`weather-radar-card`](https://github.com/jpettitt/weather-radar-card/blob/main/docs/ha-elements-guide.md);
keep these two docs in sync when an HA element is renamed,
removed, or replaced.

## TL;DR

- **`ha-selector` first**, then `ha-button` / `ha-switch` /
  `ha-icon-picker`, then `ha-input`, then bare HTML with HA
  design tokens. In that preference order, for the reasons
  below.
- **Verify any new `ha-*` element in the Docker testbed
  (`dev/docker-compose.yml`) on a hard-refresh** before
  shipping. The HA element library deprecates and renames
  without warning, and the lazy-load timing for a custom panel
  loading via `_panel_custom` is not identical to HA's own
  bundled UI.
- **The lazy-load failure mode is silent and ugly.** An
  unregistered custom element renders as an invisible
  zero-height block — no console error, no fallback, no
  warning. The symptom is a section header with empty space
  below it. If you see that, the element didn't register.
- **HA design tokens are stable; element names are not.** When
  rolling your own (a small button, a custom layout), target
  `--ha-*` and `--primary-*` CSS custom properties. Don't reach
  for `--mdc-*` — HA is migrating off Material Web Components
  onto WebAwesome and those vars are rotating out.

## The lazy-load problem

HA's frontend lazy-loads its UI element library — the chunk
that registers `ha-button`, `ha-input`, `ha-form`, etc. only
loads when the page hits code that uses them.

Smart Icons has two loading surfaces:

- **Painter bundle** (`smart_icons.js`), loaded on every
  Lovelace page via `add_extra_js_url`. Runs alongside HA's
  main UI, which has typically registered the common ha-*
  elements by the time we paint.
- **Panel bundle** (`smart_icons_panel.js`), loaded lazily when
  the user navigates to the Smart Icons sidebar entry, via the
  `_panel_custom` mechanism in `frontend.py`. **This is the
  surface where the lazy-load timing window matters most** —
  the panel mounts before some ha-* chunks have been triggered.

When a custom element isn't registered yet:

- The browser renders it as an `HTMLUnknownElement`.
- It has no shadow DOM, no `:host` styles, no slot rendering.
- Crucially, **it renders at zero height** — the empty tag has
  no intrinsic size and no content to inflate it.
- Result: a section header rendered above it looks isolated,
  with visually empty space underneath. **No console error.**

The pattern in HA's own source code is a side-effect import at
the top of every file that uses the element:

```ts
// In HA frontend source:
import "../../../../components/ha-button";
```

That import resolves the element's module, which triggers its
`@customElement('ha-button')` decorator, which registers the
tag before the template ever renders. **We can't do this** —
the path is internal to HA's source tree, not exposed via npm.
So we depend on HA's own UI having registered the element at
some earlier point in the page's lifetime.

## Element-by-element status (as of 2026-05)

Empirically verified in `dev/docker-compose.yml`'s testbed
against current HA release. "Panel" = our sidebar panel
loaded via `_panel_custom`. "Painter" = the always-on bundle
that runs on every Lovelace page.

| Element | Panel | Painter | Notes |
|---|---|---|---|
| `ha-selector` | ✅ | n/a | The dispatcher. Use this with `{ entity: {} }`, `{ number: {...} }`, `{ select: {...} }`, etc. — not the per-domain pickers directly. Eagerly loaded by `ha-form`. The rule editor uses `ha-selector` for target entities (`{ entity: { multiple: true } }`). |
| `ha-button` | ✅ | n/a | Registers reliably in the panel. Use `variant="brand"` (primary), `variant="neutral"` (default), or `variant="danger"` (destructive). As of 2026-04-07 it wraps `@home-assistant/webawesome/components/button` — `mwc-button` is dead. |
| `ha-switch` | ✅ | n/a | Works in the panel. Used by the v0.3 outline-toggle option. Standard pattern: `.checked=${value} @change=${handler}`. |
| `ha-icon` | ✅ | ✅ | Works everywhere. |
| `ha-icon-picker` | ✅ | n/a | Works in the panel. Used by the rule editor for icon-name input. Requires `.label` to render correctly. |
| `ha-card` | ✅ | ✅ | Used as the panel's root wrapper. |
| `ha-dialog` | ✅ | n/a | Used by the rule editor and the delete/discard confirm modals. **Note:** modern `ha-dialog` no longer honors `primaryAction` / `secondaryAction` named slots — put dialog buttons in the dialog body inside a `<div class="dialog-actions">` instead. See `frontend/src/panel/smart-icons-panel.ts` for the canonical pattern. |
| `ha-input` | ✅ | n/a | Current. Replaced `ha-textfield` on 2026-04-01. Use `.value=` for the value, `@input=` for change events, `hint=` for help text (not `helper=`). |
| `ha-state-icon` | n/a | ✅ | What the painter targets — applies `style.color` and (when outline-enabled) a native SVG `paint-order: stroke fill` on the inner glyph path. |
| `ha-textfield` | ❌ REMOVED | ❌ | Removed 2026-04-01 in HA commit "Migrate all from ha-textfield to ha-input #30349". Renders invisible. Migrate to `ha-input`. |

If you add a new `ha-*` element to this list, add an entry
here with the date and a one-line "what we confirmed."

## Migration history

Watch HA's frontend release notes for element renames. Recent
ones that affected us or could:

- **2026-04-01:** `ha-textfield` → `ha-input`
  ([HA frontend PR #30349](https://github.com/home-assistant/frontend/pull/30349)).
  Property rename: `helper` → `hint`. We picked this up during
  the v0.3.0a2 rule-editor conversion (from bare `<input>`
  straight to `ha-input` — we never used `ha-textfield`
  because of an earlier lazy-load workaround that has since
  been overtaken by the removal).
- **2026-04-07:** `ha-button` reimplemented on top of
  `@home-assistant/webawesome` (was `mwc-button`). Same tag
  name and event surface; CSS custom property surface shifted
  (`--mdc-*` → `--wa-*` / `--ha-*`). No code change needed
  for consumers, but rolled-our-own CSS targeting `--mdc-*`
  will rot.
- **2026-04-07:** `ha-fab` removed in favour of `ha-button`.
  We don't use `ha-fab`, but worth knowing.
- **Earlier (pre-2026):** `mwc-button` deprecated and
  unregistered. We caught one instance during the v0.2 series
  rebuild — renders as an invisible unknown element. Always
  `ha-button`, never `mwc-button`.

## When to use what

Decision tree for a new piece of panel UI:

1. **Is it a data field bound to a config schema?** →
   `ha-selector` with the appropriate selector config. This
   is HA's highest-level dispatcher and routes to the right
   widget per HA version. Used throughout our rule editor for
   target entities, source entities, and threshold comparator
   dropdowns.

   ```ts
   <ha-selector
     .hass=${this.hass}
     .selector=${{ entity: { multiple: true } }}
     .value=${this.working.targetEntities}
     .label=${'Target entities'}
     @value-changed=${(e: CustomEvent) => this.onTargetsChanged(e.detail.value)}
   ></ha-selector>
   ```

   Pickers (including `ha-selector`) **require a `.label`
   property** to render their floating-label layout. Without
   it the input area collapses to zero height even when the
   element IS loaded.

2. **Is it a free-form text or number input not driven by a
   schema?** → `ha-input` with appropriate `type=`. Provides
   HA-native styling, hint text, validation.

   ```ts
   <ha-input
     label="Priority"
     type="number"
     .value=${String(this.working.priority)}
     @input=${(e: Event) => this.patch({ priority: Number((e.target as HTMLInputElement).value) })}
     hint="Higher priority rules win when multiple rules target the same entity"
   ></ha-input>
   ```

3. **Is it a toggle, button, icon, or icon-picker?** →
   `ha-switch`, `ha-button`, `ha-icon`, `ha-icon-picker`. All
   confirmed loading reliably in the panel context (see table
   above).

4. **Is it a custom layout no `ha-*` element fits?** → bare
   HTML styled with HA design tokens. Documented exceptions in
   our codebase:

   - `<input type="color">` — the swatch picker in the rule
     editor. HA has no first-class hex color picker; native
     `<input type="color">` is the most reliable cross-version
     solution.
   - `<textarea>` for the per-rule YAML editor and the
     whole-config YAML editor. HA has `ha-code-editor` but it
     requires Ace/Monaco wiring that's heavier than warranted
     here. Plain textarea + HA design tokens is the right
     trade-off.
   - `<button class="text-toggle">` — the "Show code editor" /
     "Show visual editor" toggle. A text-link affordance, not
     a primary action.
   - `<button class="action-error-dismiss">` — the "×"
     dismiss on the action-error banner. An icon-button-style
     affordance.

   In every such case, add a comment naming this guide and
   pointing at the specific decision-tree branch (item 4).

5. **None of the above and you need HA visual consistency?**
   → roll your own Lit component styled with the HA design
   tokens listed below. Document the choice with a comment
   naming the `ha-*` element you considered and why it wasn't
   right.

## HA design tokens to target

When styling your own elements to match HA's look, prefer
these custom properties. They survive the mwc→webawesome
migration; the `--mdc-*` variants do not.

**Color:**

- `--primary-color` — accent / primary button background
- `--text-primary-color` — foreground on primary background
- `--primary-text-color` — body text on card background
- `--secondary-text-color` — labels, hints, captions
- `--divider-color` — separators
- `--error-color`, `--warning-color`, `--success-color`
- `--card-background-color` / `--ha-card-background` —
  card surface

**Spacing:**

- `--ha-space-1` through `--ha-space-12` — 4 px multiples
  (1 = 4 px, 2 = 8 px, 4 = 16 px, etc.)

**Typography:**

- `--ha-font-size-xs` / `-s` / `-m` / `-l` / `-xl`
- `--ha-font-weight-medium` / `-bold`

**Shape:**

- `--ha-border-radius-pill` — full-pill (used by `ha-button`)
- `--ha-card-border-radius` — card corner radius (12 px typical)
- `--ha-button-border-radius`, `--ha-button-height` — button-specific

Find the canonical list by grepping HA's frontend source for
`--ha-` in `src/resources/`.

## Defensive patterns

If you must use an `ha-*` element you're not sure is loaded
in the panel context, two options:

### `whenDefined` gate

```ts
override connectedCallback(): void {
  super.connectedCallback();
  for (const tag of ['ha-icon-picker', 'ha-selector']) {
    if (!customElements.get(tag)) {
      void customElements
        .whenDefined(tag)
        .then(() => this.requestUpdate())
        .catch(() => {
          /* never loaded — stay on plain-input fallback */
        });
    }
  }
}
```

Render a plain-input fallback in the template until the
element registers, then re-render. Doubles your template
surface but is the most robust pattern. Used by the rule
editor for `ha-icon-picker` and `ha-selector` —
[see `frontend/src/panel/rule-editor.ts`](../frontend/src/panel/rule-editor.ts)
`connectedCallback`. Use sparingly — only when the empirical
test (testbed + hard-refresh) shows the element doesn't
register reliably.

### Conditional render

```ts
${customElements.get('ha-some-element')
  ? html`<ha-some-element ...></ha-some-element>`
  : html`<input ... />`}
```

One-shot check at render time. Doesn't re-render when the
element later registers, so the user sees the fallback until
the next render is triggered for some other reason. Use only
when you're sure something else will trigger a re-render
shortly.

## Verifying a new element before shipping

A 90-second test in the local testbed catches most lazy-load
failures:

1. `cd frontend && npm run build` (rebuild the bundle)
2. The `dev/docker-compose.yml` bind-mounts the integration,
   so the new bundle is served on next HA reload. If the
   container is already running, restart HA from the
   developer-tools UI; otherwise `cd dev && docker compose up
   -d`.
3. Open http://localhost:8123 in a clean browser tab —
   **fresh page load matters; cached state hides the lazy-load
   timing window**
4. Navigate to **Smart Icons** in the sidebar
5. Hard-refresh (Cmd-Shift-R / Ctrl-Shift-F5) the panel
6. For a panel element: click **+ Add rule** to open the rule
   editor, then exercise the form section containing your new
   element on *first paint*. Don't navigate away and back —
   that may trigger a re-render that hides a lazy-load
   timing bug.
7. Open DevTools console (F12). Look for "unknown element"
   warnings, property mismatches, or zero-height container
   complaints.

If the element renders styled with no errors → safe.
If you see empty space where the element should be → it
didn't register. Pick a different element, roll your own, or
add a defensive pattern.

## Checking whether an HA element still exists

Before adding a new `ha-foo` to a template:

```bash
gh api repos/home-assistant/frontend/contents/src/components/ha-foo.ts \
  --jq '.content' | base64 -d | head -30
```

If you get `Not Found`, look for it under
`src/components/<subdir>/` or check recent commits for
"Migrate" / "Remove" in the message:

```bash
gh api 'repos/home-assistant/frontend/commits?path=src/components/ha-foo.ts&per_page=2' \
  --jq '.[] | {date: .commit.author.date, message: (.commit.message | split("\n")[0])}'
```

The replacement element is usually named in the commit
message that removed the original.

## When in doubt, ask: "what does HA actually expose in the user's installed version?"

This is from the project's [AGENTS.md](../AGENTS.md), repeated
here because it keeps mattering. **HA frontend changes between
releases.** Documented patterns and community examples
sometimes reference APIs that no longer exist. When something
doesn't work the way the docs imply, grep the installed
`hass_frontend/frontend_latest/*.js` in the user's HA Docker
container (`docker exec smart-icons-ha sh -c '...'`) for the
element name. Confirm its current shape *first*, then code
against it.

The 30-second grep beats three rounds of broken UI in the
browser.

## When this doc was written

Adapted 2026-05-23 from `~/weather-radar-card/docs/ha-elements-guide.md`.
Both docs were sparked by the same 2026-04-01 `ha-textfield`
→ `ha-input` migration trap, but they track HA-element
behavior in two different surfaces (custom Lovelace card vs.
custom HA panel) so the empirical observations may diverge
over time. Keep them in sync when an element rename or
deprecation affects both surfaces.
