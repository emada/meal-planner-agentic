import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * AC13/AC14 require the primary journeys to pass at a mobile and a desktop
 * viewport, so both projects are mandatory rather than optional extras.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Only constrain workers on CI; locally Playwright's own default is better.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /reflow\.spec\.ts/,
    },
    // AC13 names 375px explicitly; the Pixel 7 descriptor is 412px.
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 667 } },
      testIgnore: /reflow\.spec\.ts/,
    },
    // WCAG 2.1 AA success criterion 1.4.10 (Reflow) is specified at 320 CSS
    // pixels, not the 375 AC13 names. Scoped to one spec rather than run as a
    // third full project: the journeys are the same, only the width differs.
    {
      name: 'reflow-320',
      testMatch: /reflow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 700 } },
    },
  ],

  // Tests run against the production build, not the dev server, so what CI
  // verifies is what gets deployed.
  webServer: {
    command: `npm run build && npm run preview -- --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
