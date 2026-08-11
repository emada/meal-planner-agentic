import { expect, test } from './themealdb';

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

  // Asserted as an exact policy, independently restated here. A substring
  // check would stay green while a directive was deleted or widened, which
  // is precisely how threat T1 gets neutralised without anyone noticing.
  expect(policy).toBe(
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' https://www.themealdb.com data:",
      "connect-src 'self' https://www.themealdb.com",
      "font-src 'self'",
      "form-action 'none'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  );

  // Stated separately so the intent survives any future edit to the list.
  expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
});

test('the policy precedes every resource-referencing tag it governs', async ({ page }) => {
  const response = await page.goto('/');
  const html = (await response?.text()) ?? '';

  // A meta-delivered policy does not apply to content above it, so position is
  // part of the control. Reading the attribute alone would stay green while a
  // script tag drifted above the policy and escaped it entirely.
  const policyAt = html.indexOf('Content-Security-Policy');
  const charsetAt = html.search(/<meta\s+charset/i);

  expect(policyAt).toBeGreaterThan(-1);
  expect(charsetAt).toBeGreaterThan(-1);

  // Encoding detection only inspects the first 1024 bytes.
  expect(charsetAt).toBeLessThan(1024);
  expect(charsetAt).toBeLessThan(policyAt);

  for (const tag of ['<script', '<link']) {
    const at = html.indexOf(tag);
    if (at !== -1) expect(at).toBeGreaterThan(policyAt);
  }
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
