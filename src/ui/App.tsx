import { useCallback, useEffect, useRef, useState } from 'react';

import type { Recipe } from '../domain/recipe';
import { RecipeModal } from './RecipeModal';
import { SearchView } from './SearchView';
import { ShoppingListView } from './ShoppingListView';
import { useShoppingList } from './useShoppingList';
import { useSurpriseMe } from './useSurpriseMe';

type View = 'search' | 'shopping-list';

/**
 * Rendered in the header normally, and inside the modal footer while a recipe
 * is open — outside the dialog it would sit behind the backdrop, where a click
 * aimed at "Try again" closes the modal instead and the focus trap makes it
 * unreachable by keyboard.
 */
function SurpriseError({ surprise }: { readonly surprise: ReturnType<typeof useSurpriseMe> }) {
  const messageRef = useRef<HTMLParagraphElement>(null);

  // The retry unmounts this whole region and a failed retry mounts a fresh one,
  // so restoring focus after the click cannot work. Taking focus when the alert
  // appears is what keeps the user with the thing they must act on -- and they
  // just activated "surprise me", so it is not a surprise hijack.
  useEffect(() => {
    messageRef.current?.focus();
  }, []);

  return (
    <div className="app__nav-error" role="alert">
      <p ref={messageRef} tabIndex={-1}>
        Could not find a random recipe.{' '}
        {surprise.state.status === 'failed' ? surprise.state.message : ''}
      </p>
      <button
        className="button"
        type="button"
        onClick={() => {
          void surprise.surpriseMe();
        }}
      >
        Try again
      </button>
      <button className="button button--secondary" type="button" onClick={surprise.dismiss}>
        Dismiss
      </button>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>('search');
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [addedRecipeId, setAddedRecipeId] = useState<string | null>(null);
  const shoppingList = useShoppingList();

  const closeModal = () => {
    setOpenRecipe(null);
    setAddedRecipeId(null);
  };

  const openFromSurprise = useCallback((recipe: Recipe) => {
    setOpenRecipe(recipe);
    setAddedRecipeId(null);
  }, []);

  const surprise = useSurpriseMe(openFromSurprise);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Recipe Search &amp; Meal Planner</h1>

        {/* Search, the shopping list, and "surprise me" reachable from every
            view, and from inside an open modal through its footer (R4.1). */}
        <nav className="app__nav" aria-label="Main">
          <button
            className="button button--secondary"
            type="button"
            aria-current={view === 'search' ? 'page' : undefined}
            onClick={() => {
              setView('search');
            }}
          >
            Search
          </button>
          <button
            className="button button--secondary"
            type="button"
            aria-current={view === 'shopping-list' ? 'page' : undefined}
            onClick={() => {
              setView('shopping-list');
            }}
          >
            view my shopping list
            {shoppingList.entries.length > 0 && (
              <span className="app__nav-count"> ({shoppingList.entries.length})</span>
            )}
          </button>
          <button
            className="button button--secondary"
            type="button"
            // Not `disabled`: the browser moves focus off a disabled element,
            // so the modal would capture <body> as its restore target and the
            // user would lose their place on close.
            aria-disabled={surprise.state.status === 'loading'}
            onClick={() => {
              if (surprise.state.status === 'loading') return;
              void surprise.surpriseMe();
            }}
          >
            surprise me
          </button>
        </nav>

        <p className="visually-hidden" role="status">
          {surprise.state.status === 'loading' ? 'Finding a random recipe…' : ''}
        </p>

        {surprise.state.status === 'failed' && openRecipe === null && (
          <SurpriseError surprise={surprise} />
        )}
      </header>

      <main className="app__main">
        {view === 'search' ? (
          <SearchView onOpenRecipe={setOpenRecipe} />
        ) : (
          <ShoppingListView
            entries={shoppingList.entries}
            onRemove={shoppingList.remove}
            onClear={shoppingList.clear}
            persistenceFailed={shoppingList.persistenceFailed}
          />
        )}
      </main>

      {openRecipe !== null && (
        <RecipeModal
          recipe={openRecipe}
          onClose={closeModal}
          footer={
            <div className="modal__actions">
              <button
                className="button"
                type="button"
                onClick={() => {
                  shoppingList.add(openRecipe.ingredients, openRecipe.id);
                  // Confirm in place rather than closing: the user may want to
                  // read the instructions next, and a silent click reads as
                  // nothing having happened.
                  setAddedRecipeId(openRecipe.id);
                }}
              >
                add to my shopping list
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  setView('shopping-list');
                  closeModal();
                }}
              >
                view my shopping list
              </button>
              <button
                className="button button--secondary"
                type="button"
                aria-disabled={surprise.state.status === 'loading'}
                onClick={() => {
                  if (surprise.state.status === 'loading') return;
                  // Replaces the open recipe in place: the modal is already the
                  // right surface, so closing and reopening would only flicker.
                  void surprise.surpriseMe();
                }}
              >
                surprise me
              </button>
              {surprise.state.status === 'failed' && <SurpriseError surprise={surprise} />}
              <p className="modal__status" role="status">
                {addedRecipeId === openRecipe.id
                  ? `Added ${String(openRecipe.ingredients.length)} ingredient${
                      openRecipe.ingredients.length === 1 ? '' : 's'
                    } to your shopping list.`
                  : ''}
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
