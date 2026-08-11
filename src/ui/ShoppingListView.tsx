import { useState } from 'react';

import type { ShoppingListEntry } from '../domain/shopping-list';

interface ShoppingListViewProps {
  readonly entries: readonly ShoppingListEntry[];
  readonly onRemove: (name: string) => void;
  readonly onClear: () => void;
  readonly persistenceFailed: boolean;
}

export function ShoppingListView({
  entries,
  onRemove,
  onClear,
  persistenceFailed,
}: ShoppingListViewProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <section className="shopping-list" aria-labelledby="shopping-list-heading">
      <div className="shopping-list__header">
        <h2 id="shopping-list-heading">My shopping list</h2>
        {entries.length > 0 && !confirmingClear && (
          <button
            className="button button--secondary"
            type="button"
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
        <div className="shopping-list__confirm" role="alertdialog" aria-labelledby="clear-confirm">
          <p id="clear-confirm">Remove every ingredient from your shopping list?</p>
          <div className="shopping-list__confirm-actions">
            <button
              className="button"
              type="button"
              onClick={() => {
                onClear();
                setConfirmingClear(false);
              }}
            >
              Yes, clear it
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setConfirmingClear(false);
              }}
            >
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
                {entry.measures.length > 0 && (
                  <ul className="shopping-list__measures">
                    {entry.measures.map((measure, index) => (
                      <li key={`${measure}-${String(index)}`}>{measure}</li>
                    ))}
                  </ul>
                )}
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
