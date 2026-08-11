import { useCallback, useState } from 'react';

import type { Recipe } from '../domain/recipe';
import { RecipeModal } from './RecipeModal';
import { SearchView } from './SearchView';
import { ShoppingListView } from './ShoppingListView';
import { useShoppingList } from './useShoppingList';
import { useSurpriseMe } from './useSurpriseMe';

type View = 'search' | 'shopping-list';

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
            disabled={surprise.state.status === 'loading'}
            onClick={() => {
              void surprise.surpriseMe();
            }}
          >
            {surprise.state.status === 'loading' ? 'Finding a recipe…' : 'surprise me'}
          </button>
        </nav>

        {surprise.state.status === 'failed' && (
          <div className="app__nav-error" role="alert">
            <p>Could not find a random recipe. {surprise.state.message}</p>
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
                disabled={surprise.state.status === 'loading'}
                onClick={() => {
                  // Replaces the open recipe in place: the modal is already the
                  // right surface, so closing and reopening would only flicker.
                  void surprise.surpriseMe();
                }}
              >
                surprise me
              </button>
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
