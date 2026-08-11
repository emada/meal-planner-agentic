import type { Recipe } from '../domain/recipe';
import { RecipeCard } from './RecipeCard';
import { useCategoryBrowse } from './useCategoryBrowse';

interface CategoryBrowserProps {
  readonly onOpenRecipe?: (recipe: Recipe) => void;
  /** True while a recipe modal is open, from any route (see `useCategoryBrowse`). */
  readonly recipeOpen?: boolean;
}

/**
 * What a user sees before they have searched for anything (AC15).
 *
 * `GOAL.md` asks for navigating recipes as well as finding them. A search box
 * over an empty region serves only the user who already knows a dish to type;
 * this gives everyone else somewhere to start.
 */
export function CategoryBrowser({ onOpenRecipe, recipeOpen = false }: CategoryBrowserProps) {
  const browse = useCategoryBrowse(onOpenRecipe, recipeOpen);
  const { list, meals } = browse;

  return (
    <section className="browse" aria-labelledby="browse-heading">
      <h2 className="browse__heading" id="browse-heading">
        {meals.status === 'closed' ? 'Browse by category' : meals.category.name}
      </h2>

      {meals.status !== 'closed' && (
        <div className="browse__crumb">
          <button className="button button--secondary" type="button" onClick={browse.closeCategory}>
            All categories
          </button>
          {meals.category.description !== '' && (
            <p className="browse__description">{meals.category.description}</p>
          )}
        </div>
      )}

      {/* One status region for the whole browse area. Two would interrupt each
          other, and a screen reader would hear the category list and the meal
          grid announced over one another. */}
      <p className="browse__message" role="status">
        {meals.status === 'closed' && list.status === 'loading' && 'Loading categories…'}
        {/* An empty list is a real answer from the API, and an empty grid with
            no message reads as a broken page. */}
        {meals.status === 'closed' &&
          list.status === 'loaded' &&
          list.categories.length === 0 &&
          'No categories are available right now. Search for a recipe instead.'}
        {meals.status === 'loading' && `Loading ${meals.category.name} recipes…`}
        {meals.status === 'loaded' &&
          `${String(meals.recipes.length)} recipe${meals.recipes.length === 1 ? '' : 's'} in ${meals.category.name}.`}
      </p>

      {meals.status === 'closed' && list.status === 'failed' && (
        <div className="browse__error" role="alert">
          <p>Could not load the categories. {list.message}</p>
          <button
            className="button"
            type="button"
            onClick={() => {
              void browse.retryCategories();
            }}
          >
            Try again
          </button>
        </div>
      )}

      {meals.status === 'failed' && (
        <div className="browse__error" role="alert">
          <p>
            Could not load {meals.category.name}. {meals.message}
          </p>
          <button
            className="button"
            type="button"
            onClick={() => {
              void browse.openCategory(meals.category);
            }}
          >
            Try again
          </button>
        </div>
      )}

      {browse.openError !== null && (
        <div className="browse__error" role="alert">
          <p>{browse.openError}</p>
        </div>
      )}

      {meals.status === 'closed' && list.status === 'loaded' && list.categories.length > 0 && (
        <ul className="grid grid--categories">
          {list.categories.map((category) => (
            <li key={category.id} className="grid__item">
              <article className="card">
                <button
                  className="card__button"
                  type="button"
                  onClick={() => {
                    void browse.openCategory(category);
                  }}
                >
                  {category.thumbnailUrl !== '' && (
                    <img
                      className="card__image card__image--category"
                      src={category.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      width={300}
                      height={300}
                    />
                  )}
                  <span className="card__body">
                    <span className="card__title">{category.name}</span>
                  </span>
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}

      {meals.status === 'loaded' && (
        <ul className="grid">
          {meals.recipes.map((recipe) => (
            <li key={recipe.id} className="grid__item">
              <RecipeCard
                recipe={recipe}
                busy={browse.openingId === recipe.id}
                onOpen={(summary) => {
                  void browse.openRecipe(summary);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
