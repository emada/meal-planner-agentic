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

  it('makes a promoted entry name where it landed', () => {
    // The first promotion left every entry marked `propose` in the same commit
    // that promoted them, and the count agreed with the labels because both
    // were stale. Naming the destination is what makes the label checkable.
    const bootstrap = '.ai-engineering/.bootstrap';
    const wrong = rows
      .filter((row) => scopeOf(row) === 'promoted')
      .flatMap((row) => {
        const cell = promotedToOf(row);
        const file = /`([\w./-]+\.md)`/.exec(cell)?.[1];

        if (file === undefined) return [`${row[1] ?? ''}: names no contract file`];

        return existsSync(`${bootstrap}/${file}`)
          ? []
          : [`${row[1] ?? ''}: ${file} does not exist`];
      });

    expect(wrong, 'a promoted entry must name a contract file that exists').toEqual([]);
  });

  it('gives every entry a guard column, even when the guard is none', () => {
    // "none" is a legitimate answer and the useful one: it says this can recur.
    // A blank cell says nobody decided.
    const classified = rows.filter((row) => row.length >= 7);
    const blank = classified.filter((row) => (row[5] ?? '') === '').map((row) => row[1] ?? '');

    expect(blank, 'an entry with no guard must say "none" rather than nothing').toEqual([]);
  });
});
