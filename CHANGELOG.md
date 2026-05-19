# Changelog

## v0.1.0 — 2026-05-19

First release.

### What's new

- **Server-side icon swap** — define rules per entity; the integration
  computes the winning icon from rule + source state and writes it to
  the target's `state.attributes.icon`. HA's native render path takes
  it from there, so the override works in every surface that reads
  state attributes (web, mobile apps, voice displays). Survives
  Lovelace view switches and dashboard reloads — no DOM races.
- **Color override** — color rides alongside the icon via a custom
  `smart_icons_color` attribute that a small frontend painter applies
  as `style.color` on each `<ha-state-icon>`.
- **Two rule modes** — `thresholds` (numeric ranges; first match wins,
  last-with-no-comparator is the else branch) and `mapping` (exact
  state → decoration; `_else` is the fallback). `template` mode is
  accepted by the storage layer for forward compatibility; runtime
  evaluation lands in v0.2.
- **Source-attribute targeting** — drive a rule off an attribute of
  the source entity (e.g. `sun.sun.azimuth`) instead of its state.
- **Sidebar management panel** — Settings → Smart Icons. Add / edit /
  delete rules through a UI with HA's native entity and icon pickers,
  grouped sections (Apply to / React to / Decoration / Options).
- **WebSocket API** — `smart_icons/{list, upsert, delete, subscribe,
  version}` for programmatic access.
- **Persistent storage** — rules live in HA's `Store`, survive
  restarts, and ride along in backups.

### Configuration

No YAML required. After install:

1. Settings → Devices & services → Add Integration → search "Smart Icons" → Add.
2. Open the new "Smart Icons" entry in the sidebar to create rules.

Example: drive sun.sun's icon and color off its compass angle.

```jsonc
{
  "target": "sun.sun",
  "source": "sun.sun",
  "source_attribute": "azimuth",
  "mode": "thresholds",
  "thresholds": [
    { "lt": 90,  "color": "#001144", "icon": "mdi:weather-sunset" },
    { "lt": 180, "color": "#ffaa00", "icon": "mdi:weather-sunny" },
    { "lt": 270, "color": "#ff5500", "icon": "mdi:weather-sunset-down" },
    {            "color": "#001144", "icon": "mdi:moon-waning-crescent" }
  ]
}
```

### Requirements

- Home Assistant **2025.1.0** or newer (modern `ha-picker` components
  in the panel UI).

### Internals

- Two frontend bundles: always-on `smart_icons.js` (~4.5 KB, color
  painter), and lazy-loaded `smart_icons_panel.js` (~41 KB, Lit-based
  panel UI). Heavy lifting is in Python — the painter only bridges
  the color attribute to `style.color`.
- 102 tests across pytest + Web Test Runner.

### Known limitations

- Door 1 (entity settings dialog injection) is not yet shipped —
  rules are managed exclusively from the sidebar panel.
- Template-mode rules are stored but not evaluated at runtime; coming
  in v0.2.
- Releasing a rule clears the color override but leaves the last
  injected icon on the target's state attributes until the source
  integration pushes a fresh state. Acceptable for v0.1; tracked for
  cleanup.
