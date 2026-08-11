import { z } from 'zod';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

/**
 * TheMealDB returns `{"meals": null}` for a search with no matches — not an
 * empty array, and not an error status. Modelling null explicitly is what lets
 * the UI tell "nothing matched" apart from "the request failed" (AC2 vs AC3).
 *
 * Fields are permissive by design: this is third-party data we do not control,
 * and a recipe missing an optional field should render without it rather than
 * fail the whole search.
 */
const mealSchema = z
  .object({
    idMeal: z.string(),
    strMeal: z.string(),
    strMealThumb: z.string().nullish(),
    strCategory: z.string().nullish(),
    strArea: z.string().nullish(),
    strInstructions: z.string().nullish(),
    strYoutube: z.string().nullish(),
    strSource: z.string().nullish(),
  })
  // The twenty ingredient/measure pairs are read positionally by the domain.
  .catchall(z.unknown());

const responseSchema = z.object({
  meals: z.array(mealSchema).nullable(),
});

/**
 * `categories.php` answers under a different key and a different shape from
 * every meal endpoint, so it gets its own schema rather than a widened one that
 * would let a malformed meal response through as an empty category list.
 */
const categorySchema = z.object({
  idCategory: z.string(),
  strCategory: z.string(),
  strCategoryThumb: z.string().nullish(),
  strCategoryDescription: z.string().nullish(),
});

const categoriesResponseSchema = z.object({
  categories: z.array(categorySchema).nullable(),
});

export type Meal = z.infer<typeof mealSchema>;
export type MealCategory = z.infer<typeof categorySchema>;

/** Distinguishes "nothing matched" from "we could not ask", which the UI renders differently. */
export class RecipeApiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'RecipeApiError';
  }
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, signal ? { signal } : {});
  } catch (cause) {
    // Offline, DNS failure, CORS, or an aborted request all land here.
    throw new RecipeApiError('Could not reach TheMealDB.', cause);
  }

  if (!response.ok) {
    throw new RecipeApiError(`TheMealDB responded with ${String(response.status)}.`);
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new RecipeApiError('TheMealDB returned a response that is not JSON.', cause);
  }
}

async function request(url: string, signal?: AbortSignal): Promise<Meal[]> {
  const parsed = responseSchema.safeParse(await fetchJson(url, signal));

  if (!parsed.success) {
    // Unparsed third-party data never reaches ui/ (ADR-0002).
    throw new RecipeApiError('TheMealDB returned an unexpected response shape.', parsed.error);
  }

  return parsed.data.meals ?? [];
}

/** Empty array means the search ran and matched nothing — an AC2 state, not a failure. */
export async function searchRecipes(term: string, signal?: AbortSignal): Promise<Meal[]> {
  return request(`${BASE_URL}/search.php?s=${encodeURIComponent(term)}`, signal);
}

export async function randomMeal(signal?: AbortSignal): Promise<Meal | null> {
  const meals = await request(`${BASE_URL}/random.php`, signal);

  return meals[0] ?? null;
}

/** The category list backing the browse view (AC15). */
export async function listCategories(signal?: AbortSignal): Promise<MealCategory[]> {
  const parsed = categoriesResponseSchema.safeParse(
    await fetchJson(`${BASE_URL}/categories.php`, signal),
  );

  if (!parsed.success) {
    throw new RecipeApiError('TheMealDB returned an unexpected category list.', parsed.error);
  }

  return parsed.data.categories ?? [];
}

/**
 * Meals in a category. Unlike `search.php`, this endpoint answers with partial
 * meals — id, title and thumbnail only, with no category, area, ingredients or
 * instructions — so a caller that needs detail must follow up with
 * `lookupMeal`. Treating these as whole recipes is the defect this comment
 * exists to prevent: the modal would open with an empty ingredient list.
 */
export async function mealsInCategory(category: string, signal?: AbortSignal): Promise<Meal[]> {
  return request(`${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`, signal);
}

/** Full detail for one meal, for opening a partial result from `mealsInCategory`. */
export async function lookupMeal(id: string, signal?: AbortSignal): Promise<Meal | null> {
  const meals = await request(`${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`, signal);

  return meals[0] ?? null;
}
