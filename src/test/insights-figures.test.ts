import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * `INSIGHTS.md` shipped twice with figures that did not reproduce, and a
 * reviewer was the only detector both times. The second failure was not a
 * measurement error at all: the table was recomputed correctly and the prose
 * quoting it was left at the old totals, so the document contradicted itself.
 *
 * These assertions bind the prose to `docs/quality/insights-data.json`, which
 * `scripts/derive-insights.mjs` computes from `git log`. A figure can still be
 * wrong — if the derivation is wrong — but it can no longer be wrong in two
 * places at once, which is the failure that actually happened.
 *
 * The JSON is not re-derived here: the branch commits it measures live in the
 * local repository and not in a fresh CI checkout, so recomputing would fail
 * for reasons that are not defects. `npm run check:insights` does that, against
 * full history, where it is meaningful.
 */
interface InsightsData {
  readonly wallClockHours: number;
  readonly activeHours: number;
  readonly waitingHours: number;
  readonly waitingSharePercent: number;
  readonly commits: number;
  readonly fixCommits: number;
  readonly fixSharePercent: number;
  readonly medianCommitToFixMinutes: number;
  readonly slices: readonly {
    readonly buildMinutes: number;
    readonly reviewMinutes: number;
    readonly rounds: number;
  }[];
  readonly totalBuildMinutes: number;
  readonly totalReviewMinutes: number;
  readonly totalRounds: number;
  readonly reviewSharePercent: number;
  readonly printedBuildColumnSum: number;
  readonly apiDerived: { readonly mergedPullRequests: number; readonly medianCiSeconds: number };
}

const data = JSON.parse(readFileSync('docs/quality/insights-data.json', 'utf8')) as InsightsData;
const insights = readFileSync('INSIGHTS.md', 'utf8');

/** Every place a figure appears must carry the same value, not just the table. */
const occurrences = (pattern: RegExp) => [...insights.matchAll(pattern)].map((m) => m[1] ?? '');

describe('INSIGHTS.md agrees with the history it reports', () => {
  it('states the header figures the derivation produced', () => {
    expect(insights).toContain(`**${String(data.wallClockHours)} h**`);
    expect(insights).toContain(`**${String(data.activeHours)} h**`);
    expect(insights).toContain(`**${String(data.waitingHours)} h**`);
    expect(insights).toContain(`| ${String(data.commits)} `);
    expect(insights).toContain(`**${String(data.fixCommits)} (${String(data.fixSharePercent)}%)**`);
    expect(insights).toContain(`**${String(data.apiDerived.medianCiSeconds)} s**`);
    expect(insights).toContain(`| ${String(data.apiDerived.mergedPullRequests)} `);
  });

  it('states each slice row exactly once, with the derived numbers', () => {
    for (const slice of data.slices) {
      const row = new RegExp(
        `\\|\\s+${String(slice.buildMinutes)} m \\|\\s+${String(slice.reviewMinutes)} m \\|\\s+${String(slice.rounds)} \\|`,
      );

      expect(insights, `no row for ${JSON.stringify(slice)}`).toMatch(row);
    }
  });

  it('quotes the same totals in the table and in the prose that cites them', () => {
    // This is the assertion that would have caught the real defect: the table
    // said 83/165 while a bullet two sections later still said 76/172.
    const build = occurrences(/(\d+) m(?:inutes)? of building/g);
    const review = occurrences(/(\d+) (?:m|of review)/g);

    expect(insights).toContain(`**${String(data.totalBuildMinutes)} m**`);
    expect(insights).toContain(`**${String(data.totalReviewMinutes)} m**`);
    expect(insights).toContain(`**${String(data.totalRounds)}**`);
    expect(insights).toContain(`**${String(data.reviewSharePercent)}% of slice time`);

    for (const stated of build) {
      expect(Number(stated), 'a prose building total disagrees with the table').toBe(
        data.totalBuildMinutes,
      );
    }
    expect(review.length).toBeGreaterThan(0);
  });

  it('states the rounding convention its own columns need', () => {
    // The Building cells sum to one less than the total, because each cell is
    // rounded before the sum. Saying so is what stops it reading as an error.
    expect(data.printedBuildColumnSum).not.toBe(data.totalBuildMinutes);
    expect(insights).toContain(`sums to ${String(data.printedBuildColumnSum)} as printed`);
  });

  it('states the round-trip median the derivation produced', () => {
    expect(insights).toContain(`**${String(data.medianCommitToFixMinutes)} minutes**`);
  });

  it('does not carry a figure the derivation no longer supports', () => {
    // Retired values, each of which was published and wrong. Listing them by
    // hand is crude, but a wrong number that has already shipped once is
    // exactly the one likely to be copied back in.
    for (const retired of ['**90 s**', '76 minutes of building', '172 of\n   review', '**25**']) {
      expect(insights, `${retired} was corrected and must not return`).not.toContain(retired);
    }
  });
});
