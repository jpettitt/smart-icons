import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the rule-editor (and future panel) smoke
 * tests. See `test-e2e/README.md` for the auth-setup workflow and
 * the per-spec test plan.
 *
 * Why this config is the way it is:
 *
 * - `fullyParallel: false` — HA is stateful and the panel mutates
 *   shared storage. Running specs in parallel would race on
 *   rules / options edits. One worker at a time.
 *
 * - Two-project layout (`setup` + `e2e`) — the setup project saves
 *   an authenticated browser state once (interactive login on first
 *   run); the e2e project re-uses it for fast, repeatable runs.
 *   Same pattern HA's own frontend tests use.
 *
 * - `storageState` lives at `test-e2e/.auth/user.json` and is
 *   gitignored. Re-run `npm run e2e:setup` if it expires or the
 *   HA admin password changes.
 */
export default defineConfig({
  testDir: './test-e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8123',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      // Setup runs headless by default — credentials come from
      // frontend/test-e2e/.env (gitignored). Pass `--headed` to
      // watch the login happen, e.g. `npm run e2e:setup` (which
      // forces headed).
      timeout: 120_000,
    },
    {
      name: 'e2e',
      testMatch: /.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: './test-e2e/.auth/user.json' },
    },
  ],
});
