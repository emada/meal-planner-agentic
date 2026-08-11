import { z } from 'zod';

import { sortEntries, type ShoppingListEntry } from '../domain/shopping-list';

const STORAGE_KEY = 'meal-planner.shopping-list.v1';

/**
 * localStorage holds whatever anyone put there — a previous version of this
 * app, another tab, a browser extension, or a person typing into devtools.
 * It is a boundary like the API, so it is parsed rather than trusted (R3.7).
 */
const entrySchema = z.object({
  name: z.string().min(1),
  measures: z.array(z.string()),
});

const listSchema = z.array(entrySchema);

/**
 * Never throws. A shopping list that cannot be read is an empty list, not a
 * blank page: AC10 requires the app to load and stay usable when the stored
 * value is malformed.
 */
export function readShoppingList(): ShoppingListEntry[] {
  let raw: string | null;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private-browsing modes and blocked-storage settings throw on access.
    return [];
  }

  if (raw === null) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const result = listSchema.safeParse(parsed);

  return result.success ? sortEntries(result.data) : [];
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
    return true;
  } catch {
    return false;
  }
}

export const SHOPPING_LIST_STORAGE_KEY = STORAGE_KEY;
