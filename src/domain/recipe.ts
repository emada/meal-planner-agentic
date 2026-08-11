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

/**
 * Builds the domain shape from a validated TheMealDB meal.
 *
 * This lives in `domain/` rather than in `api/` because ADR-0002 forbids `api/`
 * from importing a sibling: the client validates and hands back plain data, and
 * the mapping to our own vocabulary is pure logic that belongs here. The input
 * is typed structurally so the dependency runs one way only.
 */
export function toRecipe(meal: Readonly<Record<string, unknown>>): Recipe {
  const text = (key: string): string => {
    const value = meal[key];

    return typeof value === 'string' ? value.trim() : '';
  };

  const stringFields: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(meal)) {
    if (typeof value === 'string' || value === null) stringFields[key] = value;
  }

  return {
    id: text('idMeal'),
    title: text('strMeal'),
    thumbnailUrl: optionalUrl(text('strMealThumb')) ?? '',
    category: text('strCategory'),
    area: text('strArea'),
    instructions: text('strInstructions'),
    ingredients: extractIngredients(stringFields),
    youtubeUrl: optionalUrl(text('strYoutube')),
    sourceUrl: optionalUrl(text('strSource')),
  };
}
