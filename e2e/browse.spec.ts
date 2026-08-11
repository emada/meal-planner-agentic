import { type Page } from '@playwright/test';
import { expect, json, test } from './themealdb';

/**
 * AC15. The landing view used to be a search box above an empty region, which
 * served only a user who already knew a dish to type. These cover the path from
 * arriving to reading a recipe without typing anything.
 */
const FILTER = 'https://www.themealdb.com/api/json/v1/1/filter.php*';
const LOOKUP = 'https://www.themealdb.com/api/json/v1/1/lookup.php*';
const SEARCH = 'https://www.themealdb.com/api/json/v1/1/search.php*';
const RANDOM = 'https://www.themealdb.com/api/json/v1/1/random.php*';

/** filter.php sends id, title and thumbnail only — no category, area or ingredients. */
const FILTERED = {
  meals: [
    { idMeal: '52874', strMeal: 'Beef Pie', strMealThumb: 'https://x/1.jpg' },
    { idMeal: '52878', strMeal: 'Beef Stew', strMealThumb: 'https://x/2.jpg' },
  ],
};

const FULL = {
  meals: [
    {
      idMeal: '52874',
      strMeal: 'Beef Pie',
      strMealThumb: 'https://x/1.jpg',
      strCategory: 'Beef',
      strArea: 'British',
      strInstructions: 'Brown the beef, then bake it.',
      strIngredient1: 'Beef',
      strMeasure1: '1 kg',
      strIngredient2: 'Onion',
      strMeasure2: '2 chopped',
    },
  ],
};

const stubBrowse = async (page: Page) => {
  await json(page, FILTER, FILTERED);
  await json(page, LOOKUP, FULL);
};

test('AC15 — arriving shows categories to browse, not an empty page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /browse by category/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Seafood' })).toBeVisible();

  // The point of the slice: something to act on before typing anything.
  const main = page.locator('main');
  await expect(main).not.toBeEmpty();
});

test('AC15 — opening a category lists its recipes', async ({ page }) => {
  await stubBrowse(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Beef' }).click();

  await expect(page.getByRole('heading', { name: 'Beef', level: 2 })).toBeVisible();
  await expect(page.getByText('Beef Pie')).toBeVisible();
  await expect(page.getByText('2 recipes in Beef.')).toBeVisible();
});

test('AC15 — a browsed recipe opens with full detail, not the partial filter data', async ({
  page,
}) => {
  await stubBrowse(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Beef' }).click();
  await page.getByRole('button', { name: /beef pie/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // filter.php carried none of this. Without the lookup the modal opens blank.
  await expect(dialog.getByText('Brown the beef, then bake it.')).toBeVisible();
  await expect(dialog.getByText('Beef', { exact: true })).toBeVisible();
  await expect(dialog.getByText('1 kg')).toBeVisible();
});

test('AC15 — a browsed recipe can be added to the shopping list', async ({ page }) => {
  await stubBrowse(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Beef' }).click();
  await page.getByRole('button', { name: /beef pie/i }).click();
  await page.getByRole('button', { name: /add to my shopping list/i }).click();

  await expect(page.getByText(/added 2 ingredients/i)).toBeVisible();

  await page.getByRole('button', { name: /close recipe/i }).click();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  await expect(page.getByText('Beef')).toBeVisible();
  await expect(page.getByText('Onion')).toBeVisible();
});

test('AC15 — returning to the categories from inside one', async ({ page }) => {
  await stubBrowse(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Beef' }).click();
  await expect(page.getByText('Beef Pie')).toBeVisible();

  await page.getByRole('button', { name: /all categories/i }).click();

  await expect(page.getByRole('button', { name: 'Seafood' })).toBeVisible();
  await expect(page.getByText('Beef Pie')).toBeHidden();
});

test('AC15 — returning to the categories from a search', async ({ page }) => {
  await stubBrowse(page);
  await json(page, SEARCH, {
    meals: [{ idMeal: '1', strMeal: 'Sticky Pudding', strMealThumb: 'https://x/3.jpg' }],
  });
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('pudding');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await expect(page.getByText('Sticky Pudding')).toBeVisible();

  await page.getByRole('button', { name: /browse categories/i }).click();

  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();
  await expect(page.getByText('Sticky Pudding')).toBeHidden();
  await expect(page.getByRole('searchbox', { name: /search recipes/i })).toHaveValue('');
});

test('AC15 — browsing is operable by keyboard alone', async ({ page }) => {
  await stubBrowse(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();

  // Tab from the top of the document until the first category tile has focus,
  // so the path a keyboard user actually walks is the one under test.
  const beef = page.getByRole('button', { name: 'Beef' });
  for (let press = 0; press < 12; press += 1) {
    if (await beef.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(beef).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByText('Beef Pie')).toBeVisible();

  const card = page.getByRole('button', { name: /beef pie/i });
  for (let press = 0; press < 12; press += 1) {
    if (await card.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');

  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  // AC5's contract holds for a card opened from the browse grid too.
  await expect(card).toBeFocused();
});

test('AC15 — a failed category list is reported with a retry that works', async ({ page }) => {
  await page.route('https://www.themealdb.com/api/json/v1/1/categories.php*', (route) =>
    route.abort('failed'),
  );
  await page.goto('/');

  await expect(page.getByRole('alert')).toContainText(/could not load the categories/i);

  await json(page, 'https://www.themealdb.com/api/json/v1/1/categories.php*', {
    categories: [{ idCategory: '1', strCategory: 'Beef', strCategoryThumb: '' }],
  });
  await page.getByRole('button', { name: /try again/i }).click();

  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();
});

test('AC15 — a failed recipe lookup names the recipe and leaves the grid up', async ({ page }) => {
  await json(page, FILTER, FILTERED);
  await page.route(LOOKUP, (route) => route.abort('failed'));
  await page.goto('/');

  await page.getByRole('button', { name: 'Beef' }).click();
  await page.getByRole('button', { name: /beef pie/i }).click();

  await expect(page.getByRole('alert')).toContainText(/Beef Pie could not be loaded/i);
  await expect(page.getByRole('dialog')).toBeHidden();
  // The user can pick a different recipe without re-navigating.
  await expect(page.getByText('Beef Stew')).toBeVisible();
});

test('AC13 — the browse view fits a 375px viewport without clipping', async ({ page }) => {
  await stubBrowse(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Beef' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Document-level overflow misses a title clipped inside its own card, which
  // is how the grid fails first.
  const clipped = await page.evaluate(
    () =>
      [...document.querySelectorAll('.card__title')].filter(
        (node) => node.scrollWidth > node.clientWidth + 1,
      ).length,
  );
  expect(clipped).toBe(0);
});

test('a late browse lookup does not replace a recipe the user opened another way', async ({
  page,
}) => {
  await json(page, FILTER, FILTERED);
  await json(page, RANDOM, {
    meals: [
      {
        idMeal: '99',
        strMeal: 'Random Dish',
        strMealThumb: 'https://x/9.jpg',
        strCategory: 'Misc',
        strArea: 'Nowhere',
        strInstructions: 'Improvise.',
        strIngredient1: 'Luck',
        strMeasure1: 'a pinch',
      },
    ],
  });
  // Slow enough that "surprise me" wins the race, which is the point.
  await page.route(LOOKUP, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FULL),
    });
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Beef' }).click();
  await page.getByRole('button', { name: /beef pie/i }).click();

  // The lookup is in flight; the user gives up on it and asks for a random one.
  await page
    .getByRole('navigation')
    .getByRole('button', { name: /surprise me/i })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Random Dish');

  // Covers the wiring App -> SearchView -> CategoryBrowser end to end, which a
  // component test injecting the prop directly cannot see.
  await page.waitForTimeout(1600);
  await expect(page.getByRole('dialog')).toContainText('Random Dish');
  await expect(page.getByRole('dialog')).not.toContainText('Beef Pie');
});
