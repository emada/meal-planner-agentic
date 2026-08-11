import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SHOPPING_LIST_STORAGE_KEY,
  clearShoppingList,
  readShoppingList,
  writeShoppingList,
} from './shopping-list-storage';

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
      { name: 'Onion', measures: ['2'] },
      { name: 'Beef', measures: ['1 kg'] },
    ]);

    expect(readShoppingList()).toEqual([
      { name: 'Beef', measures: ['1 kg'] },
      { name: 'Onion', measures: ['2'] },
    ]);
  });

  it('recovers from malformed JSON rather than throwing (AC10)', () => {
    localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, '{not json');

    expect(() => readShoppingList()).not.toThrow();
    expect(readShoppingList()).toEqual([]);
  });

  it.each([
    ['a bare string', '"hello"'],
    ['an object instead of an array', '{"name":"Beef"}'],
    ['entries missing measures', '[{"name":"Beef"}]'],
    ['an entry with an empty name', '[{"name":"","measures":[]}]'],
    ['measures that are not strings', '[{"name":"Beef","measures":[1,2]}]'],
  ])('rejects %s', (_label, stored) => {
    localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, stored);

    // Foreign data is discarded, not partially trusted: a half-parsed entry
    // reaching the UI is the defect this boundary exists to prevent.
    expect(readShoppingList()).toEqual([]);
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

    expect(writeShoppingList([{ name: 'Beef', measures: [] }])).toBe(false);
  });

  it('reports success on a normal write', () => {
    expect(writeShoppingList([{ name: 'Beef', measures: [] }])).toBe(true);
  });
});

describe('clearShoppingList', () => {
  it('empties the stored list', () => {
    writeShoppingList([{ name: 'Beef', measures: ['1 kg'] }]);

    expect(clearShoppingList()).toBe(true);
    expect(readShoppingList()).toEqual([]);
  });
});
