import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T43 - configurable bump rules via .release.json', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given a docs(specs) matcher with packages "*" when a matching commit lands then every public package is patch-bumped', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0' },
    ]);

    writeFileSync(
      path.join(fixture.workDir, '.release.json'),
      `${JSON.stringify({ report: { bumps: { patch: [{ type: 'docs', scope: 'specs', packages: '*' }] } } }, null, 2)}\n`,
    );
    fixture.commit('docs(specs): extract cross-package specs', 'pkg-a');

    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.1');
    expect(fixture.getPackageJson('pkg-b').version).toBe('2.0.1');
  });

  it('given a configured patch matcher that replaces the defaults when a fix commit lands then it is no longer release-triggering', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    writeFileSync(path.join(fixture.workDir, '.release.json'), `${JSON.stringify({ report: { bumps: { patch: [] } } }, null, 2)}\n`);
    fixture.commit('fix(pkg-a): resolve bug', 'pkg-a');

    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
  });

  it('given a matcher with scope "<package>" when a commit under that package scope lands then it behaves like the default rule', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    writeFileSync(
      path.join(fixture.workDir, '.release.json'),
      `${JSON.stringify({ report: { bumps: { minor: [{ type: 'feat', scope: '<package>' }] } } }, null, 2)}\n`,
    );
    fixture.commit('feat(pkg-a): add feature', 'pkg-a');

    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.1.0');
  });
});
