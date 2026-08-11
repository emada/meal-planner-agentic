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
function SurpriseError({
  surprise,
  onDismissed,
}: {
  readonly surprise: ReturnType<typeof useSurpriseMe>;
  readonly onDismissed: () => void;
}) {
  const messageRef = useRef<HTMLParagraphElement>(null);

  // The retry unmounts this whole region and a failed retry mounts a fresh one,
  // so restoring focus after the click cannot work. Taking focus is right only
  // when the user has not moved on: a slow request that fails while they are
  // typing in the search box would otherwise pull focus mid-word and discard
  // the keystrokes. role="alert" announces the message either way.
  useEffect(() => {
    const active = document.activeElement;
    const abandoned =
      active === null || active === document.body || active instanceof HTMLBodyElement;
    const onTrigger = active instanceof HTMLElement && active.textContent === 'surprise me';

    if (abandoned || onTrigger) messageRef.current?.focus();
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
      <button
        className="button button--secondary"
        type="button"
        onClick={() => {
          surprise.dismiss();
          // This button unmounts with the region, so name where focus goes.
          requestAnimationFrame(onDismissed);
        }}
      >
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
    // A pending surprise would otherwise re-open the dialog the user just
    // closed, and take focus with it.
    surpriseRef.current?.cancel();
  };

  const openFromSurprise = useCallback((recipe: Recipe) => {
    setOpenRecipe(recipe);
    setAddedRecipeId(null);
  }, []);

  const surprise = useSurpriseMe(openFromSurprise);
  // closeModal is defined before `surprise` exists, so it reaches it through a
  // ref rather than forcing the declaration order.
  const surpriseRef = useRef<ReturnType<typeof useSurpriseMe> | null>(null);
  surpriseRef.current = surprise;
  const navSurpriseRef = useRef<HTMLButtonElement>(null);
  const modalSurpriseRef = useRef<HTMLButtonElement>(null);

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
            ref={navSurpriseRef}
            onClick={() => {
              if (surprise.state.status === 'loading') return;
              void surprise.surpriseMe();
            }}
          >
            surprise me
          </button>
        </nav>

        <p className="app__nav-status" role="status">
          {surprise.state.status === 'loading' && openRecipe === null
            ? 'Finding a random recipe…'
            : ''}
        </p>

        {surprise.state.status === 'failed' && openRecipe === null && (
          <SurpriseError
            surprise={surprise}
            onDismissed={() => {
              navSurpriseRef.current?.focus();
            }}
          />
        )}
      </header>

      <main className="app__main">
        {view === 'search' ? (
          <SearchView
            recipeOpen={openRecipe !== null}
            onOpenRecipe={(recipe) => {
              // The user picked this one; a pending random result must not
              // replace it a moment later.
              surprise.cancel();
              setOpenRecipe(recipe);
              setAddedRecipeId(null);
            }}
          />
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
                ref={modalSurpriseRef}
                onClick={() => {
                  if (surprise.state.status === 'loading') return;
                  // A stale "Added N ingredients" would be re-announced when
                  // this request settles, since both share the status region.
                  setAddedRecipeId(null);
                  // Replaces the open recipe in place: the modal is already the
                  // right surface, so closing and reopening would only flicker.
                  void surprise.surpriseMe();
                }}
              >
                surprise me
              </button>
              {surprise.state.status === 'failed' && (
                <SurpriseError
                  surprise={surprise}
                  onDismissed={() => {
                    modalSurpriseRef.current?.focus();
                  }}
                />
              )}
              <p className="modal__status" role="status">
                {surprise.state.status === 'loading'
                  ? 'Finding a random recipe…'
                  : addedRecipeId === openRecipe.id
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
