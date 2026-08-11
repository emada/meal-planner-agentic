import { describe, expect, it } from 'vitest';

import { extractIngredients, optionalUrl, toCategory, toRecipe, toRecipeSummary } from './recipe';

const slots = (pairs: [string, string][]): Record<string, string | null> => {
  const fields: Record<string, string | null> = {};

  for (let slot = 1; slot <= 20; slot += 1) {
    const pair = pairs[slot - 1];
    fields[`strIngredient${String(slot)}`] = pair ? pair[0] : '';
    fields[`strMeasure${String(slot)}`] = pair ? pair[1] : '';
  }

  return fields;
};

describe('extractIngredients', () => {
  it('keeps every filled pair in order', () => {
    const fields = slots([
      ['Beef', '1 kg'],
      ['Onion', '2 chopped'],
      ['Salt', '1 tsp'],
    ]);

    expect(extractIngredients(fields)).toEqual([
      { name: 'Beef', measure: '1 kg' },
      { name: 'Onion', measure: '2 chopped' },
      { name: 'Salt', measure: '1 tsp' },
    ]);
  });

  it('discards empty, null, and whitespace-only slots', () => {
    const fields: Record<string, string | null> = {
      ...slots([['Beef', '1 kg']]),
      strIngredient2: '   ',
      strMeasure2: '1 kg',
      strIngredient3: null,
      strMeasure3: null,
      strIngredient4: '',
      strMeasure4: 'to taste',
    };

    // A whitespace-only name and a measure with no ingredient are both dropped:
    // either would render as a blank row the user cannot shop for.
    expect(extractIngredients(fields)).toEqual([{ name: 'Beef', measure: '1 kg' }]);
  });

  it('keeps an ingredient whose measure is absent', () => {
    const fields: Record<string, string | null> = {
      ...slots([['Beef', '1 kg']]),
      strIngredient2: 'Parsley',
      strMeasure2: '  ',
    };

    // "Parsley, some" is still a thing to buy. Only a missing *name* is fatal.
    expect(extractIngredients(fields)).toEqual([
      { name: 'Beef', measure: '1 kg' },
      { name: 'Parsley', measure: '' },
    ]);
  });

  it('reads all twenty slots, including the last', () => {
    const pairs: [string, string][] = Array.from({ length: 20 }, (_, index) => [
      `Ingredient ${String(index + 1)}`,
      `${String(index + 1)} g`,
    ]);

    const extracted = extractIngredients(slots(pairs));

    expect(extracted).toHaveLength(20);
    expect(extracted[19]).toEqual({ name: 'Ingredient 20', measure: '20 g' });
  });

  it('returns nothing when every slot is empty', () => {
    expect(extractIngredients(slots([]))).toEqual([]);
  });

  it('trims surrounding whitespace from what it keeps', () => {
    const fields = slots([['  Beef  ', '  1 kg  ']]);

    expect(extractIngredients(fields)).toEqual([{ name: 'Beef', measure: '1 kg' }]);
  });
});

describe('optionalUrl', () => {
  it('returns the trimmed URL when one is present', () => {
    expect(optionalUrl('  https://example.test/recipe  ')).toBe('https://example.test/recipe');
  });

  it.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('returns null for %s', (_label, value) => {
    // An anchor whose href is "" links to the current page, which reads as a
    // working link and is not one.
    expect(optionalUrl(value)).toBeNull();
  });
});

describe('toRecipe', () => {
  it('maps a validated meal onto the domain shape', () => {
    expect(
      toRecipe({
        idMeal: '52874',
        strMeal: '  Beef Pie  ',
        strMealThumb: 'https://example.test/pie.jpg',
        strCategory: 'Beef',
        strArea: 'British',
        strInstructions: '  Cook it.  ',
        strYoutube: 'https://youtu.be/abc',
        strSource: '   ',
        strIngredient1: 'Beef',
        strMeasure1: '1 kg',
        strIngredient2: 'Onion',
        strMeasure2: '2',
      }),
    ).toEqual({
      id: '52874',
      title: 'Beef Pie',
      thumbnailUrl: 'https://example.test/pie.jpg',
      category: 'Beef',
      area: 'British',
      instructions: 'Cook it.',
      ingredients: [
        { name: 'Beef', measure: '1 kg' },
        { name: 'Onion', measure: '2' },
      ],
      youtubeUrl: 'https://youtu.be/abc',
      sourceUrl: null,
    });
  });

  it('reads each link from its own field (AC4)', () => {
    // Mutation testing found that nothing asserted where `sourceUrl` came
    // from: the only mapping test asserted `null`, and both the component and
    // browser tests checked the source link's presence without its href. So
    // `toRecipe` could stop reading `strSource` entirely, or read the wrong
    // field, with 143 unit and 118 browser tests green.
    const recipe = toRecipe({
      idMeal: '1',
      strMeal: 'Beef Pie',
      strYoutube: 'https://youtu.be/abc',
      strSource: 'https://example.test/recipe',
    });

    expect(recipe.youtubeUrl).toBe('https://youtu.be/abc');
    expect(recipe.sourceUrl).toBe('https://example.test/recipe');
  });

  it('coerces non-string fields to empty rather than rendering them', () => {
    // The API schema uses catchall(unknown), so a number or boolean can arrive
    // in a field we expect to be text.
    const recipe = toRecipe({ idMeal: 1, strMeal: true, strCategory: null });

    expect(recipe).toMatchObject({ id: '', title: '', category: '', ingredients: [] });
  });
});

describe('toCategory', () => {
  it('maps a validated category', () => {
    expect(
      toCategory({
        idCategory: '1',
        strCategory: ' Beef ',
        strCategoryThumb: ' https://x/beef.png ',
        strCategoryDescription: ' Meat from cattle. ',
      }),
    ).toEqual({
      id: '1',
      name: 'Beef',
      thumbnailUrl: 'https://x/beef.png',
      description: 'Meat from cattle.',
    });
  });

  it('yields empty strings rather than null for the fields the API omits', () => {
    // The tile renders the thumbnail conditionally on `!== ''`; a null here
    // would render `src="null"` and request a broken image.
    expect(toCategory({ idCategory: '2', strCategory: 'Pasta' })).toEqual({
      id: '2',
      name: 'Pasta',
      thumbnailUrl: '',
      description: '',
    });
  });
});

describe('toRecipeSummary', () => {
  it('maps the fields a card needs', () => {
    expect(
      toRecipeSummary({
        idMeal: '1',
        strMeal: 'Beef Pie',
        strMealThumb: 'https://x/1.jpg',
        strCategory: 'Beef',
        strArea: 'British',
      }),
    ).toEqual({
      id: '1',
      title: 'Beef Pie',
      thumbnailUrl: 'https://x/1.jpg',
      category: 'Beef',
      area: 'British',
    });
  });

  it('leaves category and area empty for a filter result that omits them', () => {
    // filter.php sends id, title and thumbnail only. The card joins category
    // and area with a separator, so absent fields must be '' and not 'null'.
    const summary = toRecipeSummary({ idMeal: '1', strMeal: 'Acaraje', strArea: null });

    expect(summary).toEqual({
      id: '1',
      title: 'Acaraje',
      thumbnailUrl: '',
      category: '',
      area: '',
    });
    expect([summary.category, summary.area].filter(Boolean).join(' · ')).toBe('');
  });
});
