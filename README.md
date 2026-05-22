# Smart Icons

Drive any Home Assistant entity's icon **color** and/or **glyph** from any
other entity's state — thresholds, mappings, or (in v0.3) Jinja templates —
applied across the default Lovelace cards without per-card configuration.

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://hacs.xyz)
[![Release](https://img.shields.io/github/v/release/jpettitt/smart-icons?include_prereleases&style=for-the-badge)](https://github.com/jpettitt/smart-icons/releases)
[![License](https://img.shields.io/github/license/jpettitt/smart-icons?style=for-the-badge)](LICENSE)
![Maintenance](https://img.shields.io/maintenance/yes/2026?style=for-the-badge)

> **Status:** v0.2.0 — GA. Feature-complete for the v0.2 line: server-side
> icon + color injection, sidebar management panel, multi-target and glob
> rules, per-target source semantics, mapping-state autocomplete from
> recorder history, admin-only management (the painter still works for
> every user). Template-mode evaluation lands in v0.3.
>
> **On main, awaiting v0.2.1:** in-panel YAML editing (per-rule and
> whole-config) with atomic save and clickable error highlighting. See
> [`docs/yaml-editing.md`](docs/yaml-editing.md) for the design and the
> [Unreleased CHANGELOG entry](CHANGELOG.md) for what landed.

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
`state_changed` events, evaluates the matching rules in Python, and writes
two attributes onto each target entity:

- `icon` — HA's standard glyph attribute, read natively by every
  `<ha-state-icon>` instance with no frontend cooperation needed.
- `smart_icons_color` — our namespaced color hint. A tiny painter bundle
  (~3 KB, loaded on every Lovelace page) bridges this attribute to inline
  `style.color` on each icon host.

Because the glyph swap rides HA's native render path, it survives Lovelace
view switches, dashboard reloads, and reaches the mobile apps. The color
painter is the only piece that touches the DOM.

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
- **Mode** — `mapping` (exact state → decoration), `thresholds`
  (numeric ranges), or `template` (storage only in v0.2, runtime in v0.3).
- **Priority** — when several rules target the same entity, the highest-
  priority enabled rule wins.

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

- **v0.3** — Template-mode evaluation (Jinja, server-side), Door 1 (entity
  settings dialog injection), YAML loader.
- **v0.4+** — Drag-reorder priority in the panel, import/export, icon-pack
  picker, optional opacity decoration.

Full backlog: [TODO.md](TODO.md) and [DESIGN.md § 11](DESIGN.md#11-roadmap).

## Development

The repo includes a Docker HA testbed that bind-mounts the integration —
`docker compose up -d` from [`dev/`](dev/) and Smart Icons is loaded
into a clean HA instance. See [`dev/README.md`](dev/README.md) and
[`frontend/README.md`](frontend/README.md) for the build/test loop.

## License

MIT © 2026 John Pettitt — see [LICENSE](LICENSE).
