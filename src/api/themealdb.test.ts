import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RecipeApiError,
  listCategories,
  lookupMeal,
  mealsInCategory,
  randomMeal,
  searchRecipes,
} from './themealdb';

const meal = (overrides: Record<string, unknown> = {}) => ({
  idMeal: '52874',
  strMeal: 'Beef and Mustard Pie',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/sytuqu.jpg',
  strCategory: 'Beef',
  strArea: 'British',
  strInstructions: 'Preheat the oven.',
  strYoutube: 'https://www.youtube.com/watch?v=abc',
  strSource: '',
  strIngredient1: 'Beef',
  strMeasure1: '1 kg',
  strIngredient2: '',
  strMeasure2: '',
  ...overrides,
});

const respond = (body: unknown, init: { ok?: boolean; status?: number } = {}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  );
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchRecipes', () => {
  it('returns the validated meal', async () => {
    respond({ meals: [meal()] });

    const [validated] = await searchRecipes('beef');

    expect(validated).toMatchObject({
      idMeal: '52874',
      strMeal: 'Beef and Mustard Pie',
      strCategory: 'Beef',
      strArea: 'British',
    });
  });

  it('returns an empty array when the API reports no matches', async () => {
    // TheMealDB answers a miss with {"meals": null}, not an empty array. If this
    // were treated as a failure the UI would show an error for a valid search.
    respond({ meals: null });

    await expect(searchRecipes('zzzzz')).resolves.toEqual([]);
  });

  it('encodes the search term', async () => {
    respond({ meals: null });

    await searchRecipes('chicken & rice');

    expect(fetch).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/search.php?s=chicken%20%26%20rice',
      {},
    );
  });

  it('throws when the network is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(searchRecipes('beef')).rejects.toBeInstanceOf(RecipeApiError);
  });

  it('throws on a non-ok status', async () => {
    respond({}, { ok: false, status: 503 });

    await expect(searchRecipes('beef')).rejects.toThrow('503');
  });

  it('throws when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );

    await expect(searchRecipes('beef')).rejects.toThrow('not JSON');
  });

  it('rejects a response whose shape does not match, rather than passing it through', async () => {
    // Unparsed third-party data must never reach ui/ (ADR-0002).
    respond({ meals: [{ strMeal: 'No id' }] });

    await expect(searchRecipes('beef')).rejects.toThrow('unexpected response shape');
  });

  it('tolerates a meal missing every optional field', async () => {
    respond({
      meals: [{ idMeal: '1', strMeal: 'Sparse', strIngredient1: 'Water', strMeasure1: '1 cup' }],
    });

    const [validated] = await searchRecipes('sparse');

    expect(validated).toMatchObject({ idMeal: '1', strMeal: 'Sparse' });
  });
});

describe('randomMeal', () => {
  it('returns the single meal the endpoint provides', async () => {
    respond({ meals: [meal()] });

    await expect(randomMeal()).resolves.toMatchObject({ idMeal: '52874' });
  });

  it('returns null when the endpoint provides nothing', async () => {
    respond({ meals: null });

    await expect(randomMeal()).resolves.toBeNull();
  });
});

describe('listCategories', () => {
  it('returns the categories the endpoint provides', async () => {
    respond({ categories: [{ idCategory: '1', strCategory: 'Beef', strCategoryThumb: 'x.png' }] });

    await expect(listCategories()).resolves.toEqual([
      { idCategory: '1', strCategory: 'Beef', strCategoryThumb: 'x.png' },
    ]);
  });

  it('returns an empty list when the endpoint answers with null', async () => {
    respond({ categories: null });

    await expect(listCategories()).resolves.toEqual([]);
  });

  it('rejects a meal response rather than reading it as an empty category list', async () => {
    // A widened schema would let this through as `[]`, and the browse view
    // would render "no categories" instead of reporting a broken response.
    respond({ meals: [meal()] });

    await expect(listCategories()).rejects.toThrow('unexpected category list');
  });

  it('rejects a category missing its name', async () => {
    respond({ categories: [{ idCategory: '1' }] });

    await expect(listCategories()).rejects.toThrow(RecipeApiError);
  });

  it('requests the category endpoint', async () => {
    respond({ categories: [] });

    await listCategories();

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/categories.php'), {});
  });
});

describe('mealsInCategory', () => {
  it('returns the partial meals the filter endpoint provides', async () => {
    respond({ meals: [{ idMeal: '1', strMeal: 'Acaraje', strMealThumb: 'a.jpg', strArea: null }] });

    // No category, ingredients or instructions: the filter endpoint does not
    // send them, and the schema must not require what the API omits.
    await expect(mealsInCategory('Seafood')).resolves.toHaveLength(1);
  });

  it('encodes a category name containing a space', async () => {
    respond({ meals: null });

    await mealsInCategory('Side Dish');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('c=Side%20Dish'), {});
  });

  it('returns an empty list for a category with no meals', async () => {
    respond({ meals: null });

    await expect(mealsInCategory('Nothing')).resolves.toEqual([]);
  });
});

describe('lookupMeal', () => {
  it('returns the single meal the endpoint provides', async () => {
    respond({ meals: [meal()] });

    await expect(lookupMeal('52874')).resolves.toMatchObject({ idMeal: '52874' });
  });

  it('returns null for an id the API will not resolve', async () => {
    respond({ meals: null });

    await expect(lookupMeal('nope')).resolves.toBeNull();
  });

  it('encodes the id it is given', async () => {
    respond({ meals: null });

    await lookupMeal('a b&c');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('i=a%20b%26c'), {});
  });
});
