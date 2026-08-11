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

test('closing a surprise returns focus to the trigger, from any view', async ({ page }) => {
  await stubRandom(page, { meals: [meal('8', 'Tarte Tatin')] });
  await page.goto('/');

  await page
    .getByRole('navigation')
    .getByRole('button', { name: /view my shopping list/i })
    .click();

  const trigger = surprise(page);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeFocused();

  await page.keyboard.press('Escape');
  // A `disabled` busy state would have moved focus to <body> before the modal
  // mounted, leaving it nowhere to return to.
  await expect(trigger).toBeFocused();
});

test('replacing the open recipe moves focus to the new dialog', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal('9', 'Beef Pie')] }),
    }),
  );
  await stubRandom(page, { meals: [meal('10', 'Tarte Tatin')] });
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef pie/i }).click();

  await page
    .getByRole('dialog')
    .getByRole('button', { name: /surprise me/i })
    .click();

  // The dialog stays mounted while its recipe swaps, so nothing would move
  // focus or re-announce the new title without an explicit effect.
  await expect(page.getByRole('dialog', { name: /tarte tatin/i })).toBeFocused();
});

test('a failure inside the modal is reachable and actionable there', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal('11', 'Beef Pie')] }),
    }),
  );
  await page.route(RANDOM_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');

  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef pie/i }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /surprise me/i }).click();

  // Rendered in the header it would sit behind the backdrop: a click aimed at
  // "Try again" would close the modal, and the focus trap would hide it.
  await expect(dialog.getByRole('alert')).toContainText(/could not find a random recipe/i);

  await stubRandom(page, { meals: [meal('12', 'Tarte Tatin')] });
  await dialog.getByRole('button', { name: /try again/i }).click();

  await expect(page.getByRole('dialog', { name: /tarte tatin/i })).toBeVisible();
});

test('a failed nav retry keeps focus in the error region', async ({ page }) => {
  await page.route(RANDOM_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');

  await surprise(page).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByRole('button', { name: /try again/i }).click();

  // The retry unmounts its own button; focus must not fall to <body>.
  await expect(page.locator('.app__nav-error p')).toBeFocused();
});

test('a failure does not steal focus from a user who moved on', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal('13', 'Beef Pie')] }),
    }),
  );
  await page.route(RANDOM_ROUTE, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.abort('failed');
  });
  await page.goto('/');

  await surprise(page).click();

  // While the slow request is in flight the user starts typing a search.
  const box = page.getByRole('searchbox', { name: /search recipes/i });
  await box.click();
  await box.pressSequentially('chick');

  await expect(page.getByRole('alert')).toBeVisible();
  await box.pressSequentially('en');

  // Pulling focus mid-word would discard the characters typed after the alert.
  await expect(box).toBeFocused();
  await expect(box).toHaveValue('chicken');
});

test('dismissing the failure returns focus to the trigger', async ({ page }) => {
  await page.route(RANDOM_ROUTE, (route) => route.abort('failed'));
  await page.goto('/');

  const trigger = surprise(page);
  await trigger.click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByRole('button', { name: /dismiss/i }).click();

  // The dismiss button unmounts with the region it sits in.
  await expect(trigger).toBeFocused();
});

test('the busy state is visible and, inside the modal, announced there', async ({ page }) => {
  await page.route(SEARCH_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal('14', 'Beef Pie')] }),
    }),
  );
  await page.route(RANDOM_ROUTE, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [meal('15', 'Tarte Tatin')] }),
    });
  });
  await page.goto('/');

  // Sighted feedback: visible text, not only a dimmed button.
  await surprise(page).click();
  await expect(page.locator('.app__nav-status')).toHaveText(/finding a random recipe/i);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /close recipe/i }).click();

  // aria-modal hides the header from assistive technology, so the in-modal
  // trigger has to announce inside the dialog.
  await page.getByRole('searchbox', { name: /search recipes/i }).fill('beef');
  await page.getByRole('searchbox', { name: /search recipes/i }).press('Enter');
  await page.getByRole('button', { name: /beef pie/i }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /surprise me/i }).click();
  await expect(dialog.locator('.modal__status')).toHaveText(/finding a random recipe/i);
});
