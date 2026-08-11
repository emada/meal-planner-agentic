import { defineConfig, devices } from '@playwright/test';

/**
 * The production smoke check, as a committed suite rather than a claim.
 *
 * Until S9 this check existed only as a table of results in
 * `docs/quality/gates.md`, run from a throwaway project outside the repository.
 * Nobody could re-run it, so a reader had to take the row on trust. This config
 * makes the same check reproducible: `npm run smoke:prod`.
 *
 * It is deliberately NOT part of `verify` and NOT a required status context:
 * - it runs against the deployed site, so it cannot gate a merge that has not
 *   happened yet;
 * - it calls the real TheMealDB on the test key `1`, which spec O1 records as
 *   rate-limited and unsupported. Running it on every pull request would tie
 *   the merge gate to a third party's uptime.
 *
 * Override the target with SMOKE_URL to check a preview deployment instead.
 */
const BASE_URL = process.env.SMOKE_URL ?? 'https://meal-planner-agentic.vercel.app';

export default defineConfig({
  testDir: './e2e-prod',
  // Against a live third party, a lone network blip should not read as a
  // product defect — but a journey that needs three attempts is a finding, so
  // the retry count is low and the report shows it.
  retries: 2,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'smoke-results.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 780 } },
    },
  ],
});
