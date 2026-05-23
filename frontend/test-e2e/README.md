# E2E tests

Playwright-driven browser smoke tests for the Smart Icons sidebar
panel. These run against the local docker testbed
(`dev/docker-compose.yml`) and exercise the rule editor end-to-end
to catch the silent zero-height failure mode that lazy-load
mishaps produce (see [`docs/ha-elements-guide.md`](../../docs/ha-elements-guide.md)).

Not part of the regular `npm test` suite (which runs Web Test
Runner specs against component-level units). E2E specs need a
running HA instance and a captured auth session.

## One-time setup

1. Start the testbed:

   ```bash
   cd dev && docker compose up -d
   ```

2. Complete HA's onboarding (create admin user) the first time
   you spin up a fresh `dev/ha_config/`.

3. Capture an authenticated browser session for the test runner:

   ```bash
   cd frontend
   npx playwright test --project=setup
   ```

   This opens a real Chromium window. **Log in to HA manually.**
   The setup spec waits up to 3 minutes for the home-assistant
   element to expose a live `hass.connection`, then snapshots
   cookies + localStorage into
   [`.auth/user.json`](.auth/) — gitignored.

   Subsequent runs reuse that session until it expires or you
   delete the file.

## Running the specs

```bash
cd frontend
npx playwright test
```

Specs run against `http://localhost:8123` by default (override
via the `baseURL` in [`playwright.config.ts`](../playwright.config.ts)).
HTML report at `playwright-report/`, screenshots on failure at
`test-e2e/screenshots/`.

To run a single spec:

```bash
npx playwright test rule-editor.spec.ts
```

To debug interactively:

```bash
npx playwright test --debug
```

## What the specs cover

| Spec | Verifies |
|---|---|
| [`auth.setup.ts`](auth.setup.ts) | One-time login + session capture |
| [`rule-editor.spec.ts`](rule-editor.spec.ts) | Rule editor renders without zero-height failures across Mapping / Thresholds modes; add-row ha-buttons load; YAML toggle works |

Add a new spec when adding a new panel surface or after a
non-trivial refactor of an existing one. The bar: any change
that could plausibly trigger a silent lazy-load failure deserves
a spec.

## Re-running setup (when state expires)

```bash
rm test-e2e/.auth/user.json
npx playwright test --project=setup
```

Or set the file's mtime older than 7 days — the setup spec
auto-refreshes when the snapshot is that stale.
