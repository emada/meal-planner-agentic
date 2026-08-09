import { expect, test } from '@playwright/test';

/**
 * S0 smoke test: proves the built artefact loads and the harness can drive it
 * at both viewports. Journey coverage arrives with the slices that add journeys.
 */
test('the built application loads and renders its title', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recipe Search & Meal Planner');
});

test('the page does not scroll horizontally at the tested viewport', async ({ page }) => {
  await page.goto('/');

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});

test('the built output ships a content security policy that permits only TheMealDB', async ({
  page,
}) => {
  await page.goto('/');

  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');

  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("connect-src 'self' https://www.themealdb.com");
  expect(policy).toContain("object-src 'none'");
});

test('no console errors are emitted on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(errors).toEqual([]);
});
