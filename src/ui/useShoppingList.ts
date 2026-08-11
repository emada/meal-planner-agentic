import { useCallback, useEffect, useState } from 'react';

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

  // Read once on mount rather than in the initializer, which also runs in
  // environments without localStorage.
  useEffect(() => {
    setEntries(readShoppingList());
  }, []);

  /**
   * The single write path. React may call a state updater more than once, or
   * during a render it later throws away, so the write happens here in the
   * event callback rather than inside an updater.
   */
  const persist = useCallback((next: ShoppingListEntry[]) => {
    setEntries(next);
    setPersistenceFailed(!writeShoppingList(next));
  }, []);

  const add = useCallback(
    (ingredients: readonly Ingredient[], recipeId: string) => {
      persist(addIngredients(entries, ingredients, recipeId));
    },
    [entries, persist],
  );

  const remove = useCallback(
    (name: string) => {
      persist(removeEntry(entries, name));
    },
    [entries, persist],
  );

  const clear = useCallback(() => {
    setEntries([]);
    setPersistenceFailed(!clearShoppingList());
  }, []);

  return { entries, add, remove, clear, persistenceFailed };
}
