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

export type Meal = z.infer<typeof mealSchema>;

/** Distinguishes "nothing matched" from "we could not ask", which the UI renders differently. */
export class RecipeApiError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'RecipeApiError';
  }
}

async function request(url: string, signal?: AbortSignal): Promise<Meal[]> {
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

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (cause) {
    throw new RecipeApiError('TheMealDB returned a response that is not JSON.', cause);
  }

  const parsed = responseSchema.safeParse(payload);

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
