# Smart Icons

Drive any Home Assistant entity's icon **color**, **glyph**, and
**background chip** from any other entity's state — via thresholds
or mappings — applied across the default Lovelace cards without
per-card configuration.

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://hacs.xyz)
[![Release](https://img.shields.io/github/v/release/jpettitt/smart-icons?include_prereleases&style=for-the-badge)](https://github.com/jpettitt/smart-icons/releases)
[![License](https://img.shields.io/github/license/jpettitt/smart-icons?style=for-the-badge)](LICENSE)
![Maintenance](https://img.shields.io/maintenance/yes/2026?style=for-the-badge)

> **Status:** v0.3.0a3 alpha — adds per-rule Mushroom-style
> background chip + field-level rule merging on top of the v0.2.2
> GA. See [CHANGELOG.md](CHANGELOG.md) for the full release notes.
> The contrasting-outline approach explored earlier in the v0.3
> cycle was abandoned
> ([rationale](docs/icon-outline-prototype-results.md)) when the
> chip approach proved cleaner. Template mode was inert through
> v0.2 / v0.3 alpha and removed in v0.3.0a3; rule stacking covers
> the use cases template mode was originally for
> (see [`docs/examples.md`](docs/examples.md)).

## See it in action

One real example — `sun.sun`'s icon, driven by elevation and
direction. Two rules stack: an elevation-thresholds rule with a
±6° dead zone, and a lower-priority rising/setting mapping that
fills the dead zone in. The user just sees these glyphs at the
matching sun angles:

<table>
<tr>
  <th align="left">Angle</th>
  <td align="center">−20°</td>
  <td align="center">−10°</td>
  <td align="center">−3°</td>
  <td align="center">+3°</td>
  <td align="center">+10°</td>
  <td align="center">+40°</td>
</tr>
<tr>
  <th align="left">Icon</th>
  <td align="center"><picture><source srcset="docs/img/sun-weather-night-dark.svg" media="(prefers-color-scheme: dark)"><img src="docs/img/sun-weather-night-light.svg" width="32" alt="weather night" /></picture></td>
  <td align="center"><picture><source srcset="docs/img/sun-weather-night-partly-cloudy-dark.svg" media="(prefers-color-scheme: dark)"><img src="docs/img/sun-weather-night-partly-cloudy-light.svg" width="32" alt="partly cloudy night" /></picture></td>
  <td align="center"><picture><source srcset="docs/img/sun-weather-sunset-up-dark.svg" media="(prefers-color-scheme: dark)"><img src="docs/img/sun-weather-sunset-up-light.svg" width="32" alt="sunset up" /></picture></td>
  <td align="center"><picture><source srcset="docs/img/sun-weather-sunset-down-dark.svg" media="(prefers-color-scheme: dark)"><img src="docs/img/sun-weather-sunset-down-light.svg" width="32" alt="sunset down" /></picture></td>
  <td align="center"><picture><source srcset="docs/img/sun-weather-hazy-dark.svg" media="(prefers-color-scheme: dark)"><img src="docs/img/sun-weather-hazy-light.svg" width="32" alt="weather hazy" /></picture></td>
  <td align="center"><picture><source srcset="docs/img/sun-weather-sunny-dark.svg" media="(prefers-color-scheme: dark)"><img src="docs/img/sun-weather-sunny-light.svg" width="32" alt="sunny" /></picture></td>
</tr>
</table>

See [`docs/examples.md`](docs/examples.md#direction-aware-and-elevation-banded--two-rules-one-outcome)
for the YAML, the per-rule contribution table, and other ready-to-paste
patterns (doors, locks, temperature-banding, background chips).

## What problem does it solve?

Home Assistant's default cards (entities, tile, glance, more-info) color
icons based on the *owning* entity's domain and state — a light is amber
when on, grey when off. There's no first-class way to say "color this
light's icon based on a temperature sensor" without rewriting every card
to a templated custom card.

Existing options (`card-mod`, `custom:button-card`, `mushroom`) all work,
but they're scoped to the card the rule lives in. **Smart Icons** decouples
the rule from the card: declare it once, in one place, and it applies
wherever that entity appears — including the mobile app and voice displays,
because the icon swap happens server-side via `state.attributes.icon`.

## What's new in 0.2

- **Multi-target rules** — one rule decorates many entities at once. Pick
  them in the panel via HA's native multi-entity selector, or list them as
  `targets: [...]` in YAML / JSON.
- **Glob target patterns** — `light.kitchen_*`, `sensor.temp_?`, etc.
  Resolved against `hass.states` at apply time; newly-added entities that
  match an existing glob pick up the rule automatically.
- **Per-target source semantics** — for a multi-target or glob rule with no
  explicit source, each matched target reacts to **its own** state (and
  `source_attribute`, if set). One rule, every kitchen light colored by its
  own brightness.
- **State autocomplete in the mapping editor** — each mapping-state cell
  shows the states the source entity has actually been in over the last
  seven days, sourced from the recorder.
- **Admin-only management** — the panel and WebSocket API are admin-gated.
  Non-admin users still see correctly painted icons on their dashboards
  (the painter reads from state attributes, not the WS API).
- **Responsive panel layout** — the rules table reformats as a card stack
  on narrow widths via CSS container queries (correctly tracks HA sidebar
  state, unlike viewport-based media queries).
- **A pile of bug fixes** since v0.1 — color race on state change, glob
  rules failing to apply after HA restart, ha-button vs mwc-button.

See the [v0.2.0b2 release notes](https://github.com/jpettitt/smart-icons/releases/tag/v0.2.0b2)
and [CHANGELOG.md](CHANGELOG.md) for the full list.

## How it works

A custom integration stores rules in HA's normal storage and exposes a
WebSocket API. An `IconInjector` subscribes to the source entities'
`state_changed` events, merges every rule that matches each target in
priority order, and writes the result onto the target's state attributes:

- `icon` — HA's standard glyph attribute, read natively by every
  `<ha-state-icon>` instance with no frontend cooperation needed.
- `smart_icons_color` — our namespaced color hint. The painter bundle
  (~5 KB, loaded on every Lovelace page) bridges this to inline
  `style.color` on each icon host.
- `smart_icons_background` — Mushroom-style chip color (v0.3+).
  When set, the painter renders a colored circle behind the icon via
  `background-color` + `border-radius: 50%` + an inset `box-shadow`
  ring on the host. Independent of `smart_icons_color`: either, both,
  or neither may be set per rule.

Because the glyph swap rides HA's native render path, it survives Lovelace
view switches, dashboard reloads, and reaches the mobile apps. The
painter is the only piece that touches the DOM, and it only owns the
inline color / background slots on hosts it has marked as decorated.

## Install

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jpettitt&repository=smart-icons&category=integration)

Click the badge to open HACS on your HA instance with this repository
pre-filled, then **Download**. Or manually:

1. HACS → **⋮** → **Custom repositories** → add
   `https://github.com/jpettitt/smart-icons` with category **Integration**.
2. HACS → **Integrations** → search "Smart Icons" → **Download**.
3. Restart Home Assistant.
4. **Settings → Devices & services → Add Integration** → search "Smart Icons"
   → **Add**. A new sidebar entry, **Smart Icons**, appears for admin users.

For betas (currently the only releases), toggle **Show beta versions** in
HACS before downloading.

### Manual

Copy `custom_components/smart_icons/` from the [latest release](https://github.com/jpettitt/smart-icons/releases)
into your HA `config/custom_components/` directory, restart HA, then add the
integration from Settings → Devices & services.

## Configuration

Rules are managed in the **Smart Icons** sidebar panel. No YAML required.

Each rule has:

- **Targets** — one or more entities, or glob patterns matching many.
- **Source** — the entity whose state drives the decoration. Optional;
  for multi-target / glob rules, leaving it blank means each target
  reacts to its own state.
- **Source attribute** — read an attribute instead of the entity's main
  state (e.g. `azimuth` on `sun.sun`).
- **Mode** — `mapping` (exact state → decoration) or `thresholds`
  (numeric ranges).
- **Priority** — when several rules target the same entity, fields
  are merged in priority order. The highest-priority enabled rule
  that addresses a given field (color, icon, or background) wins
  that field; lower-priority rules fill in fields the winner didn't
  touch. A bg-only highlight rule on top of a color-by-state rule
  keeps both effects. Explicit `null` / `""` / `"inherit"` / `"unset"`
  in a high-priority rule blocks lower rules from contributing that
  field (v0.3+; see [DESIGN.md § 4.2](DESIGN.md#42-decorations-and-the-priority-merge) for the full semantic).

Example: recolor every kitchen light by its own brightness.

```jsonc
{
  "targets": ["light.kitchen_*"],
  "source_attribute": "brightness",
  "mode": "thresholds",
  "thresholds": [
    { "lt": 64,  "color": "#552200" },
    { "lt": 192, "color": "#ffaa00" },
    {            "color": "#ffffaa" }
  ]
}
```

(No `source` field — that's per-target semantics: each matched light reads
its own `brightness`.)

For more ready-to-paste rules covering common entity types, see
[docs/examples.md](docs/examples.md).

### Background chips (v0.3+)

A rule can decorate an icon with a colored circular background chip,
in the Mushroom card style, by setting `background_color` on a
mapping entry or threshold entry. The chip accepts any CSS color
string — hex, `rgb()`, `rgba()` for translucency, named colors,
`var(--…)` references. Either `color`, `background_color`, both, or
neither may be set per rule; a chip-only rule leaves the icon's
natural color alone.

```jsonc
{
  "targets": ["binary_sensor.front_door_motion"],
  "mode": "mapping",
  "mapping": {
    "on":  { "color": "#ffeb3b", "background_color": "#b71c1c" },
    "off": {                      "background_color": "#1b5e20" }
  }
}
```

## Compatibility

- Home Assistant **2024.7** or newer (`StaticPathConfig` requirement —
  declared as `min_ha_version` in the integration manifest).
- Works on any card that uses `<ha-state-icon>`: all default cards
  (entities, tile, glance, more-info) and most third-party cards (mushroom,
  button-card via its default icon path).
- Out of scope: cards that draw their own SVG icons
  (`mini-graph-card`, `apex-charts-card` custom paths). They don't go
  through `ha-state-icon`; Smart Icons can't intercept them.

## Roadmap

- **v0.3** — Mushroom-style per-rule background chip
  (`background_color` on mapping / threshold entries); field-level
  rule merging (highest-priority value wins per field, not per rule);
  Door 1 (entity settings dialog injection); translations framework.
- **v0.4+** — Drag-reorder priority in the panel, import/export,
  icon-pack picker, optional opacity decoration.

Full backlog: [TODO.md](TODO.md) and [DESIGN.md § 11](DESIGN.md#11-roadmap).

## Notes for integration developers

Smart Icons writes the `icon`, `smart_icons_color`, and
`smart_icons_background` attributes onto target entities via
`hass.states.async_set`. These calls fire synthetic `state_changed`
events with the entity's existing `state` value preserved — only the
attribute bag changes. Implications:

- **Automations that trigger on state *transitions*** are unaffected.
  HA's standard state-trigger compares `new_state.state` to
  `old_state.state`; neither changes when we update only attributes.
- **Listeners that subscribe to raw `state_changed` events** see our
  synthetic updates. Filter them out with
  `new_state.state != old_state.state` (state-only listeners) or by
  checking which attribute keys actually changed (attribute-aware
  listeners). The injector debounces per-target writes to avoid
  storming the bus, but rule-eval bursts are still visible.
- **Other integrations writing the same attributes** are a conflict
  zone. Smart Icons re-applies its decoration on every relevant
  state change and tracks the last `icon` it wrote per target so it
  only clears the icon when the value still matches our last write
  (source integrations that overwrite with their own icon are left
  alone). See [DESIGN.md § 7.0](DESIGN.md#70-architecture--server-side-glyph-client-side-color)
  for the full discussion.

## Development

The repo includes a Docker HA testbed that bind-mounts the integration —
`docker compose up -d` from [`dev/`](dev/) and Smart Icons is loaded
into a clean HA instance. See [`dev/README.md`](dev/README.md) and
[`frontend/README.md`](frontend/README.md) for the build/test loop.

## License

MIT © 2026 John Pettitt — see [LICENSE](LICENSE).
