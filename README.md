# smart-icons

A Home Assistant addon that lets any entity's icon take its **color** and/or
**glyph** from any other entity's **state** — thresholds, mappings, or full
Jinja templates — applied across the default Lovelace cards without per-card
configuration.

> **Status:** early design. No working code yet. See [DESIGN.md](DESIGN.md)
> for the architecture, configuration model, and rendering approach.

## What problem does it solve?

Home Assistant's default cards (entities, tile, glance, more-info) color icons
based on the *owning* entity's domain and state — a light is amber when on,
grey when off. There's no first-class way to say "color this light's icon
based on a temperature sensor" without rewriting every card to a templated
custom card.

Existing options (`card-mod`, `custom:button-card`, `mushroom`) all work, but
they're scoped to the card the rule lives in. **smart-icons** decouples the
rule from the card: declare it once, in one place, and it applies wherever
that entity appears.

## How it works (one paragraph)

A custom integration stores rules in HA's storage and exposes a websocket API.
A small frontend module subscribes to those rules and to the source entities'
state changes, then watches the DOM for `ha-state-icon` elements. For each
match it applies a **decoration** — a color override on the outer element
and/or a glyph swap on the inner `<ha-icon>`. The integration auto-registers
the frontend resource, so install is one click in the Integrations panel.

## Configuration

Three ways to add rules, all backed by the same store:

1. **Per-entity** — the entity settings dialog gets a "Smart Icon" section.
2. **Bulk / power user** — a dedicated `Settings → Smart Icons` panel.
3. **YAML** — `smart_icons:` block in `configuration.yaml` (optional, v0.2+).

See [DESIGN.md § Configuration UX](DESIGN.md#configuration-ux) for details.

## Compatibility

Targets Home Assistant 2026.1+ initially. Works on any card that uses
`ha-state-icon` (all default cards, most third-party cards). Cards that draw
their own custom icon SVGs (e.g. `mini-graph-card`) are out of scope.

## License

MIT © 2026 John Pettitt — see [LICENSE](LICENSE).

## Repository

Eventual home: `github.com/jpettitt/smart-icons`.
