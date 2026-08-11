/**
 * The recipe shape the application works with, and the pure logic that derives
 * it. No I/O, no React, no imports from siblings (ADR-0002).
 */

export interface Ingredient {
  readonly name: string;
  readonly measure: string;
}

export interface RecipeSummary {
  readonly id: string;
  readonly title: string;
  readonly thumbnailUrl: string;
  readonly category: string;
  readonly area: string;
}

export interface Recipe extends RecipeSummary {
  readonly instructions: string;
  readonly ingredients: readonly Ingredient[];
  readonly youtubeUrl: string | null;
  readonly sourceUrl: string | null;
}

/**
 * TheMealDB carries ingredients as twenty parallel `strIngredient`/`strMeasure`
 * field pairs, most of them empty. A recipe with four ingredients still ships
 * sixteen pairs of `""` and `null`, and some carry only whitespace, so a naive
 * read renders blank rows (AC4).
 */
export function extractIngredients(
  fields: Readonly<Record<string, string | null | undefined>>,
  slots = 20,
): Ingredient[] {
  const ingredients: Ingredient[] = [];

  for (let slot = 1; slot <= slots; slot += 1) {
    const name = (fields[`strIngredient${String(slot)}`] ?? '').trim();
    const measure = (fields[`strMeasure${String(slot)}`] ?? '').trim();

    // A measure without an ingredient names nothing and cannot be shopped for.
    if (name === '') continue;

    ingredients.push({ name, measure });
  }

  return ingredients;
}

/**
 * Optional link fields arrive as `""` or `null` as often as they arrive as a
 * URL. Rendering an anchor to an empty string produces a link to the current
 * page, which is worse than showing nothing (R2.3).
 */
export function optionalUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();

  return trimmed === '' ? null : trimmed;
}

/** A browsable category, derived from a validated TheMealDB category (AC15). */
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly thumbnailUrl: string;
  readonly description: string;
}

function trimmed(source: Readonly<Record<string, unknown>>, key: string): string {
  const value = source[key];

  return typeof value === 'string' ? value.trim() : '';
}

export function toCategory(category: Readonly<Record<string, unknown>>): Category {
  return {
    id: trimmed(category, 'idCategory'),
    name: trimmed(category, 'strCategory'),
    thumbnailUrl: optionalUrl(trimmed(category, 'strCategoryThumb')) ?? '',
    description: trimmed(category, 'strCategoryDescription'),
  };
}

/**
 * Builds the card-sized shape from a validated meal.
 *
 * `filter.php` answers with id, title and thumbnail only. Mapping those through
 * `toRecipe` would produce a `Recipe` whose ingredient list is legitimately
 * empty, and nothing downstream could tell that apart from a recipe that truly
 * has no ingredients — so the modal would open blank. Returning the narrower
 * type instead makes the missing detail a compile error at every call site that
 * needs it (AC15).
 */
export function toRecipeSummary(meal: Readonly<Record<string, unknown>>): RecipeSummary {
  return {
    id: trimmed(meal, 'idMeal'),
    title: trimmed(meal, 'strMeal'),
    thumbnailUrl: optionalUrl(trimmed(meal, 'strMealThumb')) ?? '',
    category: trimmed(meal, 'strCategory'),
    area: trimmed(meal, 'strArea'),
  };
}

/**
 * Builds the recipe shape from a validated TheMealDB meal.
 *
 * This lives in `domain/` rather than in `api/` because ADR-0002 forbids `api/`
 * from importing a sibling: the client validates and hands back plain data, and
 * the mapping to our own vocabulary is pure logic that belongs here. The input
 * is typed structurally so the dependency runs one way only.
 */
export function toRecipe(meal: Readonly<Record<string, unknown>>): Recipe {
  const text = (key: string): string => trimmed(meal, key);

  const stringFields: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(meal)) {
    if (typeof value === 'string' || value === null) stringFields[key] = value;
  }

  return {
    ...toRecipeSummary(meal),
    instructions: text('strInstructions'),
    ingredients: extractIngredients(stringFields),
    youtubeUrl: optionalUrl(text('strYoutube')),
    sourceUrl: optionalUrl(text('strSource')),
  };
}
