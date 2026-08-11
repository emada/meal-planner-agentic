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
    const plan = readFileSync('PLAN.md', 'utf8');

    // A slice is shipped once PLAN.md stops describing it as upcoming; S0-S6
    // are all merged at the time of writing, so any reference to them as a
    // future landing point is stale by construction.
    const shipped = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
    // Selected by content, not by table syntax: the bullet this guard was
    // written for was prose, and a `startsWith('| ')` filter excluded it
    // before the slice regex was ever evaluated.
    const rows = gates
      .split('\n')
      .filter((line) => /deferred|lands in|remains available/i.test(line));

    const stale = rows.filter((row) =>
      shipped.some((slice) =>
        new RegExp(`(\\| ${slice} +\\||\\b${slice}\\b[^.]*\\bif\\b)`).test(row),
      ),
    );

    expect(plan).toContain('S7');
    expect(stale).toEqual([]);
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
    }

    expect(
      wrong,
      `table holds ${String(rows.length)} gates: ${String(proven)} proven, ${String(unproven)} unproven`,
    ).toEqual([]);
  });
});
