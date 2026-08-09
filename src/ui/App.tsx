/**
 * Application shell.
 *
 * S0 establishes structure and the document landmarks only. Search, the recipe
 * modal, the shopping list, and navigation arrive in S1 onward.
 */
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Recipe Search &amp; Meal Planner</h1>
      </header>
      <main className="app__main" />
    </div>
  );
}
