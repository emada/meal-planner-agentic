import { useState } from 'react';

import type { Recipe } from '../domain/recipe';
import { RecipeModal } from './RecipeModal';
import { SearchView } from './SearchView';

/**
 * Application shell. S2 wires the recipe modal to the results grid; the
 * shopping list and "surprise me" navigation arrive in the slices that follow.
 */
export function App() {
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Recipe Search &amp; Meal Planner</h1>
      </header>
      <main className="app__main">
        <SearchView onOpenRecipe={setOpenRecipe} />
      </main>

      {openRecipe !== null && (
        <RecipeModal
          recipe={openRecipe}
          onClose={() => {
            setOpenRecipe(null);
          }}
        />
      )}
    </div>
  );
}
