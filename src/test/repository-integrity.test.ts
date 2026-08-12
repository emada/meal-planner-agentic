import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * The operating contract is a pinned submodule. A symlink (Git mode 120000) or
 * a vendored copy is an invalid installation that silently removes the contract
 * from every clone, and review is the only thing that would otherwise catch a
 * regression back to it.
 */
describe('operating-contract installation', () => {
  const git = (...args: string[]) =>
    execFileSync('git', args, { encoding: 'utf8', cwd: process.cwd() }).trim();

  it('tracks .ai-engineering as a gitlink, not a symlink or a directory of files', () => {
    const entry = git('ls-files', '--stage', '.ai-engineering');

    expect(entry).not.toBe('');
    expect(entry.split(/\s+/)[0]).toBe('160000');
  });

  it('tracks no files inside the submodule from the product repository', () => {
    expect(git('ls-files', '--', '.ai-engineering/*')).toBe('');
  });

  it('owns no product-local copy of the contract', () => {
    expect(git('ls-files', '--', '.bootstrap')).toBe('');
  });

  it('records the pin this repository actually holds', () => {
    // EXECUTION.md named a commit two advances behind: the pin moved twice
    // through reviewed pull requests and the line describing it moved neither
    // time. Read from the index rather than from HEAD, so an advance is checked
    // in the commit that makes it rather than the one after.
    const pinned = git('ls-files', '--stage', '.ai-engineering').split(/\s+/)[1] ?? '';
    const execution = readFileSync('EXECUTION.md', 'utf8');

    expect(pinned, 'the submodule must be pinned to a commit').toMatch(/^[0-9a-f]{40}$/);
    expect(
      execution.includes(`\`${pinned}\``),
      `EXECUTION.md must record the pinned commit ${pinned}`,
    ).toBe(true);
  });
});
