import { expect, test, type Page } from '@playwright/test';

const RANDOM_ROUTE = 'https://www.themealdb.com/api/json/v1/1/random.php*';
const SEARCH_ROUTE = 'https://www.themealdb.com/api/json/v1/1/search.php*';

const meal = (id: string, title: string) => ({
  idMeal: id,
  strMeal: title,
  strMealThumb: 'https://www.themealdb.com/images/media/meals/pie.jpg',
  strCategory: 'Dessert',
  strArea: 'French',
  strInstructions: 'Bake it.',
  strIngredient1: 'Flour',
  strMeasure1: '200 g',
  strIngredient2: 'Butter',
  strMeasure2: '100 g',
});

const stubRandom = async (page: Page, body: unknown) => {
  await page.route(RANDOM_ROUTE, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
};

const surprise = (page: Page) =>
  page.getByRole('navigation').getByRole('button', { name: /surprise me/i });

test('AC11 — surprise me opens a random recipe in the same modal', async ({ page }) => {
  await stubRandom(page, { meals: [meal('1', 'Tarte Tatin')] });
  await page.goto('/');

  await surprise(page).click();

  const dialog = page.getByRole('dialog', { name: /tarte tatin/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveCount(2);
  await expect(dialog.getByText('200 g')).toBeVisible();
  // Same modal means the same add-to-list behaviour.
  await expect(dialog.getByRole('button', { name: /add to my shopping list/i })).toBeVisible();
});

test('AC11 — surprise me works from the shopping list view too', async ({ page }) => {
  await stubRandom(page, { meals: [meal('2', 'Crème Brûlée')] });
  await page.goto('/');

  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(page.getByRole('heading', { name: /my shopping list/i })).toBeVisible();

  await surprise(page).click();
  await expect(page.getByRole('dialog', { name: /crème brûlée/i })).toBeVisible();
});

test('a random recipe can be added to the shopping list', async ({ page }) => {
  await stubRandom(page, { meals: [meal('3', 'Clafoutis')] });
  await page.goto('/');

  await surprise(page).click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await page.getByRole('button', { name: /close recipe/i }).click();

  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await expect(page.locator('.shopping-list__name')).toHaveText(['Butter', 'Flour']);
});

test('surprise me from inside an open recipe replaces it', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal('4', 'Beef Pie')] }),
    }),
  );
  await stubRandom(page, { meals: [meal('5', 'Tarte Tatin')] });
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef pie/i }).click();
  await expect(page.getByRole('dialog', { name: /beef pie/i })).toBeVisible();

  await page
    .getByRole('dialog')
    .getByRole('button', { name: /surprise me/i })
    .click();

  await expect(page.getByRole('dialog', { name: /tarte tatin/i })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('a failed surprise shows an error with a working retry', async ({ page }) => {
  await page.route(RANDOM_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');

  await surprise(page).click();
  await expect(page.getByRole('alert')).toContainText(/could not find a random recipe/i);

  await stubRandom(page, { meals: [meal('6', 'Tarte Tatin')] });
  await page.getByRole('button', { name: /try again/i }).click();

  await expect(page.getByRole('dialog', { name: /tarte tatin/i })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('surprise me is reachable by keyboard alone', async ({ page }) => {
  await stubRandom(page, { meals: [meal('7', 'Tarte Tatin')] });
  await page.goto('/');

  await surprise(page).focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: /tarte tatin/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
});
