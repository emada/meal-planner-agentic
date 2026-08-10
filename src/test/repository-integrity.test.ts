import { execFileSync } from 'node:child_process';

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
});
