import { expect, test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.resolve(
  process.cwd(),
  'test-e2e/.auth/user.json',
);
const ENV_FILE = path.resolve(process.cwd(), 'test-e2e/.env');

/**
 * Capture an authenticated HA session once and persist it for the
 * e2e specs to reuse.
 *
 * Credentials come from `frontend/test-e2e/.env` (gitignored — do
 * NOT commit) or from the `HA_USERNAME` / `HA_PASSWORD` env vars
 * if the file is absent. The setup fills the form programmatically;
 * no interactive login is required.
 *
 * Re-runs when the saved state is older than 7 days; otherwise the
 * setup is skipped so the e2e specs run quickly. To force a
 * re-login, delete `test-e2e/.auth/user.json`.
 */
setup('authenticate', async ({ page }) => {
  // Generous timeout — initial HA load + login navigation can take
  // longer than the default 30 s on a slow machine or a cold cache.
  setup.setTimeout(120_000);

  if (fs.existsSync(STATE_FILE)) {
    const ageDays =
      (Date.now() - fs.statSync(STATE_FILE).mtimeMs) /
      (1000 * 60 * 60 * 24);
    if (ageDays < 7) {
      setup.skip(
        true,
        `auth state at ${STATE_FILE} is < 7 days old; reusing. ` +
          `Delete the file or wait for it to age out to refresh.`,
      );
    }
  }

  const { username, password } = loadCredentials();
  if (!username || !password) {
    throw new Error(
      `HA_USERNAME and HA_PASSWORD must be set. Either:\n` +
        `  - Create frontend/test-e2e/.env with HA_USERNAME=... and\n` +
        `    HA_PASSWORD=... (gitignored)\n` +
        `  - Or pass them inline: HA_USERNAME=admin HA_PASSWORD=secret \\\n` +
        `    npm run e2e:setup\n` +
        `See frontend/test-e2e/README.md for setup details.`,
    );
  }

  await page.goto('/');

  // HA's modern auth form (ha-authorize → ha-pick-auth-provider →
  // ha-auth-form) labels its inputs via accessible-name (aria) rather
  // than associated <label for=...>. Use getByRole, which matches the
  // labeling pattern HA actually uses; getByLabel only finds inputs
  // wrapped or linked by a <label> element.
  await page
    .getByRole('textbox', { name: 'Username' })
    .fill(username);
  await page
    .getByRole('textbox', { name: 'Password' })
    .fill(password);

  // Submit: the "Log in" button at the bottom of HA's auth form.
  // "Keep me logged in" checkbox between the inputs and the button
  // is left at its default (checked); we want the session to persist.
  await page.getByRole('button', { name: 'Log in' }).click();

  // Wait for the connection to come up — same canonical signal the
  // painter waits for in src/index.ts.
  await page.waitForFunction(
    () => {
      const root = document.querySelector('home-assistant') as
        | (HTMLElement & { hass?: { connection?: unknown } })
        | null;
      return Boolean(root?.hass?.connection);
    },
    { timeout: 60_000 },
  );

  expect(page.url()).not.toContain('/auth/');

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  await page.context().storageState({ path: STATE_FILE });
});

/** Read HA_USERNAME / HA_PASSWORD from process.env, falling back to
 *  parsing `frontend/test-e2e/.env`. We avoid the `dotenv` dependency
 *  for one var pair — a tiny parser keeps the install footprint
 *  minimal. */
function loadCredentials(): {
  username: string | undefined;
  password: string | undefined;
} {
  let username = process.env.HA_USERNAME;
  let password = process.env.HA_PASSWORD;
  if ((!username || !password) && fs.existsSync(ENV_FILE)) {
    const raw = fs.readFileSync(ENV_FILE, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (k === 'HA_USERNAME' && !username) username = v;
      if (k === 'HA_PASSWORD' && !password) password = v;
    }
  }
  return { username, password };
}
