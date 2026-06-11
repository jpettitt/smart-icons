import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
  files: 'test/**/*.test.ts',
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2022',
      // Point the plugin at our tsconfig so its esbuild transform
      // honors experimentalDecorators + useDefineForClassFields:false.
      // Without these, Lit's legacy @customElement / @property
      // decorators throw "Unsupported decorator location: field" at
      // import time. The plugin's `tsconfig` option is a path; it
      // reads the file and forwards the raw contents to esbuild.
      tsconfig: './tsconfig.json',
      // Match the production build's --define so __BUILD_TIME__
      // exists at test time too (the panel entry references it
      // unconditionally; without this the runner would throw
      // ReferenceError when the entry is imported).
      define: { __BUILD_TIME__: '"test"' },
    }),
  ],
  nodeResolve: true,
  testFramework: {
    config: { ui: 'bdd', timeout: 5000 },
  },
  // Use the test-runner's default Chrome launcher; WTR pulls Puppeteer's
  // bundled chromium on first run.
};
