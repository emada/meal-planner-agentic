import { useCallback, useRef, useState } from 'react';

import { searchRecipes } from '../api/themealdb';
import { toRecipe, type Recipe } from '../domain/recipe';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; term: string }
  | { status: 'empty'; term: string }
  | { status: 'loaded'; term: string; recipes: readonly Recipe[] }
  | { status: 'failed'; term: string; message: string };

/**
 * "Nothing matched" and "the request failed" are separate states because the
 * user can act on one and not the other (AC2, AC3). Collapsing them into an
 * empty list is the defect this shape prevents.
 */
export function useRecipeSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim();

    // Clearing the box resets the view, so an in-flight search must be
    // abandoned too. Without this its result lands on top of the idle state and
    // the user sees a grid for a term that is no longer in the search box.
    inFlight.current?.abort();

    if (trimmed === '') {
      inFlight.current = null;
      setState({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    inFlight.current = controller;

    setState({ status: 'loading', term: trimmed });

    try {
      const recipes = (await searchRecipes(trimmed, controller.signal)).map(toRecipe);

      if (controller.signal.aborted) return;

      setState(
        recipes.length === 0
          ? { status: 'empty', term: trimmed }
          : { status: 'loaded', term: trimmed, recipes },
      );
    } catch (error) {
      if (controller.signal.aborted) return;

      setState({
        status: 'failed',
        term: trimmed,
        message: error instanceof Error ? error.message : 'The search could not be completed.',
      });
    }
  }, []);

  const retry = useCallback(() => {
    if (state.status === 'failed') void search(state.term);
  }, [search, state]);

  return { state, search, retry };
}
