import { useEffect, useId, useRef, useState } from 'react';

import type { Recipe } from '../domain/recipe';
import { useRecipeSearch } from './useRecipeSearch';

interface SearchViewProps {
  readonly onOpenRecipe?: (recipe: Recipe) => void;
}

export function SearchView({ onOpenRecipe }: SearchViewProps) {
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
            }}
          />
          <button className="button" type="submit">
            Search
          </button>
        </div>
      </form>

      <SearchResults state={state} onRetry={retry} {...(onOpenRecipe ? { onOpenRecipe } : {})} />
    </div>
  );
}

interface SearchResultsProps {
  readonly state: ReturnType<typeof useRecipeSearch>['state'];
  readonly onRetry: () => void;
  readonly onOpenRecipe?: (recipe: Recipe) => void;
}

function SearchResults({ state, onRetry, onOpenRecipe }: SearchResultsProps) {
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
        {state.status === 'idle' && 'Search for a recipe to get started.'}
        {state.status === 'loading' && 'Searching…'}
        {state.status === 'empty' && `No recipes found for ${state.term}. Try another search.`}
        {state.status === 'loaded' &&
          `${String(state.recipes.length)} recipe${state.recipes.length === 1 ? '' : 's'} for ${state.term}.`}
      </p>

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
        <>
          <ul className="grid">
            {state.recipes.map((recipe) => (
              <li key={recipe.id} className="grid__item">
                <RecipeCard recipe={recipe} {...(onOpenRecipe ? { onOpen: onOpenRecipe } : {})} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

interface RecipeCardProps {
  readonly recipe: Recipe;
  readonly onOpen?: (recipe: Recipe) => void;
}

function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  const body = (
    <>
      {recipe.thumbnailUrl !== '' && (
        <img
          className="card__image"
          src={recipe.thumbnailUrl}
          // The title is the accessible name of the button already; repeating
          // it here would have a screen reader announce the recipe twice.
          alt=""
          loading="lazy"
          width={300}
          height={300}
        />
      )}
      <span className="card__body">
        <span className="card__title">{recipe.title}</span>
        <span className="card__meta">
          {[recipe.category, recipe.area].filter(Boolean).join(' · ')}
        </span>
      </span>
    </>
  );

  // Until a slice supplies an open handler, the card is not interactive. A
  // focusable button that does nothing wastes a keyboard user's time and
  // promises an action the app cannot perform.
  return (
    <article className="card">
      {onOpen ? (
        <button
          className="card__button"
          type="button"
          onClick={() => {
            onOpen(recipe);
          }}
        >
          {body}
        </button>
      ) : (
        <div className="card__button card__button--static">{body}</div>
      )}
    </article>
  );
}
