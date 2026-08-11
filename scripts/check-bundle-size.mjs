#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * A budget the build must stay under, checked on the artifact that ships rather
 * than on source, and gzipped because that is what a browser downloads.
 *
 * Totals per extension, not per file: the app emits one chunk today, but the
 * moment a lazy route or a vendor split appears, five chunks each under the
 * ceiling would pass while the app shipped five times the bytes.
 *
 * JavaScript is anchored on measurement — 79.6 kB at S6, most of it React —
 * plus about 15% headroom. The CSS ceiling is a rounded floor rather than
 * measurement-plus-15%: at 1.6 kB the percentages are noise, and a stylesheet
 * that doubles is worth a look regardless.
 */
const BUDGETS = {
  '.js': 92_000,
  '.css': 3_000,
};

const assets = join(process.cwd(), 'dist', 'assets');

const totals = { '.js': 0, '.css': 0 };
const counts = { '.js': 0, '.css': 0 };

// withFileTypes rather than a separate stat: checking the path and then reading
// it is a time-of-check/time-of-use pair, which CodeQL flags as
// js/file-system-race. The dirent answers both questions from one read.
let entries = [];

try {
  entries = readdirSync(assets, { withFileTypes: true });
} catch {
  // Missing entirely is the same failure as empty, and deserves the same
  // message rather than a stack trace.
  entries = [];
}

for (const entry of entries) {
  if (!entry.isFile()) continue;

  const file = entry.name;
  const extension = file.endsWith('.js') ? '.js' : file.endsWith('.css') ? '.css' : null;

  if (extension === null) continue;

  const gzipped = gzipSync(readFileSync(join(assets, file))).byteLength;

  totals[extension] += gzipped;
  counts[extension] += 1;

  process.stdout.write(`      ${file}  ${String(gzipped)} B gzipped\n`);
}

let failed = false;
let overBudget = false;

// A build that emits nothing must not pass: an empty directory would otherwise
// satisfy every budget and report success.
if (counts['.js'] === 0) {
  process.stdout.write('FAIL  no JavaScript asset was measured; did the build run?\n');
  failed = true;
}

for (const [extension, budget] of Object.entries(BUDGETS)) {
  const total = totals[extension];
  const within = total <= budget;
  // "ok" for an extension that produced no file at all would contradict the
  // failure printed above it.
  const verdict = counts[extension] === 0 ? 'n/a ' : within ? 'ok  ' : 'FAIL';

  process.stdout.write(
    `${verdict}  ${extension} total across ${String(counts[extension])} file(s): ` +
      `${String(total)} B gzipped (budget ${String(budget)} B)\n`,
  );

  if (!within) {
    failed = true;
    overBudget = true;
  }
}

if (overBudget) {
  // Only when something genuinely exceeded a budget: printing this after "the
  // build did not run" points the reader at the wrong decision.
  process.stdout.write(
    '\nA bundle exceeded its budget. Either the addition is worth the bytes and the\n' +
      'budget moves in the same commit with a reason, or it is not and it comes out.\n',
  );
}

if (failed) process.exit(1);
