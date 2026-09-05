import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';

describe('T40 - verbose observability', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given --verbose when report runs then affected packages, versions and bump types are explained on stderr', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0', dependencies: { 'pkg-a': '1.0.0' } },
    ]);
    fixture.commit('feat(pkg-a): add feature', 'pkg-a');

    const outcome = fixture.runCli(['report', '--verbose']);

    expect(outcome.status).toBe('passed');
    expect(outcome.stderr).toContain('SCAN     2 public package(s) in dependency order: pkg-a, pkg-b');
    expect(outcome.stderr).toContain('SCAN     pkg-a <- feat(pkg-a): add feature');
    expect(outcome.stderr).toContain('DEPS     pkg-b <- pkg-a 1.0.0 -> 1.1.0 in dependencies (forces minor)');
    expect(outcome.stderr).toContain('PLAN     2 package(s) affected');
    expect(outcome.stderr).toContain('PLAN     pkg-a 1.0.0 -> 1.1.0 (minor, 1 commit(s))');
    expect(outcome.stderr).toContain('PLAN     pkg-b 2.0.0 -> 2.1.0 (minor, 0 commit(s), deps: pkg-a@1.1.0)');
    // The extra observability stays on stderr: stdout is still the context alone.
    expect(() => JSON.parse(outcome.stdout)).not.toThrow();
  });

  it('given no --verbose flag when report runs then the extra observability stays out of the output', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('feat(pkg-a): add feature', 'pkg-a');

    const outcome = fixture.runCli(['report']);

    expect(outcome.status).toBe('passed');
    expect(outcome.stderr).toContain('BUMP     pkg-a 1.0.0 -> 1.1.0 (minor)');
    expect(outcome.stderr).not.toContain('PLAN');
    expect(outcome.stderr).not.toContain('SCAN');
  });

  it('given --verbose when a later step consumes the context then it reports the plan it received once', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): resolve bug', 'pkg-a');

    const context = fixture.runCli(['report']).stdout;
    const outcome = fixture.runCli(['vcs', '--context', context, '--verbose', '--dry-run']);

    expect(outcome.status).toBe('passed');
    // `vcs` fans out into commit, tag and push, all sharing this invocation.
    expect(outcome.stderr.match(/PLAN {5}pkg-a 1\.0\.0 -> 1\.0\.1 \(patch, 1 commit\(s\)\)/g)).toHaveLength(1);
  });
});
