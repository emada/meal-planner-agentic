import { useCallback, useEffect, useRef, useState } from 'react';

import { listCategories, lookupMeal, mealsInCategory } from '../api/themealdb';
import {
  toCategory,
  toRecipe,
  toRecipeSummary,
  type Category,
  type Recipe,
} from '../domain/recipe';
import type { RecipeSummary } from '../domain/recipe';

export type CategoryListState =
  | { status: 'loading' }
  | { status: 'loaded'; categories: readonly Category[] }
  | { status: 'failed'; message: string };

export type CategoryMealsState =
  | { status: 'closed' }
  | { status: 'loading'; category: Category }
  | { status: 'loaded'; category: Category; recipes: readonly RecipeSummary[] }
  | { status: 'failed'; category: Category; message: string };

const messageFrom = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Browsing is three requests, not one: the category list, then the meals in a
 * category, then a lookup for the meal the user picks. The third exists because
 * `filter.php` answers with partial meals — see `mealsInCategory`. Each has its
 * own state so a failure in one does not blank the others: a lookup that fails
 * leaves the grid on screen with an error beside it, rather than throwing the
 * user back to the categories.
 */
export function useCategoryBrowse(onOpenRecipe?: (recipe: Recipe) => void, recipeOpen = false) {
  const [list, setList] = useState<CategoryListState>({ status: 'loading' });
  const [meals, setMeals] = useState<CategoryMealsState>({ status: 'closed' });
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  // Read inside an async callback, so it must be a ref: the closure captured
  // at click time would see whatever was open then, forever.
  const recipeOpenRef = useRef(recipeOpen);
  recipeOpenRef.current = recipeOpen;

  const mealsRequest = useRef<AbortController | null>(null);
  const openRequest = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);

  const loadCategories = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;

    setList({ status: 'loading' });

    try {
      const categories = (await listCategories(controller.signal)).map(toCategory);

      if (controller.signal.aborted) return;

      setList({ status: 'loaded', categories });
    } catch (error) {
      if (controller.signal.aborted) return;

      setList({
        status: 'failed',
        message: messageFrom(error, 'The categories could not be loaded.'),
      });
    }
  }, []);

  useEffect(() => {
    void loadCategories();

    // Abandoning the request on unmount keeps a late response from setting
    // state on a view the user has already left.
    return () => {
      listRequest.current?.abort();
      mealsRequest.current?.abort();
      openRequest.current?.abort();
    };
  }, [loadCategories]);

  const openCategory = useCallback(async (category: Category) => {
    mealsRequest.current?.abort();
    const controller = new AbortController();
    mealsRequest.current = controller;

    setOpenError(null);
    setMeals({ status: 'loading', category });

    try {
      const recipes = (await mealsInCategory(category.name, controller.signal)).map(
        toRecipeSummary,
      );

      if (controller.signal.aborted) return;

      setMeals({ status: 'loaded', category, recipes });
    } catch (error) {
      if (controller.signal.aborted) return;

      setMeals({
        status: 'failed',
        category,
        message: messageFrom(error, `The recipes in ${category.name} could not be loaded.`),
      });
    }
  }, []);

  const closeCategory = useCallback(() => {
    mealsRequest.current?.abort();
    openRequest.current?.abort();
    setOpenError(null);
    setOpeningId(null);
    setMeals({ status: 'closed' });
  }, []);

  const openRecipe = useCallback(
    async (summary: RecipeSummary) => {
      openRequest.current?.abort();
      const controller = new AbortController();
      openRequest.current = controller;

      setOpenError(null);
      setOpeningId(summary.id);

      // Nothing aborts this request when the user opens a recipe by another
      // route — "surprise me" while the lookup is in flight, say. Without this
      // the response lands afterwards and replaces the recipe they are reading,
      // which is the same late-response defect App guards in the other
      // direction for surprise-me.
      const openedBefore = recipeOpenRef.current;

      try {
        const meal = await lookupMeal(summary.id, controller.signal);

        if (controller.signal.aborted) return;

        setOpeningId(null);

        if (!openedBefore && recipeOpenRef.current) return;

        if (meal === null) {
          // A card the user can see, backed by an id the API will not resolve.
          // Saying so beats opening a modal with nothing in it.
          setOpenError(`${summary.title} could not be loaded.`);
          return;
        }

        onOpenRecipe?.(toRecipe(meal));
      } catch (error) {
        if (controller.signal.aborted) return;

        setOpeningId(null);
        // Named, not just "could not reach TheMealDB": the grid stays on screen
        // behind this alert, so the user needs to know which card failed.
        setOpenError(`${summary.title} could not be loaded. ${messageFrom(error, '')}`.trim());
      }
    },
    [onOpenRecipe],
  );

  return {
    list,
    meals,
    openingId,
    openError,
    retryCategories: loadCategories,
    openCategory,
    closeCategory,
    openRecipe,
  };
}
