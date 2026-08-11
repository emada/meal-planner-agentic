import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * `INSIGHTS.md` shipped twice with figures that did not reproduce, and a
 * reviewer was the only detector both times. The second failure was not a
 * measurement error: the table was recomputed correctly and the prose quoting it
 * kept the old totals, so the document contradicted itself.
 *
 * The first version of this test guarded that badly. It captured the prose
 * review total and never compared it — a check that could not fail, inside the
 * fix for checks that cannot fail. Every prose figure is now asserted by value.
 *
 * The JSON is not re-derived here. The slices it measures live on branches
 * deleted after merge, so a CI checkout cannot reproduce them and the check
 * would fail for reasons that are not defects. `npm run check:insights` does
 * that locally, against full history, where it is meaningful.
 */
interface Slice {
  readonly slice: string;
  readonly buildMinutes: number;
  readonly reviewMinutes: number;
  readonly rounds: number;
}

interface InsightsData {
  readonly snapshotCommit: string;
  readonly wallClockHours: number;
  readonly activeHours: number;
  readonly waitingHours: number;
  readonly waitingSharePercent: number;
  readonly commits: number;
  readonly fixCommits: number;
  readonly fixSharePercent: number;
  readonly medianCommitToFixMinutes: number;
  readonly slices: readonly Slice[];
  readonly totalBuildMinutes: number;
  readonly totalReviewMinutes: number;
  readonly totalRounds: number;
  readonly reviewSharePercent: number;
  readonly printedBuildColumnSum: number;
  readonly exactBuildMinutes: number;
  readonly gapsOverAnHour: number;
  readonly gapsOverTwelveHours: number;
  readonly autonomousStretchPullRequests: number;
  readonly longestGapHours: number;
  readonly autonomousStretchActiveHours: number;
  readonly pairTotalMinutes: number;
  readonly pairReviewMinutes: number;
  readonly doublingBuildSavesMinutes: number;
  readonly combinedMinutes: number;
  readonly doublingBuildSavesPercent: number;
  readonly nineRoundEquivalentMinutes: number;
  readonly apiDerived: { readonly mergedPullRequests: number; readonly medianCiSeconds: number };
}

const data = JSON.parse(readFileSync('docs/quality/insights-data.json', 'utf8')) as InsightsData;
const insights = readFileSync('INSIGHTS.md', 'utf8');

/**
 * Markdown wraps prose, so a figure and the word identifying it are routinely
 * split across lines. Matching on the raw text is how the review total escaped
 * the first version of this test.
 */
const unwrapped = insights.replace(/\s+/g, ' ');

const guarded: RegExp[] = [];

const statesNumber = (value: number, context: RegExp) => {
  guarded.push(context);

  const match = context.exec(unwrapped);

  expect(match, `nothing in INSIGHTS.md matches ${String(context)}`).not.toBeNull();
  expect(Number(match?.[1]), `${String(context)} disagrees with the derivation`).toBe(value);
};

describe('INSIGHTS.md agrees with the history it reports', () => {
  it('names the commit its snapshot ends at', () => {
    expect(insights).toContain(data.snapshotCommit.slice(0, 7));
  });

  it('states the header figures the derivation produced', () => {
    statesNumber(data.wallClockHours, /first commit to last \| \*\*([\d.]+) h/);
    statesNumber(data.activeHours, /truncated to 30 min\) \| \*\*([\d.]+) h/);
    statesNumber(data.waitingHours, /Waiting for a human \| \*\*([\d.]+) h/);
    statesNumber(data.commits, /\| Commits \| (\d+) \|/);
    statesNumber(data.fixCommits, /`fix` commits \| \*\*(\d+) \(/);
    statesNumber(data.fixSharePercent, /`fix` commits \| \*\*\d+ \((\d+)%\)/);
    statesNumber(data.apiDerived.medianCiSeconds, /Median CI run \| \*\*(\d+) s/);
    statesNumber(data.apiDerived.mergedPullRequests, /Pull requests merged \| (\d+) \|/);
    statesNumber(data.reviewSharePercent, /\*\*(\d+)% of slice time/);
    statesNumber(data.printedBuildColumnSum, /sums to (\d+) as printed/);
  });

  it('states each slice row with the derived numbers, under its own name', () => {
    const label: Record<string, string> = {
      'feat(s1)': 'S1',
      'feat(s2)': 'S2',
      'feat(s3,s4)': 'S3+S4',
      'feat(s5)': 'S5',
      'feat(s6)': 'S6',
      'chore(s7)': 'S7',
      'feat(s8)': 'S8',
      'feat(s9)': 'S9',
      'fix: verify': 'AC4',
    };

    for (const slice of data.slices) {
      const key = Object.keys(label).find((prefix) => slice.slice.startsWith(prefix));

      expect(key, `no label for ${slice.slice}`).toBeDefined();

      // Anchored to the row's name: two rows sharing a triple would otherwise
      // let a missing row pass. The label is escaped because "S3+S4" contains a
      // regex quantifier, which silently made that row's anchor unmatchable.
      const name = (label[key ?? ''] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const row = new RegExp(
        `\\| ${name}[^|]*\\|\\s+${String(slice.buildMinutes)} m \\|\\s+${String(slice.reviewMinutes)} m \\|\\s+${String(slice.rounds)} \\|`,
      );

      expect(insights, `no row for ${label[key ?? ''] ?? slice.slice}`).toMatch(row);
    }
  });

  it('states the totals in the table and everywhere the prose repeats them', () => {
    expect(insights).toContain(`**${String(data.totalBuildMinutes)} m**`);
    expect(insights).toContain(`**${String(data.totalReviewMinutes)} m**`);
    expect(insights).toContain(`**${String(data.totalRounds)}**`);
    expect(insights).toContain(`**${String(data.reviewSharePercent)}% of slice time`);

    statesNumber(data.totalBuildMinutes, /(\d+) minutes of building/);
    // The assertion the first version of this test was missing.
    statesNumber(data.totalReviewMinutes, /minutes of building versus (\d+) of review/);
    statesNumber(data.totalReviewMinutes, /took (\d+) minutes against/);
    statesNumber(data.totalBuildMinutes, /minutes against (\d+) —/);
  });

  it('states every derived figure the prose quotes back', () => {
    statesNumber(data.waitingSharePercent, /(\d+)% of the calendar time/);
    statesNumber(data.exactBuildMinutes, /and ([\d.]+) in fact/);
    statesNumber(data.fixCommits, /across all (\d+) `fix` commits/);
    statesNumber(data.pairTotalMinutes, /S5 together took (\d+) minutes/);
    statesNumber(data.pairReviewMinutes, /minutes, (\d+) of them review/);
    statesNumber(data.doublingBuildSavesMinutes, /throughput saves (\d+) of/);
    statesNumber(data.combinedMinutes, /saves \d+ of (\d+) minutes/);
    statesNumber(data.doublingBuildSavesPercent, /minutes — about (\d+)%/);
    // Resolved by name. A positional index would silently compare the wrong
    // slice if one were inserted or reordered.
    const s6 = data.slices.find((slice) => slice.slice.startsWith('feat(s6)'));

    expect(s6, 'no S6 slice in the derivation').toBeDefined();
    statesNumber(s6?.rounds ?? -1, /S6 took (\d+) remediation/);
    statesNumber(data.totalRounds, /9 rounds instead of (\d+)/);
    statesNumber(data.nineRoundEquivalentMinutes, /to roughly (\d+) minutes/);
    statesNumber(data.totalReviewMinutes, /review time drops from (\d+) to/);
    statesNumber(Math.round(data.waitingHours), /(\d+) of \d+ hours were spent waiting/);
    statesNumber(Math.round(data.wallClockHours), /\d+ of (\d+) hours were spent waiting/);
    statesNumber(data.autonomousStretchActiveHours, /pull requests in ([\d.]+) hours/);
    statesNumber(data.medianCommitToFixMinutes, /is \*\*([\d.]+) minutes\*\*/);
    statesNumber(data.gapsOverAnHour, /The (\d+) gaps over an hour/);
    statesNumber(data.longestGapHours, /of about (\d+) hours/);
    // The caveat repeats the round total. Round 3's defect was exactly a prose
    // repeat left behind by a table correction, and this one was still loose.
    statesNumber(data.totalRounds, /fraction of the (\d+) remediation/);
    statesNumber(data.gapsOverTwelveHours, /including (\d+) of about \d+ hours/);
    statesNumber(data.autonomousStretchPullRequests, /covered (\d+) pull requests/);

    // The definition paragraph quotes AC4's round count back. It was the last
    // derived figure the prose repeated without a check.
    const ac4 = data.slices.find((slice) => slice.slice.startsWith('fix: verify'));

    expect(ac4, 'no AC4 slice in the derivation').toBeDefined();
    statesNumber(ac4?.rounds ?? -1, /AC4 shows the gap — (\d+) remediation/);
  });

  it('states the rounding convention whenever its own columns need one', () => {
    // Conditional: the rounded cells summing to the exact total is a legitimate
    // state, and asserting they never match would fail on correct data.
    if (data.printedBuildColumnSum !== data.totalBuildMinutes) {
      expect(insights).toContain(`sums to ${String(data.printedBuildColumnSum)} as printed`);
    }
  });

  /**
   * Seven review rounds went "add a guard, find another unguarded figure". The
   * pattern only stops when the burden inverts: every number in the document
   * must be claimed by a guard or listed here with a reason.
   */
  it('leaves no number unaccounted for', () => {
    const exempt: [RegExp, string][] = [
      [/2026-08-11/, 'the date the snapshot was taken'],
      [/5a366e4/, 'the snapshot commit, asserted separately'],
      [/S\d/, 'slice labels, not measurements'],
      [/1\.4\.10|WCAG/, 'a standard reference'],
      [/30 min/, 'the truncation threshold, a parameter of the method'],
      [/\b9 rounds\b/, 'the hypothetical in the extrapolation, not a measurement'],
      [
        /about ten minutes per slice|twice as long|two thirds|four times/,
        'ratios read off the table',
      ],
      [/three reviewer passes/, 'reviewer passes, which git cannot record'],
      [/at least six/, 'dead guards counted by hand'],
      [/Three negative probes/, 'probe-hygiene failures counted by hand'],
      [/Twice a reviewer caught/, 'retractions counted by hand'],
      [
        /seven figures|including two that/,
        "this document's own first-version errors, counted by hand",
      ],
      [/^\s*\d+\.\s|^#+ \d+\./m, 'ordered-list and heading markers'],
    ];

    // Numbers as they appear to a reader: digits with their surrounding words.
    const unaccounted: string[] = [];

    for (const line of insights.split('\n')) {
      for (const match of line.matchAll(/\d[\d.,]*/g)) {
        const index = match.index;
        const context = line.slice(Math.max(0, index - 45), index + 45);
        const inUnwrapped = unwrapped.includes(context.trim().replace(/\s+/g, ' '));
        const isGuarded = guarded.some((pattern) => {
          const found = new RegExp(pattern.source, pattern.flags).exec(unwrapped);

          return found?.[0].includes(match[0]) ?? false;
        });

        if (isGuarded) continue;
        if (exempt.some(([pattern]) => pattern.test(line))) continue;
        if (!inUnwrapped) continue;

        unaccounted.push(`${match[0]} — ${context.trim()}`);
      }
    }

    expect(unaccounted, 'every number must be guarded or listed as exempt').toEqual([]);
  });

  it('does not carry a figure the derivation no longer supports', () => {
    // Values that were published and wrong. A number that has already shipped
    // once is the one most likely to be copied back in.
    // Bare numbers are excluded on purpose: `**25**` would fail on correct data
    // the day a total legitimately became 25. Each entry carries its context.
    const retiredValues = [
      '**90 s**',
      '76 minutes of building',
      '49 of them review',
      'one and a half to four',
    ];

    for (const retired of retiredValues) {
      expect(insights, `${retired} was corrected and must not return`).not.toContain(retired);
    }
  });
});
