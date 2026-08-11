import { test as base, expect, type Page } from '@playwright/test';

/**
 * Every browser test runs against a stubbed TheMealDB. Two reasons: the
 * acceptance criteria are about how the app behaves for each response shape,
 * which a live dependency makes impossible to trigger on demand (AC2, AC3); and
 * the test key is rate-limited, so a suite that called it would fail in ways
 * that have nothing to do with the change under test.
 *
 * The catch-all below is what makes that a guarantee rather than a convention.
 * Before AC15 the app only called TheMealDB after the user acted, so an
 * unstubbed spec simply made no request. The category browser fetches on load,
 * so an unstubbed spec would now reach the live API and pass or fail by
 * accident — the fixture fails it on purpose instead.
 */
const API = 'https://www.themealdb.com/api/**';

export const CATEGORIES = {
  categories: [
    {
      idCategory: '1',
      strCategory: 'Beef',
      strCategoryThumb: 'https://www.themealdb.com/images/category/beef.png',
      strCategoryDescription: 'Meat from cattle.',
    },
    {
      idCategory: '2',
      strCategory: 'Seafood',
      strCategoryThumb: 'https://www.themealdb.com/images/category/seafood.png',
      strCategoryDescription: 'Food from the sea.',
    },
  ],
};

export const json = (page: Page, pattern: string, body: unknown) =>
  page.route(pattern, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );

export const test = base.extend<{ mealdb: null }>({
  mealdb: [
    async ({ page }, use) => {
      const escaped: string[] = [];

      // Registered first, so any route a spec adds later takes precedence:
      // Playwright matches handlers in reverse registration order.
      await page.route(API, (route) => {
        escaped.push(route.request().url());

        return route.abort('blockedbyclient');
      });

      // The browse view loads on arrival, so every spec needs this answered
      // whether or not it is about browsing.
      await json(page, 'https://www.themealdb.com/api/json/v1/1/categories.php*', CATEGORIES);

      await use(null);

      expect(escaped, 'a request reached the live TheMealDB API instead of a stub').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
