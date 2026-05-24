# Smart Icons

Drive any Home Assistant entity's icon **color**, **glyph**, and
**background chip** from any other entity's state — via thresholds
or mappings — applied across the default Lovelace cards without
per-card configuration.

## See it in action

One real example — `sun.sun`'s icon, driven by elevation and
direction. Two rules stack: an elevation-thresholds rule with a
±6° dead zone, and a lower-priority rising/setting mapping that
fills the dead zone in. The user just sees these glyphs at the
matching sun angles:

| Angle | −20° | −10° | −3° | +3° | +10° | +40° |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| Icon | ![weather night](https://raw.githubusercontent.com/jpettitt/smart-icons/main/docs/img/sun-weather-night-dark.svg) | ![partly cloudy night](https://raw.githubusercontent.com/jpettitt/smart-icons/main/docs/img/sun-weather-night-partly-cloudy-dark.svg) | ![sunset up](https://raw.githubusercontent.com/jpettitt/smart-icons/main/docs/img/sun-weather-sunset-up-dark.svg) | ![sunset down](https://raw.githubusercontent.com/jpettitt/smart-icons/main/docs/img/sun-weather-sunset-down-dark.svg) | ![weather hazy](https://raw.githubusercontent.com/jpettitt/smart-icons/main/docs/img/sun-weather-hazy-dark.svg) | ![sunny](https://raw.githubusercontent.com/jpettitt/smart-icons/main/docs/img/sun-weather-sunny-dark.svg) |

## What it does

Home Assistant's default cards color icons by domain + state — a
`light` is amber when on, grey when off. There's no first-class
way to say "color this light's icon based on a temperature sensor"
without rewriting every card to a templated custom card.

**Smart Icons** decouples the rule from the card. Declare once,
apply everywhere the entity appears — including the mobile app and
voice displays, because the icon swap happens server-side via
`state.attributes.icon`.

## Highlights

- **Per-rule background chip** — Mushroom-style colored circle
  behind any icon. Hex / `rgb()` / `rgba()` / named colors all work
- **Field-level rule merging** — a high-priority "alarm" rule sets
  just the chip; a lower-priority "state" rule fills in the color
- **Glob targets** — one rule covers `light.kitchen_*` or every
  `binary_sensor.*door_contact` on the install
- **Source-attribute rules** — drive decoration off `sun.sun.azimuth`
  or any other attribute, not just the entity state
- **YAML editor with HA's `ha-code-editor`** — syntax highlighting,
  entity / icon autocomplete, Ctrl+S save
- **Glob-target resolution cache** — large installs (5k+ entities)
  stay fast

## Full documentation

- [README](https://github.com/jpettitt/smart-icons#smart-icons) —
  full feature list, configuration guide, install instructions
- [`docs/examples.md`](https://github.com/jpettitt/smart-icons/blob/main/docs/examples.md)
  — ready-to-paste rules (doors, locks, temperatures, sun, more)
- [CHANGELOG.md](https://github.com/jpettitt/smart-icons/blob/main/CHANGELOG.md)
  — version history and upgrade notes
