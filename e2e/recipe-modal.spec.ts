import { expect, test, type Page } from '@playwright/test';

const SEARCH_ROUTE = 'https://www.themealdb.com/api/json/v1/1/search.php*';

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
  // Empty and whitespace-only slots must not become blank rows (AC4).
  strIngredient3: '',
  strMeasure3: 'to taste',
  strIngredient4: '   ',
  strMeasure4: '   ',
};

const openRecipe = async (page: Page) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal] }),
    }),
  );
  await page.goto('/');
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef and mustard pie/i }).click();
};

test('AC4 — the modal shows ingredients, instructions and both links, with no blank rows', async ({
  page,
}) => {
  await openRecipe(page);

  const dialog = page.getByRole('dialog', { name: /beef and mustard pie/i });
  await expect(dialog).toBeVisible();

  // Two filled slots out of four: the empty name and the whitespace-only pair
  // are dropped rather than rendered as blank rows.
  await expect(dialog.getByRole('listitem')).toHaveCount(2);
  await expect(dialog.getByText('1 kg')).toBeVisible();
  await expect(dialog.getByText('Preheat the oven.')).toBeVisible();

  const youtube = dialog.getByRole('link', { name: /watch on youtube/i });
  await expect(youtube).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc');
  await expect(youtube).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(dialog.getByRole('link', { name: /original source/i })).toBeVisible();
});

test('AC5 — the modal is operable by keyboard alone and restores focus on close', async ({
  page,
}) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal] }),
    }),
  );
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');

  const card = page.getByRole('button', { name: /beef and mustard pie/i });
  await card.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeFocused();

  // Tab cycles inside the dialog rather than reaching the page behind it.
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: /close recipe/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: /close recipe/i })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeFocused();
});

test('the modal fits a 375px viewport without horizontal overflow', async ({ page }) => {
  await openRecipe(page);
  await expect(page.getByRole('dialog')).toBeVisible();

  const layout = await page.evaluate(() => ({
    documentOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    clippedTitles: [...document.querySelectorAll('.modal__title')].filter(
      (title) => title.scrollWidth > title.clientWidth,
    ).length,
  }));

  expect(layout).toEqual({ documentOverflows: false, clippedTitles: 0 });
});

test('the stylesheet is served as CSS and actually applies', async ({ page }) => {
  // A deploy that serves the stylesheet with the wrong MIME type renders an
  // unstyled page that still passes every content assertion. This catches it.
  await page.goto('/');

  const applied = await page.evaluate(() => {
    const header = document.querySelector('.app__header h1');
    return header ? getComputedStyle(header).fontWeight : '';
  });

  expect(applied).not.toBe('');
  expect(Number(applied)).toBeGreaterThanOrEqual(600);
});
