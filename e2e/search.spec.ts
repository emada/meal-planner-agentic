import { expect, test, type Page } from '@playwright/test';

/**
 * TheMealDB is stubbed. The acceptance criteria are about how the app behaves
 * for each response shape, and a live dependency would make "no results" and
 * "the network failed" impossible to trigger on demand — which is exactly what
 * AC2 and AC3 require.
 */
const SEARCH_ROUTE = 'https://www.themealdb.com/api/json/v1/1/search.php*';

const meal = (id: string, title: string) => ({
  idMeal: id,
  strMeal: title,
  strMealThumb: 'https://www.themealdb.com/images/media/meals/placeholder.jpg',
  strCategory: 'Beef',
  strArea: 'British',
  strInstructions: 'Cook it.',
  strIngredient1: 'Beef',
  strMeasure1: '1 kg',
});

const stubSearch = async (page: Page, body: unknown) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
};

const search = async (page: Page, term: string) => {
  await page.getByRole('searchbox', { name: /search recipes/i }).fill(term);
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
};

test('AC1 — pressing Enter shows a grid of matching recipes', async ({ page }) => {
  await stubSearch(page, { meals: [meal('1', 'Beef Pie'), meal('2', 'Beef Stew')] });
  await page.goto('/');

  await search(page, 'beef');

  await expect(page.getByText('Beef Pie')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('Beef · British').first()).toBeVisible();
});

test('AC2 — a search with no matches says so instead of showing a blank grid', async ({ page }) => {
  await stubSearch(page, { meals: null });
  await page.goto('/');

  await search(page, 'zzzzz');

  await expect(page.getByText(/no recipes found/i)).toBeVisible();
  await expect(page.getByRole('list')).toHaveCount(0);
});

test('AC3 — a failed search shows an error and a retry that works', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');

  await search(page, 'beef');

  await expect(page.getByRole('alert')).toContainText(/could not search/i);

  // The app must stay usable: retry after the network recovers.
  await stubSearch(page, { meals: [meal('1', 'Beef Pie')] });
  await page.getByRole('button', { name: /try again/i }).click();

  await expect(page.getByText('Beef Pie')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('AC13 — the results grid does not overflow horizontally', async ({ page }) => {
  await stubSearch(page, {
    meals: Array.from({ length: 8 }, (_, index) =>
      meal(String(index), `Pannenkoekenhuisjesbouwvakkersvereniging${String(index)}`),
    ),
  });
  await page.goto('/');

  await search(page, 'beef');
  await expect(page.getByRole('listitem').first()).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});

test('the search is operable by keyboard alone', async ({ page }) => {
  await stubSearch(page, { meals: [meal('1', 'Beef Pie')] });
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).focus();
  await page.keyboard.type('beef');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Beef Pie')).toBeVisible();
});
