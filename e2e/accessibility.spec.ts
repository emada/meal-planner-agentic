import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { expect, test } from './themealdb';

const SEARCH_ROUTE = 'https://www.themealdb.com/api/json/v1/1/search.php*';
const RANDOM_ROUTE = 'https://www.themealdb.com/api/json/v1/1/random.php*';
const CATEGORIES_ROUTE = 'https://www.themealdb.com/api/json/v1/1/categories.php*';
const FILTER_ROUTE = 'https://www.themealdb.com/api/json/v1/1/filter.php*';
const LOOKUP_ROUTE = 'https://www.themealdb.com/api/json/v1/1/lookup.php*';

const meal = {
  idMeal: '52874',
  strMeal: 'Beef and Mustard Pie',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/pie.jpg',
  strCategory: 'Beef',
  strArea: 'British',
  strInstructions: 'Preheat the oven.\n\nBrown the beef.',
  strYoutube: 'https://www.youtube.com/watch?v=abc',
  strSource: 'https://example.test/source',
  strIngredient1: 'Beef',
  strMeasure1: '1 kg',
  strIngredient2: 'Onion',
  strMeasure2: '2 chopped',
};

/**
 * Automated checks catch a subset of accessibility defects — roughly a third by
 * most measures — so they supplement the per-slice keyboard and focus
 * assertions rather than replacing them. What they do catch reliably is
 * contrast, names and roles, which are exactly the classes a reviewer reading a
 * diff will miss.
 *
 * Landmark rules are deliberately *not* covered: axe tags them `best-practice`,
 * which this tag set excludes. The main landmark is asserted directly in
 * `src/ui/App.test.tsx` instead. Every focus defect this project's reviews
 * found would have passed this scan cleanly.
 */
const scan = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

const stub = async (page: Page) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal] }),
    }),
  );
  await page.route(RANDOM_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal] }),
    }),
  );
  // filter.php sends partial meals; lookup.php answers the follow-up.
  await page.route(FILTER_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        meals: [{ idMeal: meal.idMeal, strMeal: meal.strMeal, strMealThumb: meal.strMealThumb }],
      }),
    }),
  );
  await page.route(LOOKUP_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal] }),
    }),
  );
};

const search = async (page: Page) => {
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
};

test('the search view has no automatically detectable violations', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  // The idle view now loads the category browser, so scanning immediately
  // races the response and may scan an empty region instead.
  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the category grid has no automatically detectable violations', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Beef' }).click();
  await expect(page.getByText('Beef and Mustard Pie')).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the browse error state has no automatically detectable violations', async ({ page }) => {
  await page.route(CATEGORIES_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the results grid has no automatically detectable violations', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  await search(page);
  await expect(page.getByRole('button', { name: /beef and mustard pie/i })).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the open recipe modal has no automatically detectable violations', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  await search(page);
  await page.getByRole('button', { name: /beef and mustard pie/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the shopping list has no automatically detectable violations', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  await search(page);
  await page.getByRole('button', { name: /beef and mustard pie/i }).click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await page.getByRole('button', { name: /close recipe/i }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(page.getByRole('heading', { name: /my shopping list/i })).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the clear confirmation has no automatically detectable violations', async ({ page }) => {
  await stub(page);
  await page.goto('/');
  await search(page);
  await page.getByRole('button', { name: /beef and mustard pie/i }).click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await page.getByRole('button', { name: /close recipe/i }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await page.getByRole('button', { name: /clear list/i }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});

test('the error state has no automatically detectable violations', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');
  await search(page);
  await expect(page.getByRole('alert')).toBeVisible();

  expect((await scan(page)).violations).toEqual([]);
});
