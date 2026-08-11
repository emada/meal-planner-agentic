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
    // Bounded to each slice's own section. A non-greedy match from one
    // heading ran to the next `Status: planned` anywhere below it, which marked
    // every slice planned as soon as one was.
    const shipped = [...plan.matchAll(/^### (S\d+) — [^\n]*\n([\s\S]*?)(?=^#{2,3} )/gm)]
      .filter((match) => !(match[2] ?? '').includes('**Status**: planned'))
      .map((match) => match[1] ?? '');

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

    const spell = (n: number) =>
      [
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
        'twenty',
      ][n];

    // Every "N of M ... gates" claim must use the table's own numbers: the
    // numerator is either the proven or the unproven count, the denominator is
    // always the total.
    const wrong: string[] = [];

    for (const [name, text] of [
      ['gates.md', gates],
      ['bootstrap-adoption.md', adoption],
    ] as const) {
      for (const match of text.matchAll(/(\w+) of (\w+) (?:mandatory )?gates/gi)) {
        const [claim, left, right] = match;
        const numerator = (left ?? '').toLowerCase();
        const denominator = (right ?? '').toLowerCase();

        const numeratorValid = numerator === spell(proven) || numerator === spell(unproven);

        if (!numeratorValid || denominator !== spell(rows.length)) {
          wrong.push(`${name}: "${claim}"`);
        }
      }

      // "…; the other nine remain unproven" is the same hand-written count
      // wearing different words, and it survived the sweep above when the
      // table grew by one because it names no denominator.
      for (const match of text.matchAll(/the other (\w+) (?:remain|are)\b[^.]*/gi)) {
        const [claim, left] = match;
        const remainder = (left ?? '').toLowerCase();

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
