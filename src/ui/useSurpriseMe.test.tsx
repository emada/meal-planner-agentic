import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Recipe } from '../domain/recipe';
import { useSurpriseMe } from './useSurpriseMe';

const meal = {
  idMeal: '52874',
  strMeal: 'Beef Pie',
  strCategory: 'Beef',
  strArea: 'British',
  strInstructions: 'Cook it.',
  strIngredient1: 'Beef',
  strMeasure1: '1 kg',
};

function Harness({ onRecipe }: { readonly onRecipe: (recipe: Recipe) => void }) {
  const { state, surpriseMe, dismiss } = useSurpriseMe(onRecipe);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void surpriseMe();
        }}
      >
        surprise me
      </button>
      <button type="button" onClick={dismiss}>
        dismiss
      </button>
      <p data-testid="status">{state.status}</p>
      {state.status === 'failed' && <p role="alert">{state.message}</p>}
    </>
  );
}

const respond = (body: unknown) => {
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

describe('useSurpriseMe', () => {
  it('hands a random recipe to the caller', async () => {
    respond({ meals: [meal] });
    const onRecipe = vi.fn();
    const user = userEvent.setup();

    render(<Harness onRecipe={onRecipe} />);
    await user.click(screen.getByRole('button', { name: 'surprise me' }));

    expect(onRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: '52874', title: 'Beef Pie' }),
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://www.themealdb.com/api/json/v1/1/random.php',
      expect.anything(),
    );
  });

  it('reports a failure the user can retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const onRecipe = vi.fn();
    const user = userEvent.setup();

    render(<Harness onRecipe={onRecipe} />);
    await user.click(screen.getByRole('button', { name: 'surprise me' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onRecipe).not.toHaveBeenCalled();

    respond({ meals: [meal] });
    await user.click(screen.getByRole('button', { name: 'surprise me' }));
    expect(onRecipe).toHaveBeenCalledTimes(1);
  });

  it('treats an empty answer as a failure rather than a silent no-op', async () => {
    // The endpoint answered; it just had nothing. Doing nothing visible would
    // read as a broken button.
    respond({ meals: null });
    const onRecipe = vi.fn();
    const user = userEvent.setup();

    render(<Harness onRecipe={onRecipe} />);
    await user.click(screen.getByRole('button', { name: 'surprise me' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not return a recipe/i);
    expect(onRecipe).not.toHaveBeenCalled();
  });

  it('lets the user dismiss the failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const user = userEvent.setup();

    render(<Harness onRecipe={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'surprise me' }));
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
