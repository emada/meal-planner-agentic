import { useEffect, useId, useRef, useState } from 'react';

import type { Recipe } from '../domain/recipe';
import { CategoryBrowser } from './CategoryBrowser';
import { RecipeCard } from './RecipeCard';
import { useRecipeSearch } from './useRecipeSearch';

interface SearchViewProps {
  readonly onOpenRecipe?: (recipe: Recipe) => void;
  /** Required for the same reason as on `CategoryBrowser`. */
  readonly recipeOpen: boolean;
}

export function SearchView({ onOpenRecipe, recipeOpen }: SearchViewProps) {
  const { state, search, retry } = useRecipeSearch();
  const [term, setTerm] = useState('');
  const inputId = useId();

  // A form submit is what Enter fires natively (R1.1), and it keeps the search
  // reachable for anyone using a button or an on-screen keyboard.
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void search(term);
  };

  return (
    <div className="search">
      <form className="search__form" onSubmit={submit} role="search">
        <label className="search__label" htmlFor={inputId}>
          Search recipes
        </label>
        <div className="search__controls">
          <input
            id={inputId}
            className="search__input"
            type="search"
            name="term"
            value={term}
            placeholder="beef, pudding, chicken…"
            autoComplete="off"
            onChange={(event) => {
              setTerm(event.target.value);

              // Emptying the box — including through the native clear control,
              // which fires change and not submit — returns the user to the
              // categories instead of leaving stale results under an empty
              // search (AC15).
              if (event.target.value.trim() === '') void search('');
            }}
          />
          <button className="button" type="submit">
            Search
          </button>
        </div>
      </form>

      <SearchResults
        state={state}
        recipeOpen={recipeOpen}
        onRetry={retry}
        onBrowse={() => {
          setTerm('');
          void search('');
        }}
        {...(onOpenRecipe ? { onOpenRecipe } : {})}
      />
    </div>
  );
}

interface SearchResultsProps {
  readonly state: ReturnType<typeof useRecipeSearch>['state'];
  readonly recipeOpen: boolean;
  readonly onRetry: () => void;
  readonly onBrowse: () => void;
  readonly onOpenRecipe?: (recipe: Recipe) => void;
}

function SearchResults({ state, recipeOpen, onRetry, onBrowse, onOpenRecipe }: SearchResultsProps) {
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const wasFailed = useRef(false);

  useEffect(() => {
    // Retry unmounts the button that was focused, which would drop focus to
    // <body> and make the user tab from the top of the document again.
    if (wasFailed.current && state.status === 'loading') summaryRef.current?.focus();
    wasFailed.current = state.status === 'failed';
  }, [state.status]);

  return (
    <section className="results" aria-busy={state.status === 'loading'}>
      {/* Only the summary is announced. A live region wrapping the grid would
          read all thirty card names aloud on every search, and the nested
          role="alert" below would be announced twice. */}
      <p className="results__message" role="status" ref={summaryRef} tabIndex={-1}>
        {state.status === 'idle' && 'Search for a recipe, or browse the categories below.'}
        {state.status === 'loading' && 'Searching…'}
        {state.status === 'empty' && `No recipes found for ${state.term}. Try another search.`}
        {state.status === 'loaded' &&
          `${String(state.recipes.length)} recipe${state.recipes.length === 1 ? '' : 's'} for ${state.term}.`}
      </p>

      {/* Kept out of the status region above so it is not re-announced as part
          of the result summary on every search. */}
      {state.status !== 'idle' && state.status !== 'loading' && (
        <p className="results__browse">
          <button className="button button--secondary" type="button" onClick={onBrowse}>
            Browse categories
          </button>
        </p>
      )}

      {state.status === 'failed' && (
        <div className="results__error" role="alert">
          <p>
            Could not search for {state.term}. {state.message}
          </p>
          <button className="button" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'loaded' && (
        <ul className="grid">
          {state.recipes.map((recipe) => (
            <li key={recipe.id} className="grid__item">
              <RecipeCard recipe={recipe} {...(onOpenRecipe ? { onOpen: onOpenRecipe } : {})} />
            </li>
          ))}
        </ul>
      )}

      {/* Browsing replaces the empty region a first-time visitor used to land
          on, and returns when they clear the box (AC15). */}
      {state.status === 'idle' && (
        <CategoryBrowser recipeOpen={recipeOpen} {...(onOpenRecipe ? { onOpenRecipe } : {})} />
      )}
    </section>
  );
}
