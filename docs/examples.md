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
  - binary_sensor.*door_contact
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

- **`targets:` is a glob.** `binary_sensor.*door_contact` matches the
  canonical Zigbee2MQTT / Z-Wave door-sensor naming —
  `binary_sensor.front_door_contact`, `binary_sensor.kitchen_door_contact`,
  etc. Adjust the pattern to your install: `binary_sensor.*_door` if
  you have bare-named sensors, `binary_sensor.*door*` to catch
  everything door-related, or a literal entity id to target one.
- **No `source:` field.** With a glob target and no explicit
  source, Smart Icons applies the rule per-target: each matched
  sensor reads its own state. One rule, every door colored by its
  own open/closed.
- **`'on'` and `'off'` are quoted.** Bare unquoted `on` is parsed
  as the YAML boolean `true`, which would never match the string
  state `"on"` HA reports. Quoting the keys is the safest reflex —
  see the [sun-direction example below](#direction-aware-variant)
  for the same gotcha with `True` / `False`.

### Same rule with a background chip (v0.3+)

Same target, different visual idiom: the v0.3 `background_color`
field paints a Mushroom-style colored circle behind the icon. With
the chip carrying the state (red = open, green = closed), the icon
itself can stay simple — a white glyph reads at a glance against
either fill. No icon override needed; HA's default door glyph is
fine.

```yaml
targets:
  - binary_sensor.*door_contact
mode: mapping
mapping:
  'off':
    color: white
    background_color: green
  'on':
    color: white
    background_color: red
```

The chip is independent of `color` and `icon` — you can set one
field, two, or all three on each mapping entry. Any CSS color
string works, including `rgba()` for translucent chips that let
the card background show through.

A rule with only `background_color` set (no `color`, no `icon`)
paints just the chip and leaves the icon's natural color and glyph
alone, which is the right shape for a "highlight" rule layered on
top of an existing state-driven rule (the field-level merger keeps
both effects; see the
[sun example](#same-effect-via-field-level-merge-v030a3) for what
that looks like in practice).

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
  the higher priority (20 vs 10), and the elevation entries set
  both `color` and `icon` so the merger has nothing else to pick
  up from the lower-priority rule.
- **The dead zone's width is yours to tune.** Widen it to -10° / +10°
  if you want sunrise/sunset icons through a longer twilight; narrow
  it to -3° / +3° if you only want them for the moments the sun is
  visually on the horizon. The chosen ±6° band roughly matches civil
  twilight.

The two-rule + dead-zone pattern works on every Smart Icons version
and is worth knowing because the same "let a lower rule fill in the
gap" trick generalizes (e.g. "unavailable warning + thresholds" in
the [temperatures example](#temperatures--nws-color-scale--stale-data-warning)
above). v0.3.0a3 added a more direct alternative — see the next
subsection.

### Same effect via field-level merge (v0.3.0a3+)

The two-rule + dead-zone design above predates the **field-level
merge** introduced in v0.3.0a3. With merging, the winning rule no
longer "takes all" — fields a higher-priority rule doesn't address
flow through from lower-priority rules. That unlocks a more direct
three-rule shape: one rule per concern (color, glyph, direction),
none of them fighting each other.

```yaml
rules:
  # Direction glyph — always matches, but only sets `icon`.
  # The lower rules contribute color; this one doesn't.
  - targets:
      - sun.sun
    source_attribute: rising
    mode: mapping
    mapping:
      'True':
        icon: mdi:weather-sunset-up
      'False':
        icon: mdi:weather-sunset-down
    priority: 5

  # Elevation glyph for the high-sky band — overrides the
  # direction glyph when the sun is well up. Only sets `icon`.
  - targets:
      - sun.sun
    source_attribute: elevation
    mode: thresholds
    thresholds:
      - lt: -6
        icon: mdi:weather-night
      - gt: 6
        icon: mdi:weather-sunny
    priority: 10

  # Elevation color — fully covers every elevation band. Only
  # sets `color`; the icon comes from whichever icon rule wins.
  - targets:
      - sun.sun
    source_attribute: elevation
    mode: thresholds
    thresholds:
      - lt: -12
        color: '#0d1233'
      - lt: -6
        color: '#1a1f4a'
      - lt: 6
        color: '#ff8c00'
      - lt: 30
        color: '#ffd700'
      - color: '#ffeb3b'
    priority: 10
```

Two things change from the two-rule version:

- **No dead zone needed.** The color rule has an `_else` branch
  covering every elevation; the icon rules can overlap or not as
  you like because each only contributes the glyph. Near the
  horizon you get the direction glyph (priority 5 wins because the
  elevation icon rule's thresholds don't match in that band); high
  in the sky or deep below it, the elevation glyph wins.
- **Each rule reads like one decision.** Color-by-elevation is a
  pure color rule, glyph-by-elevation is a pure glyph rule,
  direction-by-rising is a pure glyph fallback. The two-rule
  version above stuffs both decisions into each rule and uses the
  no-match gap to coordinate — cleverer, but harder to extend.

If you also want a **chip** behind the sun icon (say, gray during
the day, dark blue at night), add a fourth rule with only
`background_color` set on each threshold entry. It merges in
without disturbing color or glyph.
