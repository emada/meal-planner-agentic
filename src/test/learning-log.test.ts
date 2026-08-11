import { readFileSync } from 'node:fs';

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

const scopeOf = (row: string[]) => row[row.length - 2] ?? '';

describe('the engineering learning log counts what it contains', () => {
  it('records entries at all', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('gives every entry a scope the log defines', () => {
    const allowed = ['local', 'propose', 'promoted', 'promoted-candidate'];
    const wrong = rows
      .filter((row) => !allowed.includes(scopeOf(row)))
      .map((row) => `${row[1] ?? ''}: ${scopeOf(row)}`);

    expect(wrong, 'scope must be one of the values the log defines').toEqual([]);
  });

  it('states the pending-promotion count its own table produces', () => {
    const pending = rows.filter((row) => scopeOf(row) === 'propose').length;
    const stated = /pull request: \*\*(\d+)\*\*/.exec(log)?.[1];

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

  it('gives every entry a guard column, even when the guard is none', () => {
    // "none" is a legitimate answer and the useful one: it says this can recur.
    // A blank cell says nobody decided.
    const classified = rows.filter((row) => row.length >= 7);
    const blank = classified.filter((row) => (row[5] ?? '') === '').map((row) => row[1] ?? '');

    expect(blank, 'an entry with no guard must say "none" rather than nothing').toEqual([]);
  });
});
