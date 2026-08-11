import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SHOPPING_LIST_STORAGE_KEY,
  clearShoppingList,
  readShoppingList,
  writeShoppingList,
} from './shopping-list-storage';

const LEGACY_KEY = 'meal-planner.shopping-list.v1';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('readShoppingList', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(readShoppingList()).toEqual([]);
  });

  it('round-trips what was written, sorted', () => {
    writeShoppingList([
      { name: 'Onion', contributions: [{ recipeId: 'a', measure: '2' }] },
      { name: 'Beef', contributions: [{ recipeId: 'a', measure: '1 kg' }] },
    ]);

    expect(readShoppingList().map((entry) => entry.name)).toEqual(['Beef', 'Onion']);
  });

  it('migrates a list written before measures carried a source', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ name: 'Beef', measures: ['1 kg', '2 kg'] }]),
    );

    // A stored list must not be silently discarded by a schema change.
    expect(readShoppingList()).toEqual([
      {
        name: 'Beef',
        contributions: [
          { recipeId: 'legacy', measure: '1 kg' },
          { recipeId: 'legacy', measure: '2 kg' },
        ],
      },
    ]);
  });

  it('prefers the current key when both exist', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ name: 'Old', measures: ['1'] }]));
    writeShoppingList([{ name: 'New', contributions: [{ recipeId: 'a', measure: '2' }] }]);

    expect(readShoppingList().map((entry) => entry.name)).toEqual(['New']);
  });

  it('falls back to the legacy key when the current one is malformed', () => {
    localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, '{not json');
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ name: 'Beef', measures: ['1 kg'] }]));

    expect(readShoppingList().map((entry) => entry.name)).toEqual(['Beef']);
  });

  it('recovers from malformed JSON rather than throwing (AC10)', () => {
    localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, '{not json');

    expect(() => readShoppingList()).not.toThrow();
    expect(readShoppingList()).toEqual([]);
  });

  it.each([
    ['a bare string', '"hello"'],
    ['an object instead of an array', '{"name":"Beef"}'],
    ['entries missing contributions', '[{"name":"Beef"}]'],
    ['an entry with an empty name', '[{"name":"","contributions":[]}]'],
    ['contributions that are not objects', '[{"name":"Beef","contributions":[1,2]}]'],
    ['a contribution with no recipe', '[{"name":"Beef","contributions":[{"measure":"1 kg"}]}]'],
  ])('rejects %s', (_label, stored) => {
    localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, stored);

    // Foreign data is discarded, not partially trusted: a half-parsed entry
    // reaching the UI is the defect this boundary exists to prevent.
    expect(readShoppingList()).toEqual([]);
  });

  it('merges stored entries that share a normalized name', () => {
    localStorage.setItem(
      SHOPPING_LIST_STORAGE_KEY,
      JSON.stringify([
        { name: 'Salt', contributions: [{ recipeId: 'a', measure: '1 tsp' }] },
        { name: 'salt ', contributions: [{ recipeId: 'b', measure: '2 tsp' }] },
      ]),
    );

    // R3.6 is one entry per ingredient. Merging only on the next add would show
    // the user two "Salt" rows until they happened to add a recipe.
    const list = readShoppingList();

    expect(list).toHaveLength(1);
    expect(list[0]?.contributions).toHaveLength(2);
  });

  it('keeps a contribution whose recipe id is empty', () => {
    localStorage.setItem(
      SHOPPING_LIST_STORAGE_KEY,
      JSON.stringify([{ name: 'Beef', contributions: [{ recipeId: '', measure: '1 kg' }] }]),
    );

    // Merging on read must never drop a contribution. The schema permits any
    // recipe id, and a measure is exactly what this boundary exists to keep.
    expect(readShoppingList()).toEqual([
      { name: 'Beef', contributions: [{ recipeId: '', measure: '1 kg' }] },
    ]);
  });

  it('returns an empty list when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied');
    });

    expect(readShoppingList()).toEqual([]);
  });
});

describe('writeShoppingList', () => {
  it('reports failure instead of throwing when the quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(writeShoppingList([{ name: 'Beef', contributions: [] }])).toBe(false);
  });

  it('reports success on a normal write', () => {
    expect(writeShoppingList([{ name: 'Beef', contributions: [] }])).toBe(true);
  });
});

describe('clearShoppingList', () => {
  it('empties the stored list', () => {
    writeShoppingList([{ name: 'Beef', contributions: [{ recipeId: 'a', measure: '1 kg' }] }]);

    expect(clearShoppingList()).toBe(true);
    expect(readShoppingList()).toEqual([]);
  });

  it('removes the legacy key too, so a cleared list cannot reappear', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ name: 'Beef', measures: ['1 kg'] }]));

    clearShoppingList();

    expect(readShoppingList()).toEqual([]);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});
