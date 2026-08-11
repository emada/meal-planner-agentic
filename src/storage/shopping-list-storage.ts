import { z } from 'zod';

import { addIngredients, type ShoppingListEntry } from '../domain/shopping-list';

const STORAGE_KEY = 'meal-planner.shopping-list.v2';
// v1 stored bare measure strings with no source recipe. It is read once and
// migrated so an existing list is not silently discarded.
const LEGACY_KEY = 'meal-planner.shopping-list.v1';

/**
 * localStorage holds whatever anyone put there — a previous version of this
 * app, another tab, a browser extension, or a person typing into devtools.
 * It is a boundary like the API, so it is parsed rather than trusted (R3.7).
 */
const entrySchema = z.object({
  name: z.string().min(1),
  contributions: z.array(z.object({ recipeId: z.string(), measure: z.string() })),
});

const listSchema = z.array(entrySchema);

const legacyListSchema = z.array(
  z.object({ name: z.string().min(1), measures: z.array(z.string()) }),
);

/**
 * Never throws. A shopping list that cannot be read is an empty list, not a
 * blank page: AC10 requires the app to load and stay usable when the stored
 * value is malformed.
 */
function readKey(key: string): unknown {
  let raw: string | null;

  try {
    raw = localStorage.getItem(key);
  } catch {
    // Private-browsing modes and blocked-storage settings throw on access.
    return undefined;
  }

  if (raw === null) return undefined;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function readShoppingList(): ShoppingListEntry[] {
  const current = listSchema.safeParse(readKey(STORAGE_KEY));

  // Two stored entries can share a normalized name if something else wrote
  // them. Merging here means the view never shows one ingredient twice.
  if (current.success) return addIngredients(current.data, [], '');

  const legacy = legacyListSchema.safeParse(readKey(LEGACY_KEY));

  if (!legacy.success) return [];

  // Measures written before sources existed are attributed to a sentinel, so a
  // later add from a real recipe cannot mistake them for its own and drop them.
  return addIngredients(
    legacy.data.map((entry) => ({
      name: entry.name,
      contributions: entry.measures.map((measure) => ({ recipeId: 'legacy', measure })),
    })),
    [],
    '',
  );
}

/** Returns false when the write failed, so the caller can tell the user (R3.7). */
export function writeShoppingList(list: readonly ShoppingListEntry[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    // Quota exceeded, or storage unavailable. The list stays correct in memory;
    // it simply will not survive a reload, and saying so beats pretending.
    return false;
  }
}

export function clearShoppingList(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    return true;
  } catch {
    return false;
  }
}

export const SHOPPING_LIST_STORAGE_KEY = STORAGE_KEY;
