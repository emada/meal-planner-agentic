import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { measuresOf } from '../domain/shopping-list';
import { useShoppingList } from './useShoppingList';

function Harness() {
  const { entries, add, remove, clear, persistenceFailed } = useShoppingList();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          add([{ name: 'Beef', measure: '1 kg' }], 'pie');
        }}
      >
        add pie
      </button>
      <button
        type="button"
        onClick={() => {
          remove('Beef');
        }}
      >
        remove beef
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
      <p data-testid="state">
        {entries.map((entry) => `${entry.name}:${measuresOf(entry).join('|')}`).join(',')}
      </p>
      <p data-testid="failed">{String(persistenceFailed)}</p>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('useShoppingList', () => {
  it('writes exactly once per action', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'add pie' }));

    // The write used to live inside a setState updater, which React may run
    // more than once or during a render it discards.
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('state')).toHaveTextContent('Beef:1 kg');
  });

  it('surfaces a failed write instead of pretending it saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'add pie' }));

    expect(screen.getByTestId('failed')).toHaveTextContent('true');
    // The list is still correct in memory; only persistence failed.
    expect(screen.getByTestId('state')).toHaveTextContent('Beef:1 kg');
  });

  it('loads what a previous session stored', () => {
    localStorage.setItem(
      'meal-planner.shopping-list.v2',
      JSON.stringify([{ name: 'Onion', contributions: [{ recipeId: 'x', measure: '2' }] }]),
    );

    render(<Harness />);

    expect(screen.getByTestId('state')).toHaveTextContent('Onion:2');
  });

  it('removes and clears through the same write path', async () => {
    const user = userEvent.setup();

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'add pie' }));
    await user.click(screen.getByRole('button', { name: 'remove beef' }));
    expect(screen.getByTestId('state')).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: 'add pie' }));
    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(localStorage.getItem('meal-planner.shopping-list.v2')).toBeNull();
  });
});
