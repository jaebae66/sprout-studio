import { defineConfig } from '@playwright/test';

/**
 * Playwright tests for Sprout Studio.
 *
 *   npm test               build, then run everything against the app's source (electron .)
 *   npm run test:packaged  package, then run the app tests against release/…/Sprout Studio.exe
 *
 * Every app test gets its own throwaway data folder and vault (see tests/support/sprout.ts),
 * so nothing touches your real notes or database.
 */
export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  // Each test starts a whole desktop app, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'unit', testDir: 'tests/unit' },
    { name: 'mcp', testDir: 'tests/mcp' },
    { name: 'app', testDir: 'tests/app' },
    { name: 'packaged', testDir: 'tests/app', use: { packaged: true } },
  ],
});
