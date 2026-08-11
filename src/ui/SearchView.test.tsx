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

const json = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });

/**
 * The idle view now mounts the category browser, which fetches on its own
 * (AC15). Routing by URL rather than answering every request with the same body
 * keeps a search assertion from silently passing on a category response.
 */
const searchRequests = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => typeof url === 'string' && url.includes('search.php'));

const respondWith = (body: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(url.includes('categories.php') ? json({ categories: [] }) : json(body)),
    ),
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

    render(<SearchView recipeOpen={false} />);
    await user.type(screen.getByRole('searchbox', { name: /search recipes/i }), 'beef{Enter}');

    expect(await screen.findByText('Beef Pie')).toBeInTheDocument();
    expect(screen.getByText('Beef Stew')).toBeInTheDocument();
    expect(screen.getAllByText('Beef · British')).toHaveLength(2);

    // No open handler in this render, so the cards must not be announced as
    // buttons that do nothing.
    expect(screen.queryByRole('button', { name: /beef pie/i })).not.toBeInTheDocument();
  });

  it('says so explicitly when nothing matches, rather than showing an empty grid (AC2)', async () => {
    respondWith({ meals: null });
    const user = userEvent.setup();

    render(<SearchView recipeOpen={false} />);
    await user.type(screen.getByRole('searchbox'), 'zzzzz{Enter}');

    expect(await screen.findByText(/no recipes found/i)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows an error with a working retry when the request fails (AC3)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const user = userEvent.setup();

    render(<SearchView recipeOpen={false} />);
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

    render(<SearchView recipeOpen={false} />);
    await user.type(screen.getByRole('searchbox'), '   {Enter}');

    expect(searchRequests()).toHaveLength(0);
    expect(screen.getByText(/search for a recipe, or browse the categories/i)).toBeInTheDocument();
  });

  it('marks the results region busy while the search is in flight', async () => {
    let release: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('categories.php')
          ? Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ categories: [] }),
            })
          : new Promise((resolve) => {
              release = resolve;
            }),
      ),
    );
    const user = userEvent.setup();

    render(<SearchView recipeOpen={false} />);
    await user.type(screen.getByRole('searchbox'), 'beef{Enter}');

    const region = await screen.findByText(/searching/i);
    expect(region.closest('section')).toHaveAttribute('aria-busy', 'true');

    release?.({ ok: true, status: 200, json: () => Promise.resolve({ meals: null }) });
    await waitFor(() => {
      expect(screen.queryByText(/searching…/i)).not.toBeInTheDocument();
    });
  });

  it('discards a slow earlier search when a later one has already answered', async () => {
    // Without the abort, the first response lands last and the user sees results
    // for a term they have already replaced.
    const deferred: ((value: unknown) => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('categories.php')
          ? Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ categories: [] }),
            })
          : new Promise((resolve) => {
              deferred.push(resolve);
            }),
      ),
    );
    const user = userEvent.setup();

    render(<SearchView recipeOpen={false} />);
    const box = screen.getByRole('searchbox');

    await user.type(box, 'beef{Enter}');
    await user.clear(box);
    await user.type(box, 'pudding{Enter}');

    // Answer the later request first, then the abandoned earlier one.
    deferred[1]?.({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ meals: [meal('2', 'Sticky Pudding')] }),
    });
    expect(await screen.findByText('Sticky Pudding')).toBeInTheDocument();

    deferred[0]?.({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ meals: [meal('1', 'Beef Pie')] }),
    });

    await waitFor(() => {
      expect(screen.queryByText('Beef Pie')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sticky Pudding')).toBeInTheDocument();
  });

  it('abandons an in-flight search when the box is cleared', async () => {
    let release: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('categories.php')
          ? Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ categories: [] }),
            })
          : new Promise((resolve) => {
              release = resolve;
            }),
      ),
    );
    const user = userEvent.setup();

    render(<SearchView recipeOpen={false} />);
    const box = screen.getByRole('searchbox');

    await user.type(box, 'beef{Enter}');
    await user.clear(box);
    await user.type(box, '{Enter}');

    release?.({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ meals: [meal('1', 'Beef Pie')] }),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/search for a recipe, or browse the categories/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Beef Pie')).not.toBeInTheDocument();
  });

  it('opens a recipe when its card is activated', async () => {
    respondWith({ meals: [meal('1', 'Beef Pie')] });
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    render(<SearchView onOpenRecipe={onOpenRecipe} recipeOpen={false} />);
    await user.type(screen.getByRole('searchbox'), 'beef{Enter}');
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    expect(onOpenRecipe).toHaveBeenCalledWith(expect.objectContaining({ title: 'Beef Pie' }));
  });
});
