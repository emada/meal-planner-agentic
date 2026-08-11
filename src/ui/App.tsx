import { SearchView } from './SearchView';

/**
 * Application shell. S1 adds search; the recipe modal, the shopping list, and
 * "surprise me" navigation arrive in the slices that follow.
 */
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Recipe Search &amp; Meal Planner</h1>
      </header>
      <main className="app__main">
        <SearchView />
      </main>
    </div>
  );
}
