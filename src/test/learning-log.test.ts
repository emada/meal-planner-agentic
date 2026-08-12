import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * The log's own counts are the first thing it would get wrong. Its largest
 * recorded class is a document asserting what the code does not do, and a
 * hand-written "pending promotion: N" beside a table is that defect waiting to
 * happen — this project has now produced it four times in other documents.
 */
const log = readFileSync('docs/engineering/learning-log.md', 'utf8');

const rows = log
  .split('\n')
  .filter((line) => /^\|\s*[A-D]\d+\s*\|/.test(line))
  .map((line) => line.split('|').map((cell) => cell.trim()));

const scopeOf = (row: string[]) => row[row.length - 3] ?? '';
const promotedToOf = (row: string[]) => row[row.length - 2] ?? '';

describe('the engineering learning log counts what it contains', () => {
  it('records entries at all', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('gives every entry a scope the log defines', () => {
    const legend = /^- \*\*Scope\*\*([\s\S]*?)\n- \*\*Caught by/m.exec(log)?.[1] ?? '';
    const allowed = [...legend.matchAll(/`([a-z-]+)`/g)].map((match) => match[1]);

    expect(allowed.length, 'the legend must define at least one scope').toBeGreaterThan(0);

    const wrong = rows
      .filter((row) => !allowed.includes(scopeOf(row)))
      .map((row) => `${row[1] ?? ''}: ${scopeOf(row)}`);

    expect(wrong, 'scope must be one of the values the log defines').toEqual([]);
  });

  it('states the pending-promotion count its own table produces', () => {
    const pending = rows.filter((row) => scopeOf(row) === 'propose').length;
    const stated = /derived:pending-promotion -->(\d+)<!-- \/derived/.exec(log)?.[1];

    expect(stated, 'the log must state a pending-promotion count').toBeDefined();
    expect(Number(stated), 'the stated count disagrees with the table').toBe(pending);
  });

  it('names the largest class its own table produces', () => {
    // "The largest class by a wide margin" opened class A and stopped being
    // true when class B overtook it — in the entries about guards that pass
    // while the claim beside them is false.
    const sizes = new Map<string, number>();

    for (const row of rows) {
      const letter = (row[1] ?? '').charAt(0);

      sizes.set(letter, (sizes.get(letter) ?? 0) + 1);
    }

    const largest = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0];
    const stated = /derived:largest-class -->([A-D])<!-- \/derived/.exec(log)?.[1];

    expect(sizes.size, 'the table must produce classes to compare').toBeGreaterThan(1);
    expect(stated, 'the log must name its largest class').toBeDefined();
    expect(stated, 'the stated largest class disagrees with the table').toBe(largest?.[0]);
    // A tie would make "the largest" a false claim in either spelling.
    expect(
      [...sizes.values()].filter((size) => size === (largest?.[1] ?? 0)).length,
      'two classes are tied, so no single class is the largest',
    ).toBe(1);
  });

  it('states the entry count its own table produces', () => {
    const stated = /^([\w-]+) entries, and they are not/m.exec(log)?.[1];
    const words = [
      'Zero',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
      'Twenty',
      'Twenty-one',
      'Twenty-two',
      'Twenty-three',
      'Twenty-four',
      'Twenty-five',
      'Twenty-six',
      'Twenty-seven',
      'Twenty-eight',
      'Twenty-nine',
      'Thirty',
    ];

    expect(stated, 'the log must state how many entries it holds').toBeDefined();
    expect(words.indexOf(stated ?? ''), 'the stated entry count disagrees with the table').toBe(
      rows.length,
    );
  });

  it('names only guards that exist', () => {
    // A guard cell naming a file that is not there is the log's own class B.
    // It does not prove the guard fires — A2 named a real file that did not
    // guard it — but it catches the cheaper mistake.
    const roots = ['src/test', 'src/ui', 'src/domain', 'src/storage', 'src/api', 'e2e'];
    const missing = rows.flatMap((row) =>
      [...(row[5] ?? '').matchAll(/`([\w./-]+\.(?:test|spec)\.tsx?)`/g)]
        .map((match) => match[1] ?? '')
        .filter((file) =>
          file.includes('/')
            ? !existsSync(file)
            : !roots.some((root) => existsSync(`${root}/${file}`)),
        )
        .map((file) => `${row[1] ?? ''}: ${file}`),
    );

    expect(missing, 'a guard cell names a test file that does not exist').toEqual([]);
  });

  it('makes every guard name itself, rather than pointing at the row above', () => {
    // A2's guard became "none" and A3's "the same guard" silently resolved to
    // it, understating coverage that exists. An indirect reference is also
    // invisible to the existence check above.
    const indirect = rows
      .filter((row) => /\bthe same (guard|test|check)\b/i.test(row[5] ?? ''))
      .map((row) => `${row[1] ?? ''}: ${row[5] ?? ''}`);

    expect(indirect, 'a guard cell must name its guard, not refer to another row').toEqual([]);
  });

  const BOOTSTRAP = '.ai-engineering/.bootstrap';
  const promoted = () => rows.filter((row) => scopeOf(row) === 'promoted');

  it('makes a promoted entry name where it landed', () => {
    // The first promotion left every entry marked `propose` in the same commit
    // that promoted them, and the count agreed with the labels because both
    // were stale. Naming the destination is what makes the label checkable.
    const unnamed = promoted()
      .filter((row) => !/`[\w./-]+\.md`/.test(promotedToOf(row)))
      .map((row) => row[1] ?? '');

    expect(unnamed, 'a promoted entry must name a contract file').toEqual([]);
  });

  /**
   * The contract is a private submodule. A CI checkout has the product and not
   * the engine, so resolving these paths there fails for a reason that is not a
   * defect — which is exactly what happened: this check passed locally and
   * failed on all twenty rows in CI.
   *
   * `skipIf` rather than an early return: a skipped test is reported as
   * skipped, where a conditional `return` would report success for a check that
   * never ran.
   */
  it.skipIf(!existsSync(BOOTSTRAP))('resolves each destination in the contract', () => {
    const missing = promoted().flatMap((row) => {
      const file = /`([\w./-]+\.md)`/.exec(promotedToOf(row))?.[1] ?? '';

      return existsSync(`${BOOTSTRAP}/${file}`) ? [] : [`${row[1] ?? ''}: ${file}`];
    });

    expect(missing, 'a promoted entry names a contract file that does not exist').toEqual([]);
  });

  it('gives every entry a guard column, even when the guard is none', () => {
    // "none" is a legitimate answer and the useful one: it says this can recur.
    // A blank cell says nobody decided.
    const classified = rows.filter((row) => row.length >= 9);
    const blank = classified.filter((row) => (row[5] ?? '') === '').map((row) => row[1] ?? '');

    expect(blank, 'an entry with no guard must say "none" rather than nothing').toEqual([]);
  });
});
