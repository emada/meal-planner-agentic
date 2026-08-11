import { type Page } from '@playwright/test';
import { expect, test } from './themealdb';

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
  // Counting presses would break whenever the footer changes, so tab until the
  // trap wraps and assert it never left.
  await page.keyboard.press('Tab');
  const close = dialog.getByRole('button', { name: /close recipe/i });
  await expect(close).toBeFocused();

  const controls = await dialog.locator('a[href], button').count();
  for (let step = 0; step < controls; step += 1) {
    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
  }
  await expect(close).toBeFocused();

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
  // A deploy that serves the stylesheet as text/plain renders an unstyled page
  // that passes every content assertion. This must assert something only our
  // own stylesheet can produce: an h1's weight comes from the UA stylesheet and
  // is identical either way.
  await page.goto('/');

  const styling = await page.evaluate(() => ({
    spacingToken: getComputedStyle(document.documentElement).getPropertyValue('--space-4').trim(),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
  }));

  expect(styling.spacingToken).toBe('1rem');
  expect(styling.bodyBackground).not.toBe('rgba(0, 0, 0, 0)');
});

test('that stylesheet assertion fails when the stylesheet does not load', async ({ page }) => {
  // The negative probe for the gate above. Without it the assertion could be
  // vacuous, which is exactly how the production defect went undetected.
  await page.route('**/*.css', (route) =>
    route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' }),
  );
  await page.goto('/');

  const styling = await page.evaluate(() => ({
    spacingToken: getComputedStyle(document.documentElement).getPropertyValue('--space-4').trim(),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
  }));

  expect(styling.spacingToken).toBe('');
  expect(styling.bodyBackground).toBe('rgba(0, 0, 0, 0)');
});
