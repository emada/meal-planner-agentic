import { describe, expect, it } from 'vitest';

import { addIngredients, normalizeName, removeEntry, sortEntries } from './shopping-list';

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
    expect(
      addIngredients(
        [],
        [
          { name: 'Onion', measure: '2 chopped' },
          { name: 'Beef', measure: '1 kg' },
        ],
      ),
    ).toEqual([
      { name: 'Beef', measures: ['1 kg'] },
      { name: 'Onion', measures: ['2 chopped'] },
    ]);
  });

  it('groups a shared ingredient into one entry keeping both measures verbatim (AC9)', () => {
    const first = addIngredients([], [{ name: 'Salt', measure: '1 tsp' }]);
    const second = addIngredients(first, [{ name: 'salt', measure: 'to taste' }]);

    // No arithmetic: "1 tsp" and "to taste" have no common unit, and inventing
    // one would put a wrong quantity in front of someone in a shop.
    expect(second).toEqual([{ name: 'Salt', measures: ['1 tsp', 'to taste'] }]);
  });

  it('keeps the display form first seen when a later spelling differs in case', () => {
    const list = addIngredients(addIngredients([], [{ name: 'Olive Oil', measure: '2 tbsp' }]), [
      { name: 'olive   oil', measure: '1 tbsp' },
    ]);

    expect(list).toEqual([{ name: 'Olive Oil', measures: ['2 tbsp', '1 tbsp'] }]);
  });

  it('keeps an ingredient with no measure as a name-only entry', () => {
    expect(addIngredients([], [{ name: 'Parsley', measure: '' }])).toEqual([
      { name: 'Parsley', measures: [] },
    ]);
  });

  it('ignores an ingredient with no name', () => {
    expect(addIngredients([], [{ name: '   ', measure: '1 kg' }])).toEqual([]);
  });

  it('sorts case-insensitively so spellings do not split the list', () => {
    const list = addIngredients(
      [],
      [
        { name: 'onion', measure: '1' },
        { name: 'Beef', measure: '1' },
        { name: 'apple', measure: '1' },
      ],
    );

    expect(list.map((entry) => entry.name)).toEqual(['apple', 'Beef', 'onion']);
  });
});

describe('removeEntry', () => {
  it('removes the matching entry regardless of case', () => {
    const list = [
      { name: 'Beef', measures: ['1 kg'] },
      { name: 'Onion', measures: ['2'] },
    ];

    expect(removeEntry(list, 'beef')).toEqual([{ name: 'Onion', measures: ['2'] }]);
  });

  it('leaves the list alone when nothing matches', () => {
    const list = [{ name: 'Beef', measures: ['1 kg'] }];

    expect(removeEntry(list, 'Pork')).toEqual(list);
  });
});

describe('sortEntries', () => {
  it('does not mutate its input', () => {
    const list = [
      { name: 'Onion', measures: [] },
      { name: 'Beef', measures: [] },
    ];
    const sorted = sortEntries(list);

    expect(list[0]?.name).toBe('Onion');
    expect(sorted[0]?.name).toBe('Beef');
  });
});
