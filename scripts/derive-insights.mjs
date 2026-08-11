#!/usr/bin/env node
/**
 * Recomputes the figures in INSIGHTS.md and writes them to
 * docs/quality/insights-data.json.
 *
 * INSIGHTS.md has now shipped twice with numbers that did not reproduce, and
 * both times the only detector was a reviewer reading it. The second failure
 * was not even a measurement error — the table was recomputed correctly and the
 * prose quoting it was not. So the fix is a single source of truth the prose is
 * checked against, not a more careful author.
 *
 * Run: node scripts/derive-insights.mjs [--check]
 *
 * `--check` recomputes and exits non-zero if the committed JSON is stale. It is
 * run by hand (`npm run check:insights`) and by nothing else: the slices it
 * measures live on branches that were deleted after merge, so a CI checkout —
 * which has `main` and the pull-request head, not those tips — cannot reproduce
 * them. Making it a gate would fail for reasons that are not defects. That is a
 * real limit, not a preference, and `INSIGHTS.md` says so.
 *
 * Deliberately git-only. The pull-request count and the CI median come from the
 * GitHub API, which a test cannot reach offline; those two are carried in the
 * JSON as `apiDerived` and marked in INSIGHTS.md as such, so nothing pretends
 * they are checked here.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'docs/quality/insights-data.json';
/** The commit this snapshot describes. Later commits are ignored on purpose. */
const THROUGH = '5a366e4893e753d0e27cc7d5409b89b7e6a5f517';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

function commits() {
  const raw = git('log', '--all', '--pretty=%H|%ct|%s', '--reverse').trim().split('\n');
  const all = raw.map((line) => {
    const [hash, time, ...rest] = line.split('|');
    return { hash, time: Number(time), subject: rest.join('|') };
  });
  const cut = all.findIndex((c) => c.hash === THROUGH);

  if (cut === -1) throw new Error(`snapshot commit ${THROUGH} not in history`);

  return all.slice(0, cut + 1);
}

/** A squash merge lands as a subject ending in `(#N)`; a merge commit says so. */
const isMerge = (subject) => /\(#\d+\)$/.test(subject) || subject.startsWith('Merge pull request');

function slices(log) {
  const groups = [];
  let current = [];

  for (const commit of log) {
    current.push(commit);

    if (isMerge(commit.subject)) {
      groups.push(current);
      current = [];
    }
  }

  return groups;
}

/** Averages the two middle values on an even-length list, as convention. */
function median(sorted) {
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const MINUTE = 60;
const round = (seconds) => Math.round(seconds / MINUTE);

function derive() {
  const log = commits();
  const first = log[0].time;
  const last = log[log.length - 1].time;

  // Truncated, not removed: the part of any gap beyond 30 minutes is dropped,
  // the first 30 minutes of it are kept as work.
  const CAP = 30 * MINUTE;
  let active = 0;

  for (let i = 1; i < log.length; i += 1) active += Math.min(log[i].time - log[i - 1].time, CAP);

  const fixes = log.filter((c) => c.subject.startsWith('fix'));
  const fixGaps = [];

  for (let i = 1; i < log.length; i += 1) {
    if (log[i].subject.startsWith('fix')) fixGaps.push((log[i].time - log[i - 1].time) / MINUTE);
  }

  fixGaps.sort((a, b) => a - b);

  // Product slices only: S0 and the governance pull request are dominated by
  // waiting for approval, which is not what this table is about.
  const PRODUCT = /^(feat\(s[1-9]\)|feat\(s3,s4\)|chore\(s7\)|fix: verify the source link)/;
  const rows = slices(log)
    .filter((group) => PRODUCT.test(group[group.length - 1].subject))
    .map((group) => {
      const merged = group[group.length - 1].time;
      const rounds = group.length - 2; // exclude the initial commit and the merge
      const secondCommit = group[1]?.time ?? merged;

      return {
        slice: group[0].subject.slice(0, 40),
        buildMinutes: round((rounds > 0 ? secondCommit : merged) - group[0].time),
        reviewMinutes: rounds > 0 ? round(merged - secondCommit) : 0,
        rounds: Math.max(rounds, 0),
        buildSeconds: (rounds > 0 ? secondCommit : merged) - group[0].time,
        reviewSeconds: rounds > 0 ? merged - secondCommit : 0,
      };
    });

  const buildSeconds = rows.reduce((sum, r) => sum + r.buildSeconds, 0);
  const reviewSeconds = rows.reduce((sum, r) => sum + r.reviewSeconds, 0);

  // The one stretch the human left running unattended: S1's first commit to
  // S9's merge, with the same 30-minute truncation as the header figures.
  const s1 = log.findIndex((c) => c.subject.startsWith('feat(s1)'));
  const s9 = log.findIndex((c) => /^feat\(s9\).*\(#\d+\)$/.test(c.subject));
  let stretch = 0;

  for (let i = s1 + 1; i <= s9; i += 1) stretch += Math.min(log[i].time - log[i - 1].time, CAP);

  // The pair the plan called independent. S4 is not separable: it shipped in
  // the same pull request as S3.
  const pair = rows.filter((r) => /feat\(s3,s4\)|feat\(s5\)/.test(r.slice));
  const pairSeconds = pair.reduce((sum, r) => sum + r.buildSeconds + r.reviewSeconds, 0);
  const pairReviewSeconds = pair.reduce((sum, r) => sum + r.reviewSeconds, 0);

  return {
    snapshotCommit: THROUGH,
    wallClockHours: Number(((last - first) / 3600).toFixed(1)),
    activeHours: Number((active / 3600).toFixed(1)),
    waitingHours: Number(((last - first - active) / 3600).toFixed(1)),
    waitingSharePercent: Math.round(((last - first - active) / (last - first)) * 100),
    commits: log.length,
    fixCommits: fixes.length,
    fixSharePercent: Math.round((fixes.length / log.length) * 100),
    medianCommitToFixMinutes: Number(median(fixGaps).toFixed(1)),
    slices: rows.map((row) => ({
      slice: row.slice,
      buildMinutes: row.buildMinutes,
      reviewMinutes: row.reviewMinutes,
      rounds: row.rounds,
    })),
    totalBuildMinutes: round(buildSeconds),
    totalReviewMinutes: round(reviewSeconds),
    totalRounds: rows.reduce((sum, r) => sum + r.rounds, 0),
    reviewSharePercent: Math.round((reviewSeconds / (buildSeconds + reviewSeconds)) * 100),
    // Printed cells are rounded individually, so their sum can differ from a
    // total computed from exact timestamps. Stated rather than hidden.
    printedBuildColumnSum: rows.reduce((sum, r) => sum + r.buildMinutes, 0),
    exactBuildMinutes: Number((buildSeconds / MINUTE).toFixed(1)),
    gapsOverAnHour: log.filter((c, i) => i > 0 && c.time - log[i - 1].time > 3600).length,
    longestGapHours: Number(
      (Math.max(...log.map((c, i) => (i > 0 ? c.time - log[i - 1].time : 0))) / 3600).toFixed(0),
    ),
    autonomousStretchActiveHours: Number((stretch / 3600).toFixed(1)),
    pairTotalMinutes: round(pairSeconds),
    pairReviewMinutes: round(pairReviewSeconds),
    // Halving the build column against the combined total.
    doublingBuildSavesMinutes: round(buildSeconds / 2),
    combinedMinutes: round(buildSeconds + reviewSeconds),
    doublingBuildSavesPercent: Math.round(
      (buildSeconds / 2 / (buildSeconds + reviewSeconds)) * 100,
    ),
    // What review would cost if the same remediation arrived in 9 rounds rather
    // than the 23 it took. An extrapolation, not a measurement, and INSIGHTS.md
    // labels it as one.
    nineRoundEquivalentMinutes: round(
      (reviewSeconds * 9) / rows.reduce((sum, r) => sum + r.rounds, 0),
    ),
    apiDerived: {
      note: 'From the GitHub API on 2026-08-11; not recomputed by this script.',
      mergedPullRequests: 13,
      medianCiSeconds: 74,
      ciRunsMeasured: 73,
    },
  };
}

const derived = derive();
const serialized = `${JSON.stringify(derived, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const committed = readFileSync(OUT, 'utf8');

  if (committed !== serialized) {
    console.error(`${OUT} is stale. Run: node scripts/derive-insights.mjs`);
    process.exit(1);
  }

  console.log(`ok    ${OUT} matches the history it describes`);
} else {
  writeFileSync(OUT, serialized);
  console.log(`wrote ${OUT}`);
}
