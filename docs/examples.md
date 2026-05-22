# Example rules

A growing collection of ready-to-paste Smart Icons rules.

To use one: open the **Smart Icons** sidebar entry, click **+ Add rule**,
hit **Show code editor**, paste the YAML over the default content, adjust
the `targets:` line if you want to scope it to a specific entity instead
of the broad glob, then **Save**.

If you have a configuration that others might find useful, open a PR
adding it here.

## Doors and windows — simple state mapping

The simplest useful Smart Icons rule. Color every door (or window)
contact sensor green when closed and red when open, with matching
glyphs. One rule covers every matching sensor on the install.

```yaml
targets:
  - binary_sensor.*_door
mode: mapping
mapping:
  'on':
    color: '#ff0000'
    icon: mdi:door-open
  'off':
    color: '#008000'
    icon: mdi:door-closed-lock
```

Three things are worth noticing in this minimal rule, because they
recur in every example after this:

- **`targets:` is a glob.** `binary_sensor.*_door` matches every
  binary sensor whose `object_id` ends in `_door`. Adjust the
  pattern to match your naming convention — `binary_sensor.*door*`
  is broader, `binary_sensor.front_door_contact` targets one
  specific sensor.
- **No `source:` field.** With a glob target and no explicit
  source, Smart Icons applies the rule per-target: each matched
  sensor reads its own state. One rule, every door colored by its
  own open/closed.
- **`'on'` and `'off'` are quoted.** Bare unquoted `on` is parsed
  as the YAML boolean `true`, which would never match the string
  state `"on"` HA reports. Quoting the keys is the safest reflex —
  see the [sun-direction example below](#direction-aware-variant)
  for the same gotcha with `True` / `False`.

## Locks

Color and glyph every lock entity by its current state. Green when
locked, lighter green during a lock cycle, yellow during the unlock
cycle, red when unlocked, magenta for anything else (e.g.
`unavailable` or `jammed`).

```yaml
targets:
  - lock.*
mode: mapping
mapping:
  locked:
    color: green
    icon: mdi:lock-check
  locking:
    color: lightgreen
    icon: mdi:lock
  unlocking:
    color: yellow
    icon: mdi:lock-open-outline
  unlocked:
    color: '#ff0000'
    icon: mdi:lock-open-check-outline
  _else:
    color: magenta
    icon: mdi:lock-open-alert
```

Note the `_else` branch — it catches any state value not listed
above (HA's locks can report `unavailable`, `jammed`, `opening`,
`closing`, plus integration-specific values). Falling through to a
magenta "wait, what?" makes weird states immediately visible on the
dashboard.

### Override: show "door open" when the door sensor says so

Run *alongside* the lock rule above. When the matching door's
contact sensor reports open, replace the lock glyph with an
orange door-open icon — the actual lock state is irrelevant if
the door isn't latched.

```yaml
targets:
  - lock.front_door             # edit to your lock's entity id
source: binary_sensor.front_door_contact   # edit to your sensor
mode: mapping
mapping:
  'on':
    color: '#ff8c00'
    icon: mdi:door-open
priority: 15
```

Two things make this work:

- **`source` differs from `targets`.** Smart Icons lets the rule
  driving the decoration be a different entity than the one
  wearing it. Here the door sensor drives, the lock wears.
- **Higher `priority` + no `_else` branch.** When the sensor's
  state is `on` (open), this rule produces a decoration and
  wins over the priority-10 lock-state rule. When the sensor's
  state is anything else (`off`, `unknown`, `unavailable`), no
  mapping key matches, no decoration is produced, and the lock
  rule above takes over by fallthrough — the lock shows its
  normal state-colored icon.

Quote `'on'` in the YAML — bare `on` is interpreted as the boolean
`true` by YAML parsers, and the lookup against the sensor's string
state `"on"` would never match.

## Temperatures — NWS color scale + stale-data warning

Color every temperature sensor by the U.S. National Weather Service
scale (deep magenta below -10 °F → severe crimson above 105 °F), with
a higher-priority companion rule that lights `unknown` / `unavailable`
states red so "no data" doesn't look the same as "extremely hot."

This is **two rules**, both targeting the same glob. The mapping rule's
explicit `priority: 11` wins over the thresholds rule's default `10`
when the source state is `unknown` or `unavailable`. For real numeric
readings the mapping doesn't match (no such key) and the thresholds
rule takes over.

Paste this as a whole-config block via the panel's **Show code editor**
toggle at the table level — or paste each rule individually via the
per-rule code editor:

```yaml
rules:
  - targets:
      - sensor.*temperature
    mode: thresholds
    thresholds:
      - lt: -10
        color: '#4B0082'
        icon: mdi:thermometer-low
      - lte: 0
        color: '#8A2BE2'
        icon: mdi:thermometer-low
      - lte: 10
        color: '#00008B'
        icon: mdi:thermometer-low
      - lte: 20
        color: '#0000FF'
        icon: mdi:thermometer-low
      - lte: 32
        color: '#ADD8E6'
        icon: mdi:thermometer-low
      - lte: 40
        color: '#008080'
        icon: mdi:thermometer-low
      - lte: 50
        color: '#00FFFF'
        icon: mdi:thermometer
      - lte: 60
        color: '#008000'
        icon: mdi:thermometer
      - lte: 70
        color: '#90EE90'
        icon: mdi:thermometer
      - lte: 80
        color: '#FFFF00'
        icon: mdi:thermometer
      - lte: 85
        color: '#FFD700'
        icon: mdi:thermometer
      - lte: 90
        color: '#FFA500'
        icon: mdi:thermometer-high
      - lte: 95
        color: '#FF8C00'
        icon: mdi:thermometer-high
      - lte: 100
        color: '#FF0000'
        icon: mdi:thermometer-high
      - lte: 105
        color: '#8B0000'
        icon: mdi:thermometer-high
      - color: '#800000'
        icon: mdi:fire-circle
  - targets:
      - sensor.*temperature
    mode: mapping
    mapping:
      unknown:
        color: '#ff0000'
        icon: mdi:message-alert
      unavailable:
        color: '#ff0000'
        icon: mdi:message-alert
    priority: 11
```

The thresholds rule's final entry has no comparator — that's the
"else" branch, applied to anything above 105 °F. Bands use `lt` for
the cold end and `lte` everywhere else so every numeric value is
covered with no gaps.

If your sensors report Celsius, swap the bands accordingly — the
mechanics are the same, only the numbers change.

## Sun position — elevation-banded color

Color the `sun.sun` icon by where the sun is in the sky. Deep blue
through the night, purples through twilight, orange at the
horizon, yellow at midday. The rule reads `sun.sun.elevation`
(degrees above or below the horizon) as a numeric source;
thresholds align with the standard astronomical / nautical / civil
twilight bands.

```yaml
targets:
  - sun.sun
source_attribute: elevation
mode: thresholds
thresholds:
  - lt: -12
    color: '#0d1233'         # astronomical night
    icon: mdi:weather-night
  - lt: -6
    color: '#1a1f4a'         # nautical twilight
    icon: mdi:weather-night-partly-cloudy
  - lt: 0
    color: '#7c4a8b'         # civil twilight
    icon: mdi:weather-sunset-down
  - lt: 6
    color: '#ff8c00'         # golden hour, sun on the horizon
    icon: mdi:weather-sunset-up
  - lt: 30
    color: '#ffd700'         # morning / late afternoon
    icon: mdi:weather-hazy
  - color: '#ffeb3b'         # midday
    icon: mdi:weather-sunny
```

A note on rising vs setting: the icons above lean visually toward
"sunset going down" through the just-below-horizon band and
"sunrise going up" through the just-above-horizon band, but
they're chosen by **elevation only** — both dawn and dusk pass
through the same numeric ranges, so the rising-up icon shows at
sunset too, and vice versa.

### Direction-aware variant

If you'd rather see the icon flip with the sun's actual direction
of travel, ignore elevation and key off `sun.sun.rising` (a boolean
HA exposes as a state attribute):

```yaml
targets:
  - sun.sun
source_attribute: rising
mode: mapping
mapping:
  'True':
    color: '#ff8c00'
    icon: mdi:weather-sunset-up
  'False':
    color: '#ff4500'
    icon: mdi:weather-sunset-down
```

This trades the elevation banding for an accurate direction
indicator. Quote `'True'` and `'False'` in the YAML — Smart Icons
matches mapping keys against `str()` of the source attribute, and
Python's `str(True)` is `"True"` with a capital `T`. Bare unquoted
`True` would be parsed as the YAML boolean and could be coerced
differently across parsers; quoting removes that risk.

### Direction-aware *and* elevation-banded — two rules, one outcome

You can have both — direction-aware sunrise / sunset glyphs while the
sun is near the horizon, and elevation-banded colors the rest of the
time — by exploiting Smart Icons' priority + no-`_else` fallthrough.
Paste this as a whole-config block, or paste the two rules
individually:

```yaml
rules:
  # Direction-aware mapping. Always matches because `rising` is
  # always True or False — no _else needed.
  - targets:
      - sun.sun
    source_attribute: rising
    mode: mapping
    mapping:
      'True':
        color: '#ff8c00'
        icon: mdi:weather-sunset-up
      'False':
        color: '#ff4500'
        icon: mdi:weather-sunset-down
    priority: 10

  # Elevation banding for the rest of the sky. Deliberately has
  # *no* entry covering the -6° to +6° transition window, so the
  # rule produces no decoration there.
  - targets:
      - sun.sun
    source_attribute: elevation
    mode: thresholds
    thresholds:
      - lt: -12
        color: '#0d1233'
        icon: mdi:weather-night
      - lt: -6
        color: '#1a1f4a'
        icon: mdi:weather-night-partly-cloudy
      - gt: 30
        color: '#ffeb3b'
        icon: mdi:weather-sunny
      - gt: 6
        color: '#ffd700'
        icon: mdi:weather-hazy
    priority: 20
```

The mechanics are worth understanding because the same pattern
generalizes to other "combine two views of the same entity" problems:

- **`rising` is binary and always present.** HA exposes it as `True`
  from solar midnight through solar noon and `False` the rest of the
  day — never null, never `unknown`. A `mapping` rule keyed on
  `rising` therefore *always* matches. On its own, this rule would
  win everywhere and you'd lose the elevation banding entirely.
- **Higher-priority rule with no `_else` creates a dead zone.** The
  elevation thresholds explicitly cover only `lt: -12`, `lt: -6`,
  `gt: 6`, and `gt: 30`. Between -6° and +6° no entry matches, so
  the rule produces *no* decoration. The lower-priority `rising`
  mapping then wins by fallthrough — and you get the
  sunrise/sunset glyph during exactly the part of the day where it
  matters.
- **Outside the dead zone the elevation rule wins** because it has
  the higher priority (20 vs 10), and Smart Icons' winner-takes-all
  semantics give the whole decoration (color *and* glyph) to the
  winner — there's no merging.
- **The dead zone's width is yours to tune.** Widen it to -10° / +10°
  if you want sunrise/sunset icons through a longer twilight; narrow
  it to -3° / +3° if you only want them for the moments the sun is
  visually on the horizon. The chosen ±6° band roughly matches civil
  twilight.

A naïve three-rule design — one rule for color, one for icon, one
for direction — doesn't work here, because each rule's decoration is
atomic: the winner contributes both `color` *and* `icon`, and lower-
priority rules are not merged in. Two rules with carefully chosen
coverage is the right shape.
