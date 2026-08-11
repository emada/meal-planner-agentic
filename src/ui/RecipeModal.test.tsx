import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Recipe } from '../domain/recipe';
import { RecipeModal } from './RecipeModal';

const recipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: '52874',
  title: 'Beef and Mustard Pie',
  thumbnailUrl: 'https://example.test/pie.jpg',
  category: 'Beef',
  area: 'British',
  instructions: 'Preheat the oven.\n\nBrown the beef.',
  ingredients: [
    { name: 'Beef', measure: '1 kg' },
    { name: 'Onion', measure: '2 chopped' },
  ],
  youtubeUrl: 'https://youtu.be/abc',
  sourceUrl: 'https://example.test/source',
  ...overrides,
});

describe('RecipeModal', () => {
  it('shows ingredients with measures, instructions, and both links (AC4)', () => {
    render(<RecipeModal recipe={recipe()} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: /beef and mustard pie/i })).toBeInTheDocument();
    expect(screen.getByText('Beef')).toBeInTheDocument();
    expect(screen.getByText('1 kg')).toBeInTheDocument();
    expect(screen.getByText('Preheat the oven.')).toBeInTheDocument();
    expect(screen.getByText('Brown the beef.')).toBeInTheDocument();

    const youtube = screen.getByRole('link', { name: /watch on youtube/i });
    expect(youtube).toHaveAttribute('href', 'https://youtu.be/abc');
    expect(youtube).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /original source/i })).toBeInTheDocument();
  });

  it('renders no blank ingredient rows (AC4)', () => {
    render(
      <RecipeModal
        recipe={recipe({ ingredients: [{ name: 'Beef', measure: '' }] })}
        onClose={vi.fn()}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Beef');
  });

  it('omits a link the recipe does not have', () => {
    render(<RecipeModal recipe={recipe({ youtubeUrl: null })} onClose={vi.fn()} />);

    expect(screen.queryByRole('link', { name: /youtube/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /original source/i })).toBeInTheDocument();
  });

  it('says so when a recipe carries no ingredients or instructions', () => {
    render(
      <RecipeModal recipe={recipe({ ingredients: [], instructions: '' })} onClose={vi.fn()} />,
    );

    expect(screen.getByText(/lists no ingredients/i)).toBeInTheDocument();
    expect(screen.getByText(/lists no instructions/i)).toBeInTheDocument();
  });

  it('renders instructions as text, never as markup (threat T1)', () => {
    render(
      <RecipeModal
        recipe={recipe({ instructions: '<img src=x onerror="alert(1)">Mix well.' })}
        onClose={vi.fn()}
      />,
    );

    // The tag must be visible as characters, and must not have become an element.
    expect(screen.getByText(/<img src=x onerror="alert\(1\)">Mix well\./)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('moves focus into the dialog on open (AC5)', () => {
    render(<RecipeModal recipe={recipe()} onClose={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('closes on Escape (AC5)', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<RecipeModal recipe={recipe()} onClose={onClose} />);
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked but not when the dialog is', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(<RecipeModal recipe={recipe()} onClose={onClose} />);

    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.querySelector('.modal__backdrop');
    if (backdrop) await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab inside the dialog (AC5)', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Outside before</button>
        <RecipeModal recipe={recipe()} onClose={vi.fn()} />
      </>,
    );

    const inside = [
      screen.getByRole('button', { name: /close recipe/i }),
      screen.getByRole('link', { name: /watch on youtube/i }),
      screen.getByRole('link', { name: /original source/i }),
    ];

    // Forward past the last control wraps to the first, rather than reaching
    // the button behind the dialog.
    for (const element of inside) {
      await user.tab();
      expect(document.activeElement).toBe(element);
    }

    await user.tab();
    expect(document.activeElement).toBe(inside[0]);

    // And backwards from the first wraps to the last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(inside[inside.length - 1]);
  });

  it('returns focus to whatever opened it (AC5)', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Open recipe
          </button>
          {open && (
            <RecipeModal
              recipe={recipe()}
              onClose={() => {
                setOpen(false);
              }}
            />
          )}
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /open recipe/i });

    await user.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));

    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger);
  });

  it('renders a footer when one is supplied', () => {
    render(
      <RecipeModal
        recipe={recipe()}
        onClose={vi.fn()}
        footer={<button type="button">add to my shopping list</button>}
      />,
    );

    expect(screen.getByRole('button', { name: /add to my shopping list/i })).toBeInTheDocument();
  });
});
