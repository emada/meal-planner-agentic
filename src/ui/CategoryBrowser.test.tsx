import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryBrowser } from './CategoryBrowser';

const json = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });

const CATEGORIES = {
  categories: [
    { idCategory: '1', strCategory: 'Beef', strCategoryThumb: 'https://x/beef.png' },
    { idCategory: '2', strCategory: 'Seafood', strCategoryThumb: 'https://x/seafood.png' },
  ],
};

/** filter.php answers with partial meals — no category, area, or ingredients. */
const FILTERED = {
  meals: [{ idMeal: '52874', strMeal: 'Beef Pie', strMealThumb: 'https://x/1.jpg' }],
};

const FULL = {
  meals: [
    {
      idMeal: '52874',
      strMeal: 'Beef Pie',
      strMealThumb: 'https://x/1.jpg',
      strCategory: 'Beef',
      strArea: 'British',
      strInstructions: 'Cook it.',
      strIngredient1: 'Beef',
      strMeasure1: '1 kg',
    },
  ],
};

/**
 * Routes by endpoint so a test cannot pass on the wrong response: browsing is
 * three different requests and answering all of them alike would hide a caller
 * that asks the wrong one.
 */
const route = (overrides: Record<string, unknown> = {}) => {
  const fetchMock = vi.fn((url: string) => {
    const target = url;
    const body = target.includes('categories.php')
      ? (overrides.categories ?? CATEGORIES)
      : target.includes('filter.php')
        ? (overrides.filter ?? FILTERED)
        : (overrides.lookup ?? FULL);
    const failure = target.includes('categories.php')
      ? overrides.categoriesFail
      : target.includes('filter.php')
        ? overrides.filterFail
        : overrides.lookupFail;

    return failure === true ? Promise.reject(new Error('offline')) : Promise.resolve(json(body));
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CategoryBrowser', () => {
  it('shows the categories a first-time visitor can start from (AC15)', async () => {
    route();

    render(<CategoryBrowser recipeOpen={false} />);

    expect(await screen.findByRole('button', { name: 'Beef' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seafood' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /browse by category/i })).toBeInTheDocument();
  });

  it('shows the recipes in a category when one is opened', async () => {
    route();
    const user = userEvent.setup();

    render(<CategoryBrowser recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));

    expect(await screen.findByText('Beef Pie')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beef' })).toBeInTheDocument();
    expect(screen.getByText(/1 recipe in Beef\./i)).toBeInTheDocument();
  });

  it('returns to the categories from inside one', async () => {
    route();
    const user = userEvent.setup();

    render(<CategoryBrowser recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    await user.click(await screen.findByRole('button', { name: /all categories/i }));

    expect(await screen.findByRole('button', { name: 'Seafood' })).toBeInTheDocument();
    expect(screen.queryByText('Beef Pie')).not.toBeInTheDocument();
  });

  it('looks the recipe up before opening it, so the modal is not blank (AC15)', async () => {
    const fetchMock = route();
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    render(<CategoryBrowser onOpenRecipe={onOpenRecipe} recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    await waitFor(() => {
      expect(onOpenRecipe).toHaveBeenCalled();
    });

    // The filter response carries no ingredients. Opening it without the lookup
    // would hand the modal a recipe with an empty list and no instructions.
    expect(onOpenRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Beef Pie',
        instructions: 'Cook it.',
        ingredients: [{ name: 'Beef', measure: '1 kg' }],
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('lookup.php?i=52874'),
      // Carries a signal, so moving on abandons the request rather than
      // opening a modal the user no longer asked for.
      { signal: expect.any(AbortSignal) as AbortSignal },
    );
  });

  it('reports a failed category list with a retry that works', async () => {
    route({ categoriesFail: true });
    const user = userEvent.setup();

    render(<CategoryBrowser recipeOpen={false} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the categories/i);

    vi.unstubAllGlobals();
    route();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('button', { name: 'Beef' })).toBeInTheDocument();
  });

  it('reports a failed category open without throwing the user back to the list', async () => {
    route({ filterFail: true });
    const user = userEvent.setup();

    render(<CategoryBrowser recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load Beef/i);
    // Still inside the category, so retrying is one click and not a re-navigation.
    expect(screen.getByRole('button', { name: /all categories/i })).toBeInTheDocument();
  });

  it('reports a failed lookup beside the grid instead of opening an empty modal', async () => {
    route({ lookupFail: true });
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    render(<CategoryBrowser onOpenRecipe={onOpenRecipe} recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    // Names the card, not just the transport: the grid is still on screen.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Beef Pie could not be loaded\. Could not reach TheMealDB\./i,
    );
    expect(onOpenRecipe).not.toHaveBeenCalled();
    expect(screen.getByText('Beef Pie')).toBeInTheDocument();
  });

  it('says so when the API resolves the id to nothing', async () => {
    route({ lookup: { meals: null } });
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    render(<CategoryBrowser onOpenRecipe={onOpenRecipe} recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Beef Pie could not be loaded/i);
    expect(onOpenRecipe).not.toHaveBeenCalled();
  });

  it('keeps the card focusable while its lookup is in flight', async () => {
    let release: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const target = url;

        if (target.includes('lookup.php')) {
          return new Promise((resolve) => {
            release = resolve;
          });
        }

        return Promise.resolve(json(target.includes('categories.php') ? CATEGORIES : FILTERED));
      }),
    );
    const user = userEvent.setup();

    render(<CategoryBrowser onOpenRecipe={vi.fn()} recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    const card = await screen.findByRole('button', { name: /beef pie/i });
    await user.click(card);

    // `disabled` would move focus to <body> and lose the user's place while
    // they wait for a request they cannot see.
    await waitFor(() => {
      expect(card).toHaveAttribute('aria-disabled', 'true');
    });
    expect(card).not.toBeDisabled();
    expect(document.activeElement).toBe(card);

    release?.(json(FULL));
  });

  it('discards a lookup that lands after a recipe was opened another way', async () => {
    let release: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('lookup.php')) {
          return new Promise((resolve) => {
            release = resolve;
          });
        }

        return Promise.resolve(json(url.includes('categories.php') ? CATEGORIES : FILTERED));
      }),
    );
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<CategoryBrowser onOpenRecipe={onOpenRecipe} recipeOpen={false} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    // "Surprise me" opens something while the lookup is still in flight.
    rerender(<CategoryBrowser onOpenRecipe={onOpenRecipe} recipeOpen={true} />);
    release?.(json(FULL));

    await waitFor(() => {
      expect(screen.queryByText('Opening…')).not.toBeInTheDocument();
    });
    // Replacing the recipe the user is reading is the defect this prevents.
    expect(onOpenRecipe).not.toHaveBeenCalled();
  });

  it('still opens when the lookup is the thing that opens the modal', async () => {
    route();
    const onOpenRecipe = vi.fn();
    const user = userEvent.setup();

    // recipeOpen is already true — a second browse open from inside the modal
    // must not be mistaken for a race and dropped.
    render(<CategoryBrowser onOpenRecipe={onOpenRecipe} recipeOpen={true} />);
    await user.click(await screen.findByRole('button', { name: 'Beef' }));
    await user.click(await screen.findByRole('button', { name: /beef pie/i }));

    await waitFor(() => {
      expect(onOpenRecipe).toHaveBeenCalledWith(expect.objectContaining({ title: 'Beef Pie' }));
    });
  });

  it('does not render a category grid that has no categories in it', async () => {
    route({ categories: { categories: null } });

    render(<CategoryBrowser recipeOpen={false} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading categories/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(/no categories are available/i)).toBeInTheDocument();
  });
});
