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

    it('given a breaking commit scoped to a different package when resolved then it does not release this package', () => {
      const commit = ConventionalCommit.parse('feat(pkg-b)!: breaking');
      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.NONE);
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

    it('given a feat commit scoped to another package when resolved then it does not release this package', () => {
      const commit = ConventionalCommit.parse('feat(pkg-b): add feature');
      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });
  });

  describe('configured matchers', () => {
    it('given a docs(specs) commit with packages "*" when resolved then every package is patch-bumped', () => {
      const bumps: BumpMatchers = {
        major: DEFAULT_MAJOR_MATCHERS,
        minor: DEFAULT_MINOR_MATCHERS,
        patch: [...DEFAULT_PATCH_MATCHERS, { type: 'docs', scope: 'specs', packages: '*' }],
      };
      const matcher = new BumpMatcher(bumps);
      const commit = ConventionalCommit.parse('docs(specs): extract cross-package specs');

      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(matcher.resolveLevel(commit, 'pkg-b')).toBe(SemVerBumpType.PATCH);
    });

    it('given a matcher restricted to an explicit package list when resolved then only listed packages are bumped', () => {
      const bumps: BumpMatchers = {
        major: [],
        minor: [],
        patch: [{ type: 'docs', scope: 'specs', packages: ['pkg-a'] }],
      };
      const matcher = new BumpMatcher(bumps);
      const commit = ConventionalCommit.parse('docs(specs): update pkg-a docs');

      expect(matcher.resolveLevel(commit, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(matcher.resolveLevel(commit, 'pkg-b')).toBe(SemVerBumpType.NONE);
    });

    it('given a matcher with scope "<package>" when resolved then it behaves like the default matchesScope rule', () => {
      const matcher = new BumpMatcher({ major: [], minor: [{ type: 'feat', scope: '<package>' }], patch: [] });

      expect(matcher.resolveLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), 'pkg-a')).toBe(SemVerBumpType.MINOR);
      expect(matcher.resolveLevel(ConventionalCommit.parse('feat(pkg-b): add feature'), 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given a repository-specific type-and-scope pair when resolved then it is expressible as a matcher', () => {
      const matcher = new BumpMatcher({ major: [], minor: [], patch: [{ type: 'docs', scope: 'specs' }] });

      expect(matcher.resolveLevel(ConventionalCommit.parse('docs(specs): note'), 'specs')).toBe(SemVerBumpType.PATCH);
      expect(matcher.resolveLevel(ConventionalCommit.parse('docs(other): note'), 'specs')).toBe(SemVerBumpType.NONE);
    });

    it('given a type restricted to one scope when resolved then it does not match under a different scope', () => {
      const matcher = new BumpMatcher({ major: [], minor: [], patch: [{ type: 'docs', scope: 'specs', packages: '*' }] });

      expect(matcher.resolveLevel(ConventionalCommit.parse('docs(other): note'), 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given a commit matching no matcher when resolved then it is not a release trigger', () => {
      const matcher = new BumpMatcher({ major: [], minor: [], patch: [] });
      expect(matcher.resolveLevel(ConventionalCommit.parse('ci(github): upgrade action'), 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given two matchers on the same commit at different levels when resolved then the highest wins', () => {
      const matcher = new BumpMatcher({
        major: [{ type: 'feat', scope: '<package>' }],
        minor: [{ type: 'feat', scope: '<package>' }],
        patch: [{ type: 'feat', scope: '<package>' }],
      });
      expect(matcher.resolveLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), 'pkg-a')).toBe(SemVerBumpType.MAJOR);
    });

    it('given breaking: false when resolved then it only matches non-breaking commits', () => {
      const matcher = new BumpMatcher({ major: [], minor: [{ type: 'feat', scope: '<package>', breaking: false }], patch: [] });

      expect(matcher.resolveLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), 'pkg-a')).toBe(SemVerBumpType.MINOR);
      expect(matcher.resolveLevel(ConventionalCommit.parse('feat(pkg-a)!: add feature'), 'pkg-a')).toBe(SemVerBumpType.NONE);
    });
  });
});
