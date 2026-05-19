import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  files: 'test/**/*.test.ts',
  plugins: [esbuildPlugin({ ts: true, target: 'es2022' })],
  nodeResolve: true,
  testFramework: {
    config: { ui: 'bdd', timeout: 5000 },
  },
  // Use the test-runner's default Chrome launcher; WTR pulls Puppeteer's
  // bundled chromium on first run.
};
