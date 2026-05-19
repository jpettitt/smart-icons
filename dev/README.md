# Dev environment

Local Home Assistant for hacking on smart-icons. The integration code at
[`custom_components/smart_icons/`](../custom_components/smart_icons/) is
bind-mounted into the container; HA scans it on every restart.

## Prerequisites

- Docker Desktop (macOS / Windows) or Docker Engine + Compose v2 (Linux).
- Port `8123` free on the host.

## First run

```sh
cd dev
docker compose up -d
```

Open <http://localhost:8123>, walk through HA onboarding (create the owner
account, pick a location, accept defaults). Onboarding state lives in
`dev/ha_config/.storage/` — `.gitignored`, so it persists across container
restarts but never lands in git.

The container is named `smart-icons-ha`; tail logs with:

```sh
docker compose logs -f homeassistant
```

## Daily loop

| Change | Action |
| --- | --- |
| Python in `custom_components/smart_icons/` | `docker compose restart homeassistant` |
| Frontend bundle in `custom_components/smart_icons/` (once wired up) | Hard-reload the browser tab (`Cmd-Shift-R`) — HA caches `/local/` and integration-served paths aggressively |
| `dev/ha_config/configuration.yaml` | `docker compose restart homeassistant` |
| `dev/docker-compose.yml` | `docker compose up -d` (re-creates the container) |

There's no Python hot-reload inside HA for custom components — restart is
the supported loop.

## Frontend bundle (placeholder)

Not wired up yet. The plan: `frontend/` builds via esbuild and emits to a
path inside `custom_components/smart_icons/` (likely `static/`) that the
Python `frontend.py` serves at `/smart_icons_static/smart_icons.js`. Once
that lands, an `esbuild --watch` on the host writes through the bind mount
in real time; only the browser needs to refresh.

## Running the §7.6 glyph-swap PoC

The PoC script in
[DESIGN.md § 7.6](../DESIGN.md#76-glyph-swap-validation-plan-poc) needs a
visible entity to target. After onboarding, add at least one visible
entity to a Lovelace view (the easiest: add a *Manual entity* or pick one
from the auto-suggested cards), update `TARGET_ID` in the script, paste
into DevTools, and follow the scenarios.

## Reset

To wipe HA state and re-onboard:

```sh
docker compose down
# Keep configuration.yaml + .gitignore; nuke everything else.
find ha_config -mindepth 1 ! -name configuration.yaml ! -name .gitignore -delete
docker compose up -d
```

## Troubleshooting

- **Port 8123 in use** — change the host port in `docker-compose.yml`
  (`"8124:8123"` etc.); don't change the container side, HA always listens
  on 8123 internally.
- **HA logs "Unable to find manifest.json" under `smart_icons`** — expected
  until the v0.1 Python skeleton lands; the empty directory is mounted so
  the bind-mount target exists.
- **Permission errors on Linux** — Docker bind mounts run as root inside
  the container; if the host user can't read `ha_config/` after stopping,
  `sudo chown -R $USER ha_config/`.
- **Slow file I/O on macOS** — Docker Desktop's default bind-mount perf
  for `/config` is fine for dev; if it bites, enable VirtioFS in Docker
  Desktop → Settings → General.

## Versioning

The compose file pins HA to the `:stable` tag. For reproducibility during
a deep-debug session, replace it with an explicit version
(e.g. `homeassistant/home-assistant:2026.5`) in a local edit and don't
commit.
