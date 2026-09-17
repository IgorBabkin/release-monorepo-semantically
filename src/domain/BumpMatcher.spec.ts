import { describe, expect, it } from 'vitest';
import { BumpMatcher, BumpMatchers, DEFAULT_MAJOR_MATCHERS, DEFAULT_MINOR_MATCHERS, DEFAULT_PATCH_MATCHERS } from './BumpMatcher.js';
import { ConventionalCommit } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';

const DEFAULT_BUMPS: BumpMatchers = { major: DEFAULT_MAJOR_MATCHERS, minor: DEFAULT_MINOR_MATCHERS, patch: DEFAULT_PATCH_MATCHERS };

describe('BumpMatcher.resolveLevel', () => {
  describe("default matchers (today's hard-coded behaviour)", () => {
    const matcher = new BumpMatcher(DEFAULT_BUMPS);

    it('given a breaking commit scoped to the package when resolved then it is a major bump', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a)!: breaking');
      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.MAJOR);
    });

    it('given a feat commit scoped to the package when resolved then it is a minor bump', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a): add feature');
      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.MINOR);
    });

    it('given a fix or perf commit scoped to the package when resolved then it is a patch bump', () => {
      expect(matcher.resolveLevel(ConventionalCommit.parse('fix(pkg-a): bug'), 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(matcher.resolveLevel(ConventionalCommit.parse('perf(pkg-a): faster'), 'pkg-a')).toBe(SemVerBumpType.PATCH);
    });

    it('given a docs commit when resolved then it matches nothing', () => {
      const commit = ConventionalCommit.parse('docs(pkg-a): update docs');
      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });
  });

  describe('level precedence', () => {
    it('given a commit matching matchers at more than one level when resolved then the highest wins', () => {
      const matcher = new BumpMatcher({
        major: [{ type: 'feat', scope: '<package>' }],
        minor: [{ type: 'feat', scope: '<package>' }],
        patch: [{ type: 'feat', scope: '<package>' }],
      });
      expect(matcher.resolveLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), 'pkg-a')).toBe(SemVerBumpType.MAJOR);
    });

    it('given a commit matching only patch when resolved then minor and major are not considered', () => {
      const matcher = new BumpMatcher({ major: [], minor: [], patch: [{ type: 'fix', scope: '<package>' }] });
      expect(matcher.resolveLevel(ConventionalCommit.parse('fix(pkg-a): bug'), 'pkg-a')).toBe(SemVerBumpType.PATCH);
    });
  });

  describe('configured matchers', () => {
    it('given a docs(specs) commit with packages "*" when resolved then every package is patch-bumped', () => {
      const matcher = new BumpMatcher({
        major: DEFAULT_MAJOR_MATCHERS,
        minor: DEFAULT_MINOR_MATCHERS,
        patch: [...DEFAULT_PATCH_MATCHERS, { type: 'docs', scope: 'specs', packages: '*' }],
      });
      const commit = ConventionalCommit.parse('docs(specs): extract cross-package specs');

      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(matcher.resolveLevel(commit, 'pkg-b')).toBe(SemVerBumpType.PATCH);
    });

    it('given a level configured to an empty list when resolved then it is no longer a release trigger', () => {
      const matcher = new BumpMatcher({ major: [], minor: [], patch: [] });
      expect(matcher.resolveLevel(ConventionalCommit.parse('fix(pkg-a): bug'), 'pkg-a')).toBe(SemVerBumpType.NONE);
    });
  });
});
