#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A budget the build must stay under, checked on the artifact that ships rather
 * than on source. Gzipped, because that is what a browser downloads.
 *
 * Anchored on what the app actually weighs today — 79.6 kB of JavaScript and
 * 1.6 kB of CSS at S6 — plus about 15% headroom. Tight enough that accidentally
 * bundling a large dependency fails; loose enough that ordinary feature work
 * does not. Most of the JavaScript is React itself.
 */
const BUDGETS = {
  '.js': 92_000,
  '.css': 3_000,
};

const assets = join(process.cwd(), 'dist', 'assets');

let failed = false;

for (const file of readdirSync(assets)) {
  const extension = file.endsWith('.js') ? '.js' : file.endsWith('.css') ? '.css' : null;

  if (extension === null) continue;

  const path = join(assets, file);

  if (!statSync(path).isFile()) continue;

  const gzipped = gzipSync(readFileSync(path)).byteLength;
  const budget = BUDGETS[extension];
  const within = gzipped <= budget;

  process.stdout.write(
    `${within ? 'ok  ' : 'FAIL'}  ${file}  ${String(gzipped)} B gzipped (budget ${String(budget)} B)\n`,
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
