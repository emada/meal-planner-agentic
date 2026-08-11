import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Governance documents drift when a decision changes. Authorising autonomous
 * merge falsified eleven statements across four files at once, and the review
 * that caught them was a model reading prose. A statement that is merely
 * corrected by hand comes back; one a gate rejects does not.
 *
 * These assertions encode positions that are currently true. When a position
 * genuinely changes, the test changes with it in the same commit — which is the
 * point: the change becomes visible instead of silent.
 */
describe('governance documents agree with the current authorization model', () => {
  const tracked = execFileSync('git', ['ls-files', '*.md', 'docs/*.md', 'docs/**/*.md'], {
    encoding: 'utf8',
    cwd: process.cwd(),
  })
    .split('\n')
    .filter(Boolean)
    // GOAL.md is preserved verbatim as the human supplied it.
    .filter((path) => path !== 'GOAL.md');

  const documents = tracked.map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  const forbid = (label: string, pattern: RegExp) => {
    it(`no document claims ${label}`, () => {
      const offenders = documents.filter(({ text }) => pattern.test(text)).map(({ path }) => path);

      expect(offenders).toEqual([]);
    });
  };

  // Superseded 2026-08-10: merge is authorized under EXECUTION.md
  // "Autonomous merge and release" while its signatures hold.
  forbid('agents never merge', /agents?[^.\n]{0,40}never merge/i);
  forbid('production requires a human merge', /human-approved merge|only by human merge/i);
  forbid('agents have no path to production', /no agent path to production|agents have no path/i);

  // Superseded 2026-08-10: spec O1 resolved as accepted risk.
  forbid('spec O1 is still open', /O1[^.\n]{0,60}(still open|remains open)/i);
  forbid('S7 is blocked', /blocked on spec O1|S7 (remains |is )?blocked/i);

  it('documents the same required contexts the versioned ruleset declares', () => {
    // The previous round of this document drifted from the ruleset twice: the
    // gate registry kept transcribing a five-context list after the ruleset had
    // grown. Binding the two mechanically is what stops a reader auditing the
    // merge gate from being told the wrong answer by the authoritative file.
    const ruleset: unknown = JSON.parse(readFileSync('.github/rulesets/protect-main.json', 'utf8'));
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    const contexts = (
      ruleset as {
        rules: { type: string; parameters?: { required_status_checks?: { context: string }[] } }[];
      }
    ).rules
      .find((rule) => rule.type === 'required_status_checks')
      ?.parameters?.required_status_checks?.map((check) => check.context);

    expect(contexts).toBeDefined();
    expect(contexts?.length).toBeGreaterThan(0);

    const undocumented = (contexts ?? []).filter((context) => !gates.includes(context));

    expect(undocumented).toEqual([]);
  });

  it('declares the same gates the evidence generator will run', () => {
    // The register explains that gates live beside the scripts they name so the
    // two cannot drift. That is only true if something checks.
    const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
    const gates = readFileSync('docs/quality/gates.md', 'utf8');

    const declared = (manifest as { sweai: { gates: string[] } }).sweai.gates;
    const quoted = /"gates": \[([^\]]*)\]/.exec(gates)?.[1] ?? '';

    const scripts = (manifest as { scripts: Record<string, string> }).scripts;
    const quotedGates = [...quoted.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

    expect(declared.length).toBeGreaterThan(0);
    // Set equality both ways, and every declared gate must name a real script:
    // a one-directional check would let the register quote a gate that no
    // longer exists.
    expect([...quotedGates].sort()).toEqual([...declared].sort());
    expect(declared.filter((gate) => !(gate in scripts))).toEqual([]);
  });

  it('never points a deferred gate at a slice that has already shipped', () => {
    // Twice now a "lands in S6" cell survived S6 shipping, leaving a commitment
    // with no landing point and nothing to surface it again.
    const gates = readFileSync('docs/quality/gates.md', 'utf8');
    const adoption = readFileSync('docs/quality/bootstrap-adoption.md', 'utf8');
    const threats = readFileSync('docs/security/threat-model.md', 'utf8');
    const plan = readFileSync('PLAN.md', 'utf8');

    // Derived from PLAN.md rather than listed here. A hand-kept list stops
    // growing the moment someone forgets it, and this one had already fallen a
    // slice behind: S7 shipped while the list still ended at S6, so nothing
    // would have caught a "lands in S7".
    //
    // Shipped is opt-in, not opt-out. Reading "no planned marker" as shipped
    // meant a new slice written in the old format — none of S0-S6 carried a
    // status line — would be classified shipped on the day it was drafted, and
    // its own landing points would fail the suite as stale.
    //
    // The section bound matters: a non-greedy match from one heading ran on to
    // the next slice's status line, so one slice's state described them all.
    const sections = [...plan.matchAll(/^### (S\d+) — [^\n]*\n([\s\S]*?)(?=^#{2,3} )/gm)];
    const shipped = sections
      .filter((match) => (match[2] ?? '').includes('**Status**: complete'))
      .map((match) => match[1] ?? '');

    // Every slice must declare where it stands, or the derivation above is
    // guessing. PLAN.md states this convention next to the slices.
    const undeclared = sections
      .filter((match) => !/\*\*Status\*\*: (complete|planned|in progress)/.test(match[2] ?? ''))
      .map((match) => match[1] ?? '');

    expect(undeclared).toEqual([]);
    expect(shipped).toContain('S8');
    // Selected by content, not by table syntax: the bullet this guard was
    // written for was prose, and a `startsWith('| ')` filter excluded it
    // before the slice regex was ever evaluated.
    // A slice is stale only when it is named as the *landing point* — a cell
    // of its own in the table, or the object of "lands in" / "available in"
    // in prose. A rationale that mentions S0 historically is not a promise.
    const shippedPattern = shipped.join('|');
    const isStale = (line: string) => {
      const cells = line.startsWith('| ') ? line.split('|').map((cell) => cell.trim()) : [];

      if (cells.some((cell) => shipped.includes(cell))) return true;

      return new RegExp(`(lands? in|available in|deferred to)\\s+(${shippedPattern})\\b`, 'i').test(
        line,
      );
    };

    // Pins the selector itself. Narrowing it to table rows once let the prose
    // bullet this guard exists for slip through with the suite green, so the
    // shapes it must catch — and must not — are asserted here rather than in a
    // commit message.
    expect(isStale('- **madge deferred.** madge remains available in S6 if wanted.')).toBe(true);
    expect(isStale('| Coverage thresholds | deferred | S6 | ... |')).toBe(true);
    expect(isStale('| Coverage thresholds | deferred | unscheduled | ... |')).toBe(false);
    expect(isStale('Coverage is reported from S0 and enforced later.')).toBe(false);

    // Three documents, not one: the step-5 cell and three "Planned" threat rows
    // survived a full slice because only gates.md was being read.
    const guarded = [
      ['gates.md', gates],
      ['bootstrap-adoption.md', adoption],
      ['PLAN.md', plan],
    ] as const;

    for (const [name, text] of guarded) {
      expect([name, ...text.split('\n').filter(isStale)]).toEqual([name]);
    }

    // Step 5 is unscheduled, and three documents have now claimed otherwise in
    // three different phrasings — "steps 4-5 land in S6", "steps 4-5 in S6",
    // and a table cell. Asserting the fact catches phrasings not yet invented.
    for (const [name, text] of guarded) {
      const scheduled = text
        .split('\n')
        .filter((line) => /steps? 4[–—-]5/i.test(line) && /\bS\d\b/.test(line));

      expect([name, ...scheduled]).toEqual([name]);
    }

    // A control cannot still be "planned" for a slice that has shipped.
    const planned = threats
      .split('\n')
      // Any dash, or a parenthesised slice: the em-dash-only form matched the
      // one row that existed when this was written and nothing else.
      .filter((line) =>
        new RegExp(`Planned\\s*(?:[—–-]|\\()\\s*(${shipped.join('|')})\\b`).test(line),
      );

    expect(planned).toEqual([]);
  });

  it('quotes a slice range that matches the slices PLAN.md declares', () => {
    // README said "slices S0-S7" for a full slice after S8 existed. Nothing
    // bound a range written in prose to the plan it described.
    const plan = readFileSync('PLAN.md', 'utf8');
    const slices = [...plan.matchAll(/^### S(\d+) — /gm)].map((match) => Number(match[1]));

    expect(slices.length).toBeGreaterThan(0);

    const first = `S${String(Math.min(...slices))}`;
    const last = `S${String(Math.max(...slices))}`;

    const wrong = documents.flatMap(({ path, text }) =>
      [...text.matchAll(/slices (S\d+)[–-](S\d+)/g)]
        .filter((match) => match[1] !== first || match[2] !== last)
        .map((match) => `${path}: "${match[0]}"`),
    );

    // The pattern is deliberately narrow — any `slices SX-SY` must be the full
    // range — so the message has to say that, or a maintainer writing about a
    // legitimate subrange gets a bare array diff and no idea why.
    expect(
      wrong,
      `prose must quote the full range ${first}-${last}; name individual slices instead of a subrange`,
    ).toEqual([]);
  });

  it('states gate counts that match the gate table they summarise', () => {
    // These counts drifted in three consecutive review rounds because they were
    // written by hand next to a table that already held the answer. Deriving
    // them from the table is what stops a fourth.
    const gates = readFileSync('docs/quality/gates.md', 'utf8');
    const adoption = readFileSync('docs/quality/bootstrap-adoption.md', 'utf8');

    const rows = gates
      .split('\n')
      .filter((line) => line.startsWith('| ') && line.includes(' | '))
      // The mandatory-gate table is the only one carrying a probe column.
      .filter((line) => line.includes('none recorded') || / \| \d{4}-\d{2}-\d{2} +\|/.test(line));

    const unproven = rows.filter((line) => line.includes('none recorded')).length;
    const proven = rows.length - unproven;

    expect(rows.length).toBeGreaterThan(0);

    // Composed rather than listed. The list stopped at twenty, so the table
    // growing to twenty-one made every denominator `undefined` — a comparison
    // that can never hold, which is worse than a wrong number because the
    // suite reports it as a failure of the document instead of the guard.
    const ONES = [
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'thirteen',
      'fourteen',
      'fifteen',
      'sixteen',
      'seventeen',
      'eighteen',
      'nineteen',
    ];
    const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy'];
    const spell = (n: number): string => {
      if (n < 20) return ONES[n] ?? String(n);

      const tens = TENS[Math.floor(n / 10)] ?? String(n);
      const unit = n % 10;

      return unit === 0 ? tens : `${tens}-${ONES[unit] ?? String(unit)}`;
    };

    // Pinned, because the bug this replaces was invisible: a hyphenated
    // denominator simply stopped matching and the guard fell silent.
    expect(spell(8)).toBe('eight');
    expect(spell(20)).toBe('twenty');
    expect(spell(21)).toBe('twenty-one');

    // Every "N of M ... gates" claim must use the table's own numbers: the
    // numerator is either the proven or the unproven count, the denominator is
    // always the total.
    const wrong: string[] = [];

    for (const [name, text] of [
      ['gates.md', gates],
      ['bootstrap-adoption.md', adoption],
    ] as const) {
      for (const match of text.matchAll(/([\w-]+) of ([\w-]+) (?:mandatory )?gates/gi)) {
        const [claim, left, right] = match;
        const numerator = (left ?? '').toLowerCase();
        const denominator = (right ?? '').toLowerCase();

        const numeratorValid = numerator === spell(proven) || numerator === spell(unproven);

        if (!numeratorValid || denominator !== spell(rows.length)) {
          wrong.push(`${name}: "${claim}"`);
        }
      }

      // Once every gate had a probe, the documents stopped saying "N of M"
      // and started saying "All M" — which matched no pattern here, so the
      // guard fell silent at the moment the numbers were most likely to move.
      for (const match of text.matchAll(/All ([\w-]+) (?:mandatory )?gates/gi)) {
        const [claim, left] = match;

        if ((left ?? '').toLowerCase() !== spell(rows.length) || unproven !== 0) {
          wrong.push(`${name}: "${claim}"`);
        }
      }

      // "…; the other nine remain unproven" is the same hand-written count
      // wearing different words, and it survived the sweep above when the
      // table grew by one because it names no denominator.
      for (const match of text.matchAll(
        /(?:the other|The unproven) ([\w-]+) (?:remains?|are)\b[^.]*|; ([\w-]+) (?:is|are) not\b/gi,
      )) {
        const [claim, other, trailing] = match;
        // "Twenty of twenty-one gates are proven; one is not" — the second
        // clause is the same hand-written count, and it drifted freely while
        // the first was guarded.
        const remainder = (other ?? trailing ?? '').toLowerCase();

        if (remainder !== spell(proven) && remainder !== spell(unproven)) {
          wrong.push(`${name}: "${claim}"`);
        }
      }
    }

    expect(
      wrong,
      `table holds ${String(rows.length)} gates: ${String(proven)} proven, ${String(unproven)} unproven`,
    ).toEqual([]);
  });
});
