import { type Page } from '@playwright/test';
import { expect, json, test } from './themealdb';

/**
 * WCAG 2.1 success criterion 1.4.10, Reflow, at level AA: content must be
 * usable at 320 CSS pixels wide without requiring horizontal scrolling.
 *
 * AC13 names 375px, which is a phone. 320 is the width the standard specifies,
 * and it is also what 1280px at 400% zoom produces — the case a low-vision user
 * actually hits. The target was set to AA on 2026-08-11; before that nothing
 * checked this width.
 *
 * Each check tests two things, because they fail differently: the document must
 * not scroll sideways, and no individual element may be clipped inside a
 * container that hides its overflow.
 */
const FILTER = 'https://www.themealdb.com/api/json/v1/1/filter.php*';
const LOOKUP = 'https://www.themealdb.com/api/json/v1/1/lookup.php*';
const SEARCH = 'https://www.themealdb.com/api/json/v1/1/search.php*';

/** The token the clipping checks depend on being unbreakable. */
const UNBREAKABLE = 'Pannenkoekenhuisjesbouwvakkersverenigingsvergadering';

const FULL = {
  meals: [
    {
      idMeal: '52874',
      // Genuinely unbreakable. The first draft of this fixture used hyphens,
      // which CSS treats as break opportunities, so the text wrapped on its
      // own and the check could not fail. A probe caught that before it
      // shipped; the fixture has to be able to break the thing it guards.
      strMeal: UNBREAKABLE,
      strMealThumb: 'https://x/1.jpg',
      strCategory: 'Chicken',
      strArea: 'British',
      strInstructions: 'Cook it slowly and then serve it hot.',
      strIngredient1: 'Worcestershiresaucereductionconcentrate',
      strMeasure1: '2 tablespoons, approximately',
      strIngredient2: 'Onion',
      strMeasure2: '1 finely sliced',
    },
  ],
};

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const clipped = (page: Page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '.card__title, .card__meta, .button, h1, h2, h3, .browse__message, .results__message',
      ),
    ]
      .filter((node) => node.scrollWidth > node.clientWidth + 1)
      // Named, not counted: a failure should say which element was clipped.
      .map((node) => node.textContent.trim().slice(0, 40)),
  );

const fitsAt320 = async (page: Page) => {
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await clipped(page)).toEqual([]);
};

test('1.4.10 — the landing view reflows at 320px', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();

  await fitsAt320(page);
});

test('1.4.10 — a category and its recipes reflow at 320px', async ({ page }) => {
  await json(page, FILTER, {
    meals: [{ idMeal: '52874', strMeal: UNBREAKABLE, strMealThumb: 'https://x/1.jpg' }],
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Beef' }).click();
  await expect(page.getByText(/1 recipe in Beef/i)).toBeVisible();

  await fitsAt320(page);
});

test('1.4.10 — search results reflow at 320px', async ({ page }) => {
  await json(page, SEARCH, FULL);
  await page.goto('/');
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('chicken');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await expect(page.getByText(/1 recipe for chicken/i)).toBeVisible();

  await fitsAt320(page);
});

test('1.4.10 — the open recipe modal reflows at 320px', async ({ page }) => {
  await json(page, SEARCH, FULL);
  await json(page, LOOKUP, FULL);
  await page.goto('/');
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('chicken');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.locator('.grid .card__button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await fitsAt320(page);
});

test('1.4.10 — the shopping list reflows at 320px', async ({ page }) => {
  await json(page, SEARCH, FULL);
  await page.goto('/');
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('chicken');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.locator('.grid .card__button').first().click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await page.getByRole('button', { name: /close recipe/i }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(page.getByRole('heading', { name: /my shopping list/i })).toBeVisible();

  await fitsAt320(page);
});
