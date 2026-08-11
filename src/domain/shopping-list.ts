import type { Ingredient } from './recipe';

/**
 * A shopping list entry: one ingredient name, and every measure contributed by
 * the recipes that asked for it.
 *
 * SPEC D1 resolved that measures are never converted or summed. "1 tbsp" and
 * "50g" have no common unit, and inventing one would put a wrong quantity in
 * front of someone in a shop.
 */
export interface ShoppingListEntry {
  readonly name: string;
  readonly measures: readonly string[];
}

/** Grouping key: case- and whitespace-insensitive, per R3.6. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Merges ingredients into the list, grouping by normalized name and preserving
 * the display form first seen. Alphabetical by name (R3.4), case-insensitively,
 * so "onion" and "Onion" do not sort into separate neighbourhoods.
 */
export function addIngredients(
  list: readonly ShoppingListEntry[],
  ingredients: readonly Ingredient[],
): ShoppingListEntry[] {
  const byKey = new Map<string, { name: string; measures: string[] }>();

  for (const entry of list) {
    byKey.set(normalizeName(entry.name), { name: entry.name, measures: [...entry.measures] });
  }

  for (const ingredient of ingredients) {
    const key = normalizeName(ingredient.name);

    if (key === '') continue;

    const existing = byKey.get(key) ?? { name: ingredient.name.trim(), measures: [] };
    const measure = ingredient.measure.trim();

    // Adding the same recipe twice should not double every line, but two
    // recipes that genuinely each need "1 tsp" should still show both.
    if (measure !== '') existing.measures.push(measure);

    byKey.set(key, existing);
  }

  return sortEntries([...byKey.values()].map((entry) => ({ ...entry, measures: entry.measures })));
}

export function removeEntry(list: readonly ShoppingListEntry[], name: string): ShoppingListEntry[] {
  const key = normalizeName(name);

  return list.filter((entry) => normalizeName(entry.name) !== key);
}

export function sortEntries(list: readonly ShoppingListEntry[]): ShoppingListEntry[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
