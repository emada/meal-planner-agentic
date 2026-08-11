import type { Ingredient } from './recipe';

/**
 * One measure, and the recipe that asked for it.
 *
 * Tracking the source is what makes a repeated add idempotent: re-adding the
 * same recipe replaces its own contributions instead of appending them again,
 * while two different recipes that each want "1 tsp" still show both.
 */
export interface Contribution {
  readonly recipeId: string;
  readonly measure: string;
}

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
  readonly contributions: readonly Contribution[];
}

/** Grouping key: case- and whitespace-insensitive, per R3.6. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The measures shown under an entry, in contribution order. */
export function measuresOf(entry: ShoppingListEntry): string[] {
  return entry.contributions.map((contribution) => contribution.measure).filter((m) => m !== '');
}

/**
 * Merges a recipe's ingredients into the list, grouping by normalized name and
 * keeping the display form first seen. Alphabetical by name (R3.4),
 * case-insensitively, so "onion" and "Onion" do not sort apart.
 *
 * Adding the same recipe again is idempotent: its previous contributions are
 * dropped first, so a double-click cannot double every line.
 */
export function addIngredients(
  list: readonly ShoppingListEntry[],
  ingredients: readonly Ingredient[],
  recipeId: string,
): ShoppingListEntry[] {
  const byKey = new Map<string, { name: string; contributions: Contribution[] }>();

  for (const entry of list) {
    const key = normalizeName(entry.name);
    const existing = byKey.get(key);
    // Two stored entries can share a normalized name if something outside this
    // app wrote them. Merge rather than overwrite, so no measure is lost.
    const contributions = [
      ...(existing?.contributions ?? []),
      // This recipe is about to re-contribute; drop what it said last time.
      ...entry.contributions.filter((contribution) => contribution.recipeId !== recipeId),
    ];

    byKey.set(key, { name: existing?.name ?? entry.name, contributions });
  }

  for (const ingredient of ingredients) {
    const key = normalizeName(ingredient.name);

    if (key === '') continue;

    const existing = byKey.get(key) ?? { name: ingredient.name.trim(), contributions: [] };

    existing.contributions.push({ recipeId, measure: ingredient.measure.trim() });
    byKey.set(key, existing);
  }

  return sortEntries([...byKey.values()]);
}

export function removeEntry(list: readonly ShoppingListEntry[], name: string): ShoppingListEntry[] {
  const key = normalizeName(name);

  return list.filter((entry) => normalizeName(entry.name) !== key);
}

export function sortEntries(list: readonly ShoppingListEntry[]): ShoppingListEntry[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
