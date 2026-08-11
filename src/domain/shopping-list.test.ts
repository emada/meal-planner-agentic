import { describe, expect, it } from 'vitest';

import {
  addIngredients,
  measuresOf,
  normalizeName,
  removeEntry,
  sortEntries,
} from './shopping-list';

const names = (list: readonly { name: string }[]) => list.map((entry) => entry.name);
const shown = (list: readonly Parameters<typeof measuresOf>[0][]) => list.map(measuresOf);

describe('normalizeName', () => {
  it.each([
    ['Beef', 'beef'],
    ['  BEEF  ', 'beef'],
    ['Olive   Oil', 'olive oil'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});

describe('addIngredients', () => {
  it('adds ingredients to an empty list, alphabetically', () => {
    const list = addIngredients(
      [],
      [
        { name: 'Onion', measure: '2 chopped' },
        { name: 'Beef', measure: '1 kg' },
      ],
      'pie',
    );

    expect(names(list)).toEqual(['Beef', 'Onion']);
    expect(shown(list)).toEqual([['1 kg'], ['2 chopped']]);
  });

  it('groups a shared ingredient into one entry keeping both measures verbatim (AC9)', () => {
    const first = addIngredients([], [{ name: 'Salt', measure: '1 tsp' }], 'pie');
    const second = addIngredients(first, [{ name: 'salt', measure: 'to taste' }], 'stew');

    // No arithmetic: "1 tsp" and "to taste" have no common unit, and inventing
    // one would put a wrong quantity in front of someone in a shop.
    expect(names(second)).toEqual(['Salt']);
    expect(shown(second)).toEqual([['1 tsp', 'to taste']]);
  });

  it('is idempotent for the same recipe, so a double-click does not double the list', () => {
    const once = addIngredients([], [{ name: 'Beef', measure: '1 kg' }], 'pie');
    const twice = addIngredients(once, [{ name: 'Beef', measure: '1 kg' }], 'pie');

    expect(shown(twice)).toEqual([['1 kg']]);
  });

  it('still shows both when two different recipes ask for the same measure', () => {
    const first = addIngredients([], [{ name: 'Salt', measure: '1 tsp' }], 'pie');
    const second = addIngredients(first, [{ name: 'Salt', measure: '1 tsp' }], 'stew');

    // Identical strings from different recipes are two real requirements.
    expect(shown(second)).toEqual([['1 tsp', '1 tsp']]);
  });

  it('replaces a recipe contribution when the recipe is re-added with different measures', () => {
    const first = addIngredients([], [{ name: 'Beef', measure: '1 kg' }], 'pie');
    const second = addIngredients(first, [{ name: 'Beef', measure: '2 kg' }], 'pie');

    expect(shown(second)).toEqual([['2 kg']]);
  });

  it('keeps the display form first seen when a later spelling differs in case', () => {
    const list = addIngredients(
      addIngredients([], [{ name: 'Olive Oil', measure: '2 tbsp' }], 'a'),
      [{ name: 'olive   oil', measure: '1 tbsp' }],
      'b',
    );

    expect(names(list)).toEqual(['Olive Oil']);
    expect(shown(list)).toEqual([['2 tbsp', '1 tbsp']]);
  });

  it('keeps an ingredient with no measure as a name-only entry', () => {
    const list = addIngredients([], [{ name: 'Parsley', measure: '' }], 'pie');

    expect(names(list)).toEqual(['Parsley']);
    expect(shown(list)).toEqual([[]]);
  });

  it('ignores an ingredient with no name', () => {
    expect(addIngredients([], [{ name: '   ', measure: '1 kg' }], 'pie')).toEqual([]);
  });

  it('merges stored entries that share a normalized name instead of losing one', () => {
    // Only reachable if something outside this app wrote the list, which is
    // exactly the foreign-data case the storage boundary exists for.
    const list = addIngredients(
      [
        { name: 'Salt', contributions: [{ recipeId: 'a', measure: '1 tsp' }] },
        { name: 'salt ', contributions: [{ recipeId: 'b', measure: '2 tsp' }] },
      ],
      [],
      'c',
    );

    expect(names(list)).toEqual(['Salt']);
    expect(shown(list)).toEqual([['1 tsp', '2 tsp']]);
  });

  it('sorts case-insensitively so spellings do not split the list', () => {
    const list = addIngredients(
      [],
      [
        { name: 'onion', measure: '1' },
        { name: 'Beef', measure: '1' },
        { name: 'apple', measure: '1' },
      ],
      'pie',
    );

    expect(names(list)).toEqual(['apple', 'Beef', 'onion']);
  });

  it('does not mutate the list it was given', () => {
    const original = [{ name: 'Beef', contributions: [{ recipeId: 'a', measure: '1 kg' }] }];
    addIngredients(original, [{ name: 'Onion', measure: '2' }], 'b');

    expect(original).toEqual([
      { name: 'Beef', contributions: [{ recipeId: 'a', measure: '1 kg' }] },
    ]);
  });
});

describe('removeEntry', () => {
  it('removes the matching entry regardless of case', () => {
    const list = [
      { name: 'Beef', contributions: [{ recipeId: 'a', measure: '1 kg' }] },
      { name: 'Onion', contributions: [] },
    ];

    expect(names(removeEntry(list, 'beef'))).toEqual(['Onion']);
  });

  it('leaves the list alone when nothing matches', () => {
    const list = [{ name: 'Beef', contributions: [] }];

    expect(removeEntry(list, 'Pork')).toEqual(list);
  });
});

describe('measuresOf', () => {
  it('drops empty measures so a name-only contribution shows no blank line', () => {
    expect(
      measuresOf({
        name: 'Parsley',
        contributions: [
          { recipeId: 'a', measure: '' },
          { recipeId: 'b', measure: 'a handful' },
        ],
      }),
    ).toEqual(['a handful']);
  });
});

describe('sortEntries', () => {
  it('does not mutate its input', () => {
    const list = [
      { name: 'Onion', contributions: [] },
      { name: 'Beef', contributions: [] },
    ];
    const sorted = sortEntries(list);

    expect(list[0]?.name).toBe('Onion');
    expect(sorted[0]?.name).toBe('Beef');
  });
});
