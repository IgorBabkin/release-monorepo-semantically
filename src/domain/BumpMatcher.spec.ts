import { describe, expect, it } from 'vitest';
import { BumpMatchers, DEFAULT_MAJOR_MATCHERS, DEFAULT_MINOR_MATCHERS, DEFAULT_PATCH_MATCHERS, resolveBumpLevel } from './BumpMatcher.js';
import { ConventionalCommit } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';

const DEFAULT_BUMPS: BumpMatchers = { major: DEFAULT_MAJOR_MATCHERS, minor: DEFAULT_MINOR_MATCHERS, patch: DEFAULT_PATCH_MATCHERS };

describe('resolveBumpLevel', () => {
  describe("default matchers (today's hard-coded behaviour)", () => {
    it('given a breaking commit scoped to the package when resolved then it is a major bump', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a)!: breaking');
      expect(resolveBumpLevel(commit, DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.MAJOR);
    });

    it('given a breaking commit scoped to a different package when resolved then it does not release this package', () => {
      const commit = ConventionalCommit.parse('feat(pkg-b)!: breaking');
      expect(resolveBumpLevel(commit, DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given a feat commit scoped to the package when resolved then it is a minor bump', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a): add feature');
      expect(resolveBumpLevel(commit, DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.MINOR);
    });

    it('given a fix or perf commit scoped to the package when resolved then it is a patch bump', () => {
      expect(resolveBumpLevel(ConventionalCommit.parse('fix(pkg-a): bug'), DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(resolveBumpLevel(ConventionalCommit.parse('perf(pkg-a): faster'), DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.PATCH);
    });

    it('given a docs commit when resolved then it matches nothing', () => {
      const commit = ConventionalCommit.parse('docs(pkg-a): update docs');
      expect(resolveBumpLevel(commit, DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given a feat commit scoped to another package when resolved then it does not release this package', () => {
      const commit = ConventionalCommit.parse('feat(pkg-b): add feature');
      expect(resolveBumpLevel(commit, DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });
  });

  describe('configured matchers', () => {
    it('given a docs(specs) commit with packages "*" when resolved then every package is patch-bumped', () => {
      const bumps: BumpMatchers = {
        major: DEFAULT_MAJOR_MATCHERS,
        minor: DEFAULT_MINOR_MATCHERS,
        patch: [...DEFAULT_PATCH_MATCHERS, { type: 'docs', scope: 'specs', packages: '*' }],
      };
      const commit = ConventionalCommit.parse('docs(specs): extract cross-package specs');

      expect(resolveBumpLevel(commit, bumps, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(resolveBumpLevel(commit, bumps, 'pkg-b')).toBe(SemVerBumpType.PATCH);
    });

    it('given a matcher restricted to an explicit package list when resolved then only listed packages are bumped', () => {
      const bumps: BumpMatchers = {
        major: [],
        minor: [],
        patch: [{ type: 'docs', scope: 'specs', packages: ['pkg-a'] }],
      };
      const commit = ConventionalCommit.parse('docs(specs): update pkg-a docs');

      expect(resolveBumpLevel(commit, bumps, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      expect(resolveBumpLevel(commit, bumps, 'pkg-b')).toBe(SemVerBumpType.NONE);
    });

    it('given a matcher with scope "<package>" when resolved then it behaves like the default matchesScope rule', () => {
      const bumps: BumpMatchers = { major: [], minor: [{ type: 'feat', scope: '<package>' }], patch: [] };

      expect(resolveBumpLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), bumps, 'pkg-a')).toBe(SemVerBumpType.MINOR);
      expect(resolveBumpLevel(ConventionalCommit.parse('feat(pkg-b): add feature'), bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given a repository-specific type-and-scope pair when resolved then it is expressible as a matcher', () => {
      const bumps: BumpMatchers = { major: [], minor: [], patch: [{ type: 'docs', scope: 'specs' }] };

      expect(resolveBumpLevel(ConventionalCommit.parse('docs(specs): note'), bumps, 'specs')).toBe(SemVerBumpType.PATCH);
      expect(resolveBumpLevel(ConventionalCommit.parse('docs(other): note'), bumps, 'specs')).toBe(SemVerBumpType.NONE);
    });

    it('given a type restricted to one scope when resolved then it does not match under a different scope', () => {
      const bumps: BumpMatchers = { major: [], minor: [], patch: [{ type: 'docs', scope: 'specs', packages: '*' }] };

      expect(resolveBumpLevel(ConventionalCommit.parse('docs(other): note'), bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given a commit matching no matcher when resolved then it is not a release trigger', () => {
      const bumps: BumpMatchers = { major: [], minor: [], patch: [] };
      expect(resolveBumpLevel(ConventionalCommit.parse('ci(github): upgrade action'), bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });

    it('given two matchers on the same commit at different levels when resolved then the highest wins', () => {
      const bumps: BumpMatchers = {
        major: [{ type: 'feat', scope: '<package>' }],
        minor: [{ type: 'feat', scope: '<package>' }],
        patch: [{ type: 'feat', scope: '<package>' }],
      };
      expect(resolveBumpLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), bumps, 'pkg-a')).toBe(SemVerBumpType.MAJOR);
    });

    it('given breaking: false when resolved then it only matches non-breaking commits', () => {
      const bumps: BumpMatchers = { major: [], minor: [{ type: 'feat', scope: '<package>', breaking: false }], patch: [] };

      expect(resolveBumpLevel(ConventionalCommit.parse('feat(pkg-a): add feature'), bumps, 'pkg-a')).toBe(SemVerBumpType.MINOR);
      expect(resolveBumpLevel(ConventionalCommit.parse('feat(pkg-a)!: add feature'), bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
    });
  });
});
