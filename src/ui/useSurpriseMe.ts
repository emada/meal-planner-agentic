import { useCallback, useRef, useState } from 'react';

import { randomMeal } from '../api/themealdb';
import { toRecipe, type Recipe } from '../domain/recipe';

export type SurpriseState =
  { status: 'idle' } | { status: 'loading' } | { status: 'failed'; message: string };

/**
 * "Surprise me" opens a random recipe in the same modal as a search result
 * (R4.2), so this owns only the fetch and its failure state — the recipe is
 * handed to the caller, which already knows how to show one.
 */
export function useSurpriseMe(onRecipe: (recipe: Recipe) => void) {
  const [state, setState] = useState<SurpriseState>({ status: 'idle' });
  const inFlight = useRef<AbortController | null>(null);

  const surpriseMe = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setState({ status: 'loading' });

    try {
      const meal = await randomMeal(controller.signal);

      if (controller.signal.aborted) return;

      if (meal === null) {
        // The endpoint answered, but with nothing. Treated as a failure the
        // user can retry rather than a silent no-op.
        setState({ status: 'failed', message: 'TheMealDB did not return a recipe.' });
        return;
      }

      setState({ status: 'idle' });
      onRecipe(toRecipe(meal));
    } catch (error) {
      if (controller.signal.aborted) return;

      setState({
        status: 'failed',
        message: error instanceof Error ? error.message : 'The request could not be completed.',
      });
    }
  }, [onRecipe]);

  const dismiss = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  /**
   * Abandons an in-flight request. Without this a slow result arrives after the
   * user has moved on — opened a recipe they chose, or closed the modal — and
   * replaces what they are looking at, taking focus with it.
   */
  const cancel = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    setState({ status: 'idle' });
  }, []);

  return { state, surpriseMe, dismiss, cancel };
}
