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
});
