import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchView } from './SearchView';

const meal = (id: string, title: string) => ({
  idMeal: id,
  strMeal: title,
  strMealThumb: `https://www.themealdb.com/images/${id}.jpg`,
  strCategory: 'Beef',
  strArea: 'British',
  strInstructions: 'Cook it.',
  strIngredient1: 'Beef',
  strMeasure1: '1 kg',
});

const respondWith = (body: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) }),
  );
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SearchView', () => {
  it('shows matching recipes with title, category and area (AC1)', async () => {
    respondWith({ meals: [meal('1', 'Beef Pie'), meal('2', 'Beef Stew')] });
    const user = userEvent.setup();

    render(<SearchView />);
    await user.type(screen.getByRole('searchbox', { name: /search recipes/i }), 'beef{Enter}');

    expect(await screen.findByText('Beef Pie')).toBeInTheDocument();
    expect(screen.getByText('Beef Stew')).toBeInTheDocument();
    expect(screen.getAllByText('Beef · British')).toHaveLength(2);
  });

  it('says so explicitly when nothing matches, rather than showing an empty grid (AC2)', async () => {
    respondWith({ meals: null });
    const user = userEvent.setup();

    render(<SearchView />);
    await user.type(screen.getByRole('searchbox'), 'zzzzz{Enter}');

    expect(await screen.findByText(/no recipes found/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows an error with a working retry when the request fails (AC3)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const user = userEvent.setup();

    render(<SearchView />);
    await user.type(screen.getByRole('searchbox'), 'beef{Enter}');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not search/i);

    // Retry must actually re-run the search, not merely dismiss the message.
    respondWith({ meals: [meal('1', 'Beef Pie')] });
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Beef Pie')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not search when the term is only whitespace', async () => {
    respondWith({ meals: null });
    const user = userEvent.setup();

    render(<SearchView />);
    await user.type(screen.getByRole('searchbox'), '   {Enter}');

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/search for a recipe to get started/i)).toBeInTheDocument();
  });

  it('marks the results region busy while the search is in flight', async () => {
    let release: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          release = resolve;
        }),
      ),
    );
    const user = userEvent.setup();

    render(<SearchView />);
    await user.type(screen.getByRole('searchbox'), 'beef{Enter}');

    const region = await screen.findByText(/searching/i);
    expect(region.closest('section')).toHaveAttribute('aria-busy', 'true');

    release?.({ ok: true, status: 200, json: () => Promise.resolve({ meals: null }) });
    await waitFor(() => {
      expect(screen.queryByText(/searching…/i)).not.toBeInTheDocument();
    });
  });

  it('opens a recipe when its card is activated', async () => {
    respondWith({ meals: [meal('1', 'Beef Pie')] });
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    render(<SearchView onOpenRecipe={onOpenRecipe} />);
    await user.type(screen.getByRole('searchbox'), 'beef{Enter}');
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    expect(onOpenRecipe).toHaveBeenCalledWith(expect.objectContaining({ title: 'Beef Pie' }));
  });
});
