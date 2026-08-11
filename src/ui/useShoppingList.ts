import { useCallback, useEffect, useRef, useState } from 'react';

import type { Ingredient } from '../domain/recipe';
import { addIngredients, removeEntry, type ShoppingListEntry } from '../domain/shopping-list';
import {
  clearShoppingList,
  readShoppingList,
  writeShoppingList,
} from '../storage/shopping-list-storage';

export function useShoppingList() {
  const [entries, setEntries] = useState<ShoppingListEntry[]>([]);
  const [persistenceFailed, setPersistenceFailed] = useState(false);
  // Mirrors `entries` so two actions dispatched before React commits the first
  // cannot both compute from the same stale render.
  const latest = useRef<ShoppingListEntry[]>([]);

  // Read once on mount rather than in the initializer, which also runs in
  // environments without localStorage.
  useEffect(() => {
    const stored = readShoppingList();
    latest.current = stored;
    setEntries(stored);
  }, []);

  /**
   * The single write path. React may call a state updater more than once, or
   * during a render it later throws away, so the write happens here in the
   * event callback rather than inside an updater.
   */
  const persist = useCallback((next: ShoppingListEntry[]) => {
    latest.current = next;
    setEntries(next);
    setPersistenceFailed(!writeShoppingList(next));
  }, []);

  const add = useCallback(
    (ingredients: readonly Ingredient[], recipeId: string) => {
      persist(addIngredients(latest.current, ingredients, recipeId));
    },
    [persist],
  );

  const remove = useCallback(
    (name: string) => {
      persist(removeEntry(latest.current, name));
    },
    [persist],
  );

  const clear = useCallback(() => {
    latest.current = [];
    setEntries([]);
    setPersistenceFailed(!clearShoppingList());
  }, []);

  return { entries, add, remove, clear, persistenceFailed };
}
