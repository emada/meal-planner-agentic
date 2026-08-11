import { expect, test, type Page } from '@playwright/test';

const SEARCH_ROUTE = 'https://www.themealdb.com/api/json/v1/1/search.php*';

const meal = (id: string, title: string, ingredients: [string, string][]) => {
  const fields: Record<string, string> = {
    idMeal: id,
    strMeal: title,
    strMealThumb: 'https://www.themealdb.com/images/media/meals/pie.jpg',
    strCategory: 'Beef',
    strArea: 'British',
    strInstructions: 'Cook it.',
  };

  for (let slot = 1; slot <= 20; slot += 1) {
    const pair = ingredients[slot - 1];
    fields[`strIngredient${String(slot)}`] = pair ? pair[0] : '';
    fields[`strMeasure${String(slot)}`] = pair ? pair[1] : '';
  }

  return fields;
};

const PIE = meal('1', 'Beef Pie', [
  ['Beef', '1 kg'],
  ['Salt', '1 tsp'],
]);

const STEW = meal('2', 'Beef Stew', [
  ['Onion', '2 chopped'],
  ['salt', 'to taste'],
]);

const stub = async (page: Page, meals: unknown[]) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals }),
    }),
  );
};

const addRecipe = async (page: Page, title: string) => {
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: new RegExp(title, 'i') }).click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();
  await page.getByRole('button', { name: /close recipe/i }).click();
};

test('AC6 + AC7 — add a recipe, then read the list in alphabetical order', async ({ page }) => {
  await stub(page, [PIE]);
  await page.goto('/');

  // AC7: the control is present on the search view before anything is added.
  await expect(page.getByRole('button', { name: /view my shopping list/i })).toBeVisible();

  await addRecipe(page, 'Beef Pie');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  const names = page.locator('.shopping-list__name');
  await expect(names).toHaveText(['Beef', 'Salt']);
  await expect(page.getByText('1 kg')).toBeVisible();
});

test('AC9 — two recipes sharing an ingredient group into one entry, measures verbatim', async ({
  page,
}) => {
  await stub(page, [PIE, STEW]);
  await page.goto('/');

  await addRecipe(page, 'Beef Pie');
  await addRecipe(page, 'Beef Stew');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  // "Salt" and "salt" are the same ingredient; "1 tsp" and "to taste" have no
  // common unit and must both survive, unconverted.
  await expect(page.locator('.shopping-list__name')).toHaveText(['Beef', 'Onion', 'Salt']);

  const salt = page.locator('.shopping-list__item').filter({ hasText: 'Salt' });
  await expect(salt.locator('.shopping-list__measures li')).toHaveText(['1 tsp', 'to taste']);
});

test('AC8 — the list survives a browser restart, not merely a reload', async ({
  page,
  browser,
}) => {
  await stub(page, [PIE]);
  await page.goto('/');
  await addRecipe(page, 'Beef Pie');

  // A reload alone would pass with sessionStorage, so it does not discriminate
  // the storage class AC8 is about. A fresh context does.
  const state = await page.context().storageState();
  const restarted = await browser.newContext({ storageState: state });
  const restartedPage = await restarted.newPage();

  await stub(restartedPage, [PIE]);
  await restartedPage.goto('/');
  await restartedPage
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await expect(restartedPage.locator('.shopping-list__name')).toHaveText(['Beef', 'Salt']);
  await restarted.close();
});

test('adding the same recipe twice does not double the list', async ({ page }) => {
  await stub(page, [PIE]);
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef pie/i }).click();

  const add = page.getByRole('button', { name: /add to my shopping list/i });
  await add.click();
  await add.click();
  await page.getByRole('button', { name: /close recipe/i }).click();

  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  const beef = page.locator('.shopping-list__item').filter({ hasText: 'Beef' });
  await expect(beef.locator('.shopping-list__measures li')).toHaveText(['1 kg']);
});

test('the clear confirmation is operable by keyboard alone', async ({ page }) => {
  await stub(page, [PIE]);
  await page.goto('/');

  await addRecipe(page, 'Beef Pie');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  const trigger = page.getByRole('button', { name: /clear list/i });
  await trigger.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('alertdialog')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('.shopping-list__name')).toHaveText(['Beef', 'Salt']);
});

test('AC10 — malformed stored data does not break the app', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('meal-planner.shopping-list.v1', '{not json');
  });
  await stub(page, [PIE]);
  await page.goto('/');

  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await expect(page.getByText(/your shopping list is empty/i)).toBeVisible();
  // Still usable: the corrupt value is discarded, not fatal.
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /^search$/i })
    .click();
  await expect(page.getByRole('searchbox', { name: /search recipes/i })).toBeVisible();
});

test('AC12 — remove one ingredient and clear the list, both surviving a reload', async ({
  page,
}) => {
  await stub(page, [PIE]);
  await page.goto('/');

  await addRecipe(page, 'Beef Pie');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await page.getByRole('button', { name: 'Remove Salt' }).click();
  await expect(page.locator('.shopping-list__name')).toHaveText(['Beef']);

  // A reload returns to the search view; the list is reached through the nav,
  // which is the point of AC7.
  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(page.locator('.shopping-list__name')).toHaveText(['Beef']);

  // Clearing asks first (R3.8), and declining leaves the list alone.
  await page.getByRole('button', { name: /clear list/i }).click();
  await page.getByRole('button', { name: /keep my list/i }).click();
  await expect(page.locator('.shopping-list__name')).toHaveText(['Beef']);

  await page.getByRole('button', { name: /clear list/i }).click();
  await page.getByRole('button', { name: /yes, clear it/i }).click();
  await expect(page.getByText(/your shopping list is empty/i)).toBeVisible();

  // Confirming removes the trigger for good, so focus has to land somewhere
  // deliberate rather than on <body>.
  await expect(page.locator('.shopping-list')).toBeFocused();

  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();
  await expect(page.getByText(/your shopping list is empty/i)).toBeVisible();
});

test('AC7 — the shopping list is reachable from inside an open recipe', async ({ page }) => {
  await stub(page, [PIE]);
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef pie/i }).click();

  await page
    .getByRole('dialog')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await expect(page.getByRole('heading', { name: /my shopping list/i })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the shopping list fits a 375px viewport without clipping', async ({ page }) => {
  await stub(page, [meal('3', 'Long', [['Pannenkoekenhuisjesbouwvakkersvereniging', '1 kg']])]);
  await page.goto('/');

  await addRecipe(page, 'Long');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  const layout = await page.evaluate(() => ({
    documentOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    clippedNames: [...document.querySelectorAll('.shopping-list__name')].filter(
      (name) => name.scrollWidth > name.clientWidth,
    ).length,
  }));

  expect(layout).toEqual({ documentOverflows: false, clippedNames: 0 });
});
