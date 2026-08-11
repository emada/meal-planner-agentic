import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ShoppingListEntry } from '../domain/shopping-list';
import { ShoppingListView } from './ShoppingListView';

const entries: ShoppingListEntry[] = [
  {
    name: 'Salt',
    contributions: [
      { recipeId: 'pie', measure: '1 tsp' },
      { recipeId: 'stew', measure: 'to taste' },
    ],
  },
  { name: 'Parsley', contributions: [{ recipeId: 'pie', measure: '' }] },
];

const view = (overrides: Partial<Parameters<typeof ShoppingListView>[0]> = {}) =>
  render(
    <ShoppingListView
      entries={entries}
      onRemove={vi.fn()}
      onClear={vi.fn()}
      persistenceFailed={false}
      {...overrides}
    />,
  );

describe('ShoppingListView', () => {
  it('lists every measure under its ingredient, and none for a name-only entry', () => {
    view();

    expect(screen.getByText('1 tsp')).toBeInTheDocument();
    expect(screen.getByText('to taste')).toBeInTheDocument();

    const parsley = screen.getByText('Parsley').closest('li');
    expect(parsley?.querySelector('.shopping-list__measures')).toBeNull();
  });

  it('gives each remove button a name that identifies its ingredient', () => {
    view();

    // Five identical "Remove" buttons are useless to a screen reader.
    expect(screen.getByRole('button', { name: 'Remove Salt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Parsley' })).toBeInTheDocument();
  });

  it('says the list is empty rather than showing nothing', () => {
    view({ entries: [] });

    expect(screen.getByText(/your shopping list is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear list/i })).not.toBeInTheDocument();
  });

  it('warns when the list could not be saved', () => {
    view({ persistenceFailed: true });

    // The list is still correct in memory; the user needs to know it will not
    // survive a reload rather than be told nothing.
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i);
    expect(screen.getByText('Salt')).toBeInTheDocument();
  });

  it('asks before clearing, and keeps the list when the user declines', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();

    view({ onClear });
    await user.click(screen.getByRole('button', { name: /clear list/i }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keep my list/i }));
    expect(onClear).not.toHaveBeenCalled();
  });

  it('clears when the user confirms', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();

    view({ onClear });
    await user.click(screen.getByRole('button', { name: /clear list/i }));
    await user.click(screen.getByRole('button', { name: /yes, clear it/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the confirmation and back to the trigger on dismiss', async () => {
    const user = userEvent.setup();

    view();
    const trigger = screen.getByRole('button', { name: /clear list/i });

    await user.click(trigger);
    // role="alertdialog" promises the dialog contract; the trigger unmounts, so
    // without this focus would fall to <body>.
    expect(document.activeElement).toBe(screen.getByRole('alertdialog'));

    await user.click(screen.getByRole('button', { name: /keep my list/i }));
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /clear list/i }));
    });
  });

  it('cancels the confirmation with Escape', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();

    view({ onClear });
    await user.click(screen.getByRole('button', { name: /clear list/i }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('removes the entry the user asked for', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();

    view({ onRemove });
    await user.click(screen.getByRole('button', { name: 'Remove Salt' }));

    expect(onRemove).toHaveBeenCalledWith('Salt');
  });
});
