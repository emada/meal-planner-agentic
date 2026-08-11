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

  // Read once on mount rather than in the initializer: the initializer also
  // runs during server rendering or a test without localStorage.
  useEffect(() => {
    setEntries(readShoppingList());
  }, []);

  const persist = useCallback((next: ShoppingListEntry[]) => {
    setEntries(next);
    // The list stays correct in memory even when the write fails; it simply
    // will not survive a reload, and the UI says so rather than pretending.
    setPersistenceFailed(!writeShoppingList(next));
  }, []);

  const add = useCallback((ingredients: readonly Ingredient[]) => {
    setEntries((current) => {
      const next = addIngredients(current, ingredients);
      setPersistenceFailed(!writeShoppingList(next));
      return next;
    });
  }, []);

  const remove = useCallback((name: string) => {
    setEntries((current) => {
      const next = removeEntry(current, name);
      setPersistenceFailed(!writeShoppingList(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    setPersistenceFailed(!clearShoppingList());
  }, []);

  return { entries, add, remove, clear, persist, persistenceFailed };
}
