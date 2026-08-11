#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

for (const file of readdirSync(assets)) {
  const extension = file.endsWith('.js') ? '.js' : file.endsWith('.css') ? '.css' : null;

  if (extension === null) continue;

  const path = join(assets, file);

  if (!statSync(path).isFile()) continue;

  const gzipped = gzipSync(readFileSync(path)).byteLength;

  totals[extension] += gzipped;
  counts[extension] += 1;

  process.stdout.write(`      ${file}  ${String(gzipped)} B gzipped\n`);
}

let failed = false;

// A build that emits nothing must not pass: an empty directory would otherwise
// satisfy every budget and report success.
if (counts['.js'] === 0) {
  process.stdout.write('FAIL  no JavaScript asset was measured; did the build run?\n');
  failed = true;
}

for (const [extension, budget] of Object.entries(BUDGETS)) {
  const total = totals[extension];
  const within = total <= budget;

  process.stdout.write(
    `${within ? 'ok  ' : 'FAIL'}  ${extension} total across ${String(counts[extension])} file(s): ` +
      `${String(total)} B gzipped (budget ${String(budget)} B)\n`,
  );

  if (!within) failed = true;
}

if (failed) {
  process.stdout.write(
    '\nA bundle exceeded its budget. Either the addition is worth the bytes and the\n' +
      'budget moves in the same commit with a reason, or it is not and it comes out.\n',
  );
  process.exit(1);
}
