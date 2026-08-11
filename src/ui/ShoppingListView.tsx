import { useEffect, useRef, useState } from 'react';

import { measuresOf, type ShoppingListEntry } from '../domain/shopping-list';

interface ShoppingListViewProps {
  readonly entries: readonly ShoppingListEntry[];
  readonly onRemove: (name: string) => void;
  readonly onClear: () => void;
  readonly persistenceFailed: boolean;
}

function Measures({ entry }: { readonly entry: ShoppingListEntry }) {
  const measures = measuresOf(entry);

  if (measures.length === 0) return null;

  return (
    <ul className="shopping-list__measures">
      {measures.map((measure, index) => (
        <li key={`${measure}-${String(index)}`}>{measure}</li>
      ))}
    </ul>
  );
}

export function ShoppingListView({
  entries,
  onRemove,
  onClear,
  persistenceFailed,
}: ShoppingListViewProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // role="alertdialog" promises the dialog contract, so it has to keep it:
  // focus moves in, Escape cancels, and focus returns to the trigger. The
  // trigger unmounts while confirming, so without this focus falls to <body>.
  useEffect(() => {
    if (!confirmingClear) return;

    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      event.preventDefault();
      setConfirmingClear(false);
      requestAnimationFrame(() => {
        (clearTriggerRef.current ?? sectionRef.current)?.focus();
      });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [confirmingClear]);

  const dismissConfirm = () => {
    setConfirmingClear(false);
    // The trigger remounts after Escape or "Keep my list", but a successful
    // clear empties the list and the trigger is never rendered again. Falling
    // back to the section keeps focus in the region the user was working in
    // rather than dropping it to <body>.
    requestAnimationFrame(() => {
      (clearTriggerRef.current ?? sectionRef.current)?.focus();
    });
  };

  return (
    <section
      className="shopping-list"
      aria-labelledby="shopping-list-heading"
      tabIndex={-1}
      ref={sectionRef}
    >
      <div className="shopping-list__header">
        <h2 id="shopping-list-heading">My shopping list</h2>
        {entries.length > 0 && !confirmingClear && (
          <button
            className="button button--secondary"
            type="button"
            ref={clearTriggerRef}
            onClick={() => {
              setConfirmingClear(true);
            }}
          >
            Clear list
          </button>
        )}
      </div>

      {persistenceFailed && (
        <p className="shopping-list__warning" role="alert">
          This list could not be saved, so it will not survive a reload. Browser storage may be full
          or unavailable.
        </p>
      )}

      {confirmingClear && (
        <div
          className="shopping-list__confirm"
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="clear-confirm"
          tabIndex={-1}
          ref={confirmRef}
        >
          <p id="clear-confirm">Remove every ingredient from your shopping list?</p>
          <div className="shopping-list__confirm-actions">
            <button
              className="button"
              type="button"
              onClick={() => {
                onClear();
                dismissConfirm();
              }}
            >
              Yes, clear it
            </button>
            <button className="button button--secondary" type="button" onClick={dismissConfirm}>
              Keep my list
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="shopping-list__empty">
          Your shopping list is empty. Open a recipe and add its ingredients.
        </p>
      ) : (
        <ul className="shopping-list__items">
          {entries.map((entry) => (
            <li key={entry.name} className="shopping-list__item">
              <div className="shopping-list__entry">
                <span className="shopping-list__name">{entry.name}</span>
                <Measures entry={entry} />
              </div>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => {
                  onRemove(entry.name);
                }}
                aria-label={`Remove ${entry.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
