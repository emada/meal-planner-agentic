import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * `INSIGHTS.md` shipped twice with figures that did not reproduce, and a
 * reviewer was the only detector both times. The second failure was not a
 * measurement error: the table was recomputed correctly and the prose quoting it
 * kept the old totals, so the document contradicted itself.
 *
 * Guarding it figure by figure took seven review rounds and never converged —
 * each round added a guard and the next found another number outside it. So the
 * burden is inverted: `leaves no number unaccounted for` walks every number in
 * the document and fails on any that is neither the captured value of a guard
 * nor covered by an exemption with a stated reason.
 *
 * That check is **positional**. Its first version asked whether a number's
 * digits appeared anywhere inside any guard's match, which accepted every
 * single-digit number in the file and anything whose digits occurred inside a
 * guarded phrase — a check that could not fail, in the test whose subject is
 * checks that cannot fail.
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
 * split across lines. Matching the raw text is how the review total escaped an
 * earlier version of this test. Everything below indexes into this string, so
 * guard spans and number spans are directly comparable.
 */
function collapse(text: string) {
  const map: number[] = [];
  let out = '';
  let index = 0;

  while (index < text.length) {
    if (/\s/.test(text[index] ?? '')) {
      const start = index;

      while (index < text.length && /\s/.test(text[index] ?? '')) index += 1;
      for (let k = start; k < index; k += 1) map[k] = out.length;
      out += ' ';
    } else {
      map[index] = out.length;
      out += text[index] ?? '';
      index += 1;
    }
  }

  return { text: out, map };
}

const collapsed = collapse(insights);
const unwrapped = collapsed.text;

/**
 * Spans in `unwrapped` for structural markers, located in the raw text where
 * line anchors still exist. Matching `\d+\. \*\*` on the collapsed string
 * could not tell a list marker from a figure ending a sentence before a bold
 * one — a shape this document already uses — so it excused real figures.
 */
const markerSpans = (): [number, number][] =>
  [/^#{1,6} \d+\. /gm, /^\d+\. \*\*/gm].flatMap((pattern) =>
    [...insights.matchAll(pattern)].map((m) => {
      const from = collapsed.map[m.index] ?? 0;
      const to = (collapsed.map[m.index + m[0].length - 1] ?? 0) + 1;

      return [from, to] as [number, number];
    }),
  );

/** Character spans in `unwrapped` that a guard has claimed as its value. */
const claimed: [number, number][] = [];

const statesNumber = (value: number, context: RegExp) => {
  const match = new RegExp(context.source, `${context.flags}d`).exec(unwrapped);

  expect(match, `nothing in INSIGHTS.md matches ${String(context)}`).not.toBeNull();

  const span = match?.indices?.[1];

  expect(span, `${String(context)} has no capture group`).toBeDefined();
  expect(Number(match?.[1]), `${String(context)} disagrees with the derivation`).toBe(value);

  if (span) claimed.push([span[0], span[1]]);
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LABELS: [string, string][] = [
  ['feat(s1)', 'S1'],
  ['feat(s2)', 'S2'],
  ['feat(s3,s4)', 'S3+S4'],
  ['feat(s5)', 'S5'],
  ['feat(s6)', 'S6'],
  ['chore(s7)', 'S7'],
  ['feat(s8)', 'S8'],
  ['feat(s9)', 'S9'],
  ['fix: verify', 'AC4'],
];

const labelFor = (slice: string) =>
  LABELS.find(([prefix]) => slice.startsWith(prefix))?.[1] ?? slice;

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
    for (const slice of data.slices) {
      // Each cell claims its own span, so the exhaustiveness check accounts for
      // the table by a guard rather than by an exemption that would have to
      // call measured cells "not measurements".
      const name = escape(labelFor(slice.slice));

      statesNumber(slice.buildMinutes, new RegExp(`\\| ${name}[^|]*\\| (\\d+) m \\|`));
      statesNumber(slice.reviewMinutes, new RegExp(`\\| ${name}[^|]*\\| \\d+ m \\| (\\d+) m \\|`));
      statesNumber(
        slice.rounds,
        new RegExp(`\\| ${name}[^|]*\\| \\d+ m \\| \\d+ m \\| (\\d+) \\|`),
      );
    }
  });

  it('states the totals in the table and everywhere the prose repeats them', () => {
    statesNumber(data.totalBuildMinutes, /\*\*Total\*\* \| \*\*(\d+) m\*\*/);
    statesNumber(data.totalReviewMinutes, /\*\*Total\*\* \| \*\*\d+ m\*\* \| \*\*(\d+) m\*\*/);
    statesNumber(data.totalRounds, /\*\*Total\*\*[^|]*\|[^|]*\|[^|]*\| \*\*(\d+)\*\*/);

    statesNumber(data.totalBuildMinutes, /(\d+) minutes of building/);
    statesNumber(data.totalReviewMinutes, /minutes of building versus (\d+) of review/);
    statesNumber(data.totalReviewMinutes, /took (\d+) minutes against/);
    statesNumber(data.totalBuildMinutes, /minutes against (\d+) —/);
    statesNumber(data.totalReviewMinutes, /review time drops from (\d+) to/);
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
    statesNumber(data.totalRounds, /9 rounds instead of (\d+)/);
    statesNumber(data.nineRoundEquivalentMinutes, /to roughly (\d+) minutes/);
    statesNumber(Math.round(data.waitingHours), /(\d+) of \d+ hours were spent waiting/);
    statesNumber(Math.round(data.wallClockHours), /\d+ of (\d+) hours were spent waiting/);
    statesNumber(data.autonomousStretchActiveHours, /pull requests in ([\d.]+) hours/);
    statesNumber(data.medianCommitToFixMinutes, /is \*\*([\d.]+) minutes\*\*/);
    statesNumber(data.gapsOverAnHour, /The (\d+) gaps over an hour/);
    statesNumber(data.longestGapHours, /of about (\d+) hours/);
    statesNumber(data.gapsOverTwelveHours, /including (\d+) of about \d+ hours/);
    statesNumber(data.totalRounds, /fraction of the (\d+) remediation/);
    statesNumber(data.autonomousStretchPullRequests, /covered (\d+) pull requests/);

    const s6 = data.slices.find((slice) => slice.slice.startsWith('feat(s6)'));
    const ac4 = data.slices.find((slice) => slice.slice.startsWith('fix: verify'));

    expect(s6, 'no S6 slice in the derivation').toBeDefined();
    expect(ac4, 'no AC4 slice in the derivation').toBeDefined();
    statesNumber(s6?.rounds ?? -1, /S6 took (\d+) remediation/);
    statesNumber(ac4?.rounds ?? -1, /AC4 shows the gap — (\d+) remediation/);
  });

  /**
   * Every number is the captured value of a guard, or falls inside a span one
   * of these matches. Positional, like the guards: an exemption tested against
   * the surrounding text excused anything that merely shared a line — or a
   * neighbourhood — with an exempt token, which let four shapes of stray number
   * through.
   */
  const EXEMPT: [RegExp, string][] = [
    [/2026-08-11/g, 'the date the snapshot was taken'],
    // Requires at least one a-f, so a seven-digit figure in backticks is not
    // mistaken for a commit id. Every short SHA in this document has one.
    [/`(?![0-9]{7}`)[0-9a-f]{7}`/g, 'backticked short commit ids, which must contain a letter'],
    [/\b(?:S\d|AC\d|AC\d\d)\b/g, 'slice and acceptance-criterion labels'],
    [/truncated to 30 min/g, 'the truncation threshold, a parameter of the method'],
    [/arrived in 9 rounds instead/g, 'the hypothetical in the extrapolation'],
  ];

  /** Spans an exemption covers, paired with the reason that excuses them. */
  const excused: [number, number, string][] = [
    ...EXEMPT.flatMap(([pattern, reason]) =>
      [...unwrapped.matchAll(pattern)].map(
        (m) => [m.index, m.index + m[0].length, reason] as [number, number, string],
      ),
    ),
    ...markerSpans().map(
      ([from, to]) => [from, to, 'ordered-list and heading markers'] as [number, number, string],
    ),
  ];

  /**
   * The accounting itself, over an arbitrary document, so it can be tested
   * against inputs rather than only used. Ten review rounds went into this
   * mechanism and each one found a shape it accepted; a probe list that lives
   * in the suite is what stops the eleventh.
   */
  const account = (document: string, claims: [number, number][]) => {
    const doc = collapse(document);
    const spans: [number, number, string][] = [
      ...EXEMPT.flatMap(([pattern, reason]) =>
        [...doc.text.matchAll(pattern)].map(
          (m) => [m.index, m.index + m[0].length, reason] as [number, number, string],
        ),
      ),
      ...[/^#{1,6} \d+\. /gm, /^\d+\. \*\*/gm]
        .flatMap((pattern) => [...document.matchAll(pattern)])
        .map(
          (m) =>
            [
              doc.map[m.index] ?? 0,
              (doc.map[m.index + m[0].length - 1] ?? 0) + 1,
              'ordered-list and heading markers',
            ] as [number, number, string],
        ),
    ];
    const found: string[] = [];
    const used = new Set<string>();

    for (const match of doc.text.matchAll(/\d[\d.]*\d|\d/g)) {
      const start = match.index;
      const end = start + match[0].length;

      if (claims.some(([from, to]) => from === start && to === end)) continue;

      const excuse = spans.find(([from, to]) => from <= start && to >= end);

      if (excuse) {
        used.add(excuse[2]);
        continue;
      }

      found.push(match[0]);
    }

    return { found, used };
  };

  it('reports a number no guard claims, in every shape this document uses', () => {
    // Each of these was accepted by some earlier version of the check and found
    // by review. They stay here so the next widening is caught by the suite.
    const shapes = [
      'Only 7 reviewers were ever involved.',
      'There were 47 unrelated widgets.',
      'S1 also consumed 512 extra minutes of nothing.',
      '1. It burned 512 minutes doing nothing.',
      'Gaps beyond 30 min aside, 512 minutes vanished.',
      'A saving of 100. **That is the prize.**',
      'The shortest slice took 30 min end to end.',
      'We shipped 9 rounds instead.',
      'The budget was `1234567` minutes.',
      '| A row | 512 m |',
    ];

    for (const shape of shapes) {
      expect(account(shape, []).found, `unaccounted number not reported in: ${shape}`).not.toEqual(
        [],
      );
    }
  });

  it('excuses the structural markers it is meant to, and only at a line start', () => {
    expect(account('### 1. A heading', []).found).toEqual([]);
    expect(account('1. **A list item**', []).found).toEqual([]);
    // The same shape mid-sentence is a figure, not a marker.
    expect(account('It saved 1. **A bold sentence follows.**', []).found).toEqual(['1']);
  });

  it('leaves no number unaccounted for', () => {
    const unaccounted: string[] = [];
    const usedExemptions = new Set<string>();

    for (const match of unwrapped.matchAll(/\d[\d.]*\d|\d/g)) {
      const start = match.index;
      const end = start + match[0].length;

      if (claimed.some(([from, to]) => from === start && to === end)) continue;

      const excuse = excused.find(([from, to]) => from <= start && to >= end);

      if (excuse) {
        usedExemptions.add(excuse[2]);
        continue;
      }

      const around = unwrapped.slice(Math.max(0, start - 60), end + 60);

      unaccounted.push(`${match[0]} — …${around.trim()}…`);
    }

    expect(unaccounted, 'every number must be a guarded value or listed as exempt').toEqual([]);

    // An exemption nothing uses is a rule that cannot fire, and would silently
    // excuse a whole context the day someone wrote into it.
    const unused = EXEMPT.filter(([, reason]) => !usedExemptions.has(reason)).map(([, r]) => r);

    expect(unused, 'an exemption that excuses nothing must be removed').toEqual([]);
  });

  it('does not carry a figure the derivation no longer supports', () => {
    // Values that were published and wrong. Each carries its context, so the
    // check cannot fail the day a total legitimately takes one of these values.
    for (const retired of [
      '**90 s**',
      '76 minutes of building',
      '49 of them review',
      'one and a half to four',
    ]) {
      expect(insights, `${retired} was corrected and must not return`).not.toContain(retired);
    }
  });
});
