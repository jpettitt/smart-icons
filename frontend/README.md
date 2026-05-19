# Frontend bundle

TypeScript sources for the Smart Icons painter, rule store, state watcher,
and (in v0.1 chunk 2) the Lit panel UI. Built with esbuild into a single
ESM bundle at
[`custom_components/smart_icons/static/smart_icons.js`](../custom_components/smart_icons/static/smart_icons.js),
which the Python integration registers as a Lovelace resource at
`/smart_icons_static/smart_icons.js`.

The bundle lives inside the integration directory (not under
`frontend/dist/`) so HACS packaging — which copies only
`custom_components/<domain>/` — picks it up automatically.

## One-time

```sh
cd frontend
npm install
```

## Build (production)

```sh
npm run build
```

Writes a minified `smart_icons.js` into the integration's `static/` dir.
Commit the result — that's the artifact HACS users install.

## Build (dev, watch)

```sh
npm run watch
```

Rebuilds with sourcemaps on every save. The Docker HA container is
bind-mounting `custom_components/smart_icons/`, so the new bundle is
visible inside HA immediately. **Reload the browser tab** to pick it up
— HA does not auto-reload integration-served JS.

## Type-check

```sh
npm run typecheck
```

No emit; just `tsc --noEmit` for fast feedback.

## Tests

```sh
npm test
```

Web Test Runner with esbuild TS compilation, default Chrome launcher
(Puppeteer's bundled chromium on first run). Pure-logic suites (e.g.
`evaluator.test.ts`) run headless and fast; DOM-dependent suites use
`@open-wc/testing` fixtures.
