import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipeApiError, randomMeal, searchRecipes } from './themealdb';

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
