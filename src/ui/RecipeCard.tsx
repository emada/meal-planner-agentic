import type { RecipeSummary } from '../domain/recipe';

interface RecipeCardProps<T extends RecipeSummary> {
  readonly recipe: T;
  readonly onOpen?: (recipe: T) => void;
  /** Set while a detail lookup for this card is in flight (AC15). */
  readonly busy?: boolean;
}

/**
 * Shared by the search grid and the category grid so the two cannot drift apart
 * visually or in their accessible names.
 *
 * Typed over `RecipeSummary` rather than `Recipe`: a category result carries no
 * ingredients or instructions, and the card needs neither. The generic keeps
 * the search grid's handler receiving a full `Recipe`.
 */
export function RecipeCard<T extends RecipeSummary>({ recipe, onOpen, busy }: RecipeCardProps<T>) {
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
          {busy === true && 'Opening…'}
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
          // Not `disabled`: the browser would move focus off the card the user
          // just activated, so they would lose their place while waiting.
          aria-disabled={busy === true}
          onClick={() => {
            if (busy === true) return;
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
