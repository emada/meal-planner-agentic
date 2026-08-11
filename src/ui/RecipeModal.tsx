import { useEffect, useId, useRef } from 'react';

import type { Recipe } from '../domain/recipe';

interface RecipeModalProps {
  readonly recipe: Recipe;
  readonly onClose: () => void;
  readonly footer?: React.ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * A hidden control cannot take focus, so it cannot bound the trap — and a
 * phantom boundary is worse than none, because the real last control then never
 * matches the wrap condition and Tab leaves the dialog.
 *
 * `checkVisibility` is the only check that sees a hidden *ancestor*; `hidden`
 * and computed `display` are direct-only, and `visibility` is the sole
 * inherited one. jsdom does not implement it, hence the fallback.
 */
const isFocusable = (element: HTMLElement) => {
  if (element.hidden) return false;

  if (typeof element.checkVisibility === 'function') {
    return element.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true });
  }

  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);

    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }

  return true;
};

/**
 * Dialog pattern per SPEC R2.4: focus moves in on open, is trapped while open,
 * Escape closes, and focus returns to whatever opened it.
 *
 * Implemented by hand rather than with `<dialog>`: `showModal()` cannot be
 * driven declaratively from React state without an effect that fights the
 * browser's own open/close bookkeeping, and its backdrop is not stylable in
 * every browser we target.
 */
export function RecipeModal({ recipe, onClose, footer }: RecipeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const restoreFocusTo = useRef<Element | null>(null);

  useEffect(() => {
    restoreFocusTo.current = document.activeElement;
    // Focus the dialog itself rather than its first control: a screen reader
    // then announces the recipe title before any button.
    dialogRef.current?.focus();

    return () => {
      const target = restoreFocusTo.current;

      // The trigger can be gone by the time the dialog closes — a new search
      // replaces the grid. focus() on a detached node silently does nothing,
      // dropping the keyboard user back to the top of the document.
      if (target instanceof HTMLElement && target.isConnected && target !== document.body) {
        target.focus();
        return;
      }

      document.querySelector<HTMLElement>('.results__message')?.focus();
    };
  }, []);

  // Keyed on the recipe: "surprise me" from the footer swaps the recipe while
  // the dialog stays mounted, so the mount-only effect above never re-runs.
  // Without this, focus is left wherever the trigger was and the dialog's
  // accessible name changes silently.
  useEffect(() => {
    dialogRef.current?.focus();
  }, [recipe.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Stand down when something already consumed this key — a capture-phase
      // or nested handler. Note this does not by itself order two dialogs
      // built from this component: both listen on document in the bubble
      // phase, so the earlier-mounted one runs first. True stacking needs a
      // topmost-dialog check, and gets one when a second dialog lands.
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isFocusable);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Nothing focusable inside: keep focus on the dialog rather than letting
      // Tab escape to the page behind it.
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      // Focus can leave the document entirely — the address bar, or Cmd-L —
      // and return to <body>. Tabbing from there matches none of the wrap
      // conditions below, so without this the next Tab lands in the page
      // behind an aria-modal dialog.
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="modal__backdrop"
      // Presentational: clicking the backdrop is a mouse convenience that
      // duplicates the close button and Escape, both of which are the
      // keyboard-accessible paths. It carries no role or focus of its own.
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal__header">
          <h2 className="modal__title" id={headingId}>
            {recipe.title}
          </h2>
          <button
            className="modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close recipe"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="modal__body">
          {recipe.thumbnailUrl !== '' && (
            <img
              className="modal__image"
              src={recipe.thumbnailUrl}
              alt=""
              width={400}
              height={400}
            />
          )}

          <p className="modal__meta">
            {[recipe.category, recipe.area].filter(Boolean).join(' · ')}
          </p>

          <section aria-labelledby={`${headingId}-ingredients`}>
            <h3 id={`${headingId}-ingredients`}>Ingredients</h3>
            {recipe.ingredients.length === 0 ? (
              <p className="modal__empty">This recipe lists no ingredients.</p>
            ) : (
              <ul className="ingredients">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient.name}-${String(index)}`} className="ingredients__item">
                    <span className="ingredients__name">{ingredient.name}</span>
                    {ingredient.measure !== '' && (
                      <span className="ingredients__measure">{ingredient.measure}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby={`${headingId}-instructions`}>
            <h3 id={`${headingId}-instructions`}>Instructions</h3>
            {/* Rendered as text nodes, never as markup: this is third-party
                content and threat T1 is injection through it. */}
            {recipe.instructions === '' ? (
              <p className="modal__empty">This recipe lists no instructions.</p>
            ) : (
              recipe.instructions
                .split(/\n+/)
                .filter((paragraph) => paragraph.trim() !== '')
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            )}
          </section>

          {(recipe.youtubeUrl ?? recipe.sourceUrl) !== null && (
            <p className="modal__links">
              {recipe.youtubeUrl !== null && (
                <a href={recipe.youtubeUrl} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube
                </a>
              )}
              {recipe.sourceUrl !== null && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Original source
                </a>
              )}
            </p>
          )}
        </div>

        {footer !== undefined && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
