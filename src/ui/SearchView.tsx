import { useId, useState } from 'react';

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
  // Every state change is announced: a sighted user sees the grid change, and
  // this is the equivalent for a screen reader.
  return (
    <section className="results" aria-live="polite" aria-busy={state.status === 'loading'}>
      {state.status === 'idle' && (
        <p className="results__message">Search for a recipe to get started.</p>
      )}

      {state.status === 'loading' && <p className="results__message">Searching…</p>}

      {state.status === 'empty' && (
        <p className="results__message">
          No recipes found for <strong>{state.term}</strong>. Try another search.
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
        <>
          <p className="results__message">
            {state.recipes.length} recipe{state.recipes.length === 1 ? '' : 's'} for{' '}
            <strong>{state.term}</strong>.
          </p>
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
  return (
    <article className="card">
      <button
        className="card__button"
        type="button"
        onClick={() => {
          onOpen?.(recipe);
        }}
      >
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
      </button>
    </article>
  );
}
