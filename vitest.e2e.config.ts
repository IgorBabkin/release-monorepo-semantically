import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['e2e/**/*.spec.ts'],
    // Each e2e run now chains several separate CLI process invocations
    // (report, package-json, package-manager, changelog, vcs, ...) instead
    // of one monolithic command, so a single test can spend several seconds
    // just on process startup.
    testTimeout: 30000,
  },
});
