import { expect, test } from '@playwright/test';

/**
 * Runs against the deployed site with the real TheMealDB. Nothing is stubbed —
 * that is the entire point, and it is why this suite lives outside `e2e/` and
 * outside the fixture that forbids live API calls there.
 *
 * Assertions are deliberately shape-based rather than content-based: the recipe
 * database changes without warning, so asserting "a grid appears with at least
 * one card whose title is non-empty" survives, while asserting "Beef Pie is the
 * first result" would fail for reasons that are not defects.
 */

const anyCardTitle = '.card__title';

test('the app loads with its stylesheet applied and no page error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /recipe search/i })).toBeVisible();

  // The stylesheet has failed in production before: a cached index.html
  // referencing a hashed asset the new deployment no longer had, which returns
  // text/plain and is refused. A visible heading proves nothing about styling,
  // so read a property only our stylesheet sets.
  const spacing = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--space-4').trim(),
  );
  expect(spacing).not.toBe('');

  expect(errors).toEqual([]);
});

test('browsing: categories load, one opens, and a recipe opens with its ingredients', async ({
  page,
}) => {
  await page.goto('/');

  // AC15, added at S8 and absent from the previous smoke record.
  await expect(page.getByRole('heading', { name: /browse by category/i })).toBeVisible();
  const category = page.locator('.grid--categories .card__button').first();
  await expect(category).toBeVisible();
  await category.click();

  const card = page.locator('.grid:not(.grid--categories) .card__button').first();
  await expect(card).toBeVisible();
  await card.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // The lookup follow-up is what fills these in; a partial filter result would
  // open the modal with an empty list.
  await expect(dialog.getByRole('heading', { name: /ingredients/i })).toBeVisible();
  await expect(dialog.locator('li').first()).toBeVisible();
});

test('search returns a grid of live results', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('chicken');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');

  await expect(page.getByText(/recipes? for chicken\./i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(anyCardTitle).first()).not.toBeEmpty();
});

test('a searched recipe reaches the shopping list', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('chicken');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await expect(page.getByText(/recipes? for chicken\./i)).toBeVisible({ timeout: 15_000 });

  await page.locator('.grid .card__button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const ingredients = await page.getByRole('dialog').locator('li').count();
  expect(ingredients).toBeGreaterThan(0);

  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await expect(page.getByText(/added \d+ ingredients?/i)).toBeVisible();

  await page.getByRole('button', { name: /close recipe/i }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await expect(page.getByRole('heading', { name: /my shopping list/i })).toBeVisible();
  await expect(page.locator('.shopping-list__item').first()).toBeVisible();
});

test('list editing survives a reload on the real deployment', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('chicken');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await expect(page.getByText(/recipes? for chicken\./i)).toBeVisible({ timeout: 15_000 });

  await page.locator('.grid .card__button').first().click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await page.getByRole('button', { name: /close recipe/i }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  const entries = page.locator('.shopping-list__item');
  const before = await entries.count();
  expect(before).toBeGreaterThan(0);

  // Editing was previously excluded from the smoke record as device-local. It
  // is device-local, but "the built bundle persists to this browser's storage
  // on this origin" is not something a stubbed test on localhost can show.
  await page
    .getByRole('button', { name: /remove/i })
    .first()
    .click();
  await expect(entries).toHaveCount(before - 1);

  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(entries).toHaveCount(before - 1);

  await page.getByRole('button', { name: /clear list/i }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: /clear/i }).click();

  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(page.getByText(/shopping list is empty/i)).toBeVisible();
});

test('surprise me opens a random recipe with its ingredients', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('navigation')
    .getByRole('button', { name: /surprise me/i })
    .click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole('heading').first()).not.toBeEmpty();
  await expect(dialog.locator('li').first()).toBeVisible();
});

test('the deployment serves the security headers the threat model documents', async ({
  request,
}) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});
