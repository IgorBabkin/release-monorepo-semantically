import { describe, it, expect } from 'vitest';
import { BumpMatchers, ConventionalCommit, DEFAULT_MAJOR_MATCHERS, DEFAULT_MINOR_MATCHERS, DEFAULT_PATCH_MATCHERS } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';

const DEFAULT_BUMPS: BumpMatchers = { major: DEFAULT_MAJOR_MATCHERS, minor: DEFAULT_MINOR_MATCHERS, patch: DEFAULT_PATCH_MATCHERS };

describe('ConventionalCommit', () => {
  describe('parse', () => {
    it('should parse feat commit with scope', () => {
      const commit = ConventionalCommit.parse('feat(my-pkg): add feature');
      expect(commit.type).toBe('feat');
      expect(commit.scope).toBe('my-pkg');
      expect(commit.subject).toBe('add feature');
      expect(commit.isBreaking).toBe(false);
    });

    it('should parse fix commit without scope', () => {
      const commit = ConventionalCommit.parse('fix: resolve crash');
      expect(commit.type).toBe('fix');
      expect(commit.scope).toBeNull();
      expect(commit.subject).toBe('resolve crash');
    });

    it('should parse breaking change with bang', () => {
      const commit = ConventionalCommit.parse('feat(my-pkg)!: breaking change');
      expect(commit.isBreaking).toBe(true);
    });

    it('should return unknown type for non-conventional commit', () => {
      const commit = ConventionalCommit.parse('random message');
      expect(commit.type).toBe('unknown');
      expect(commit.subject).toBe('random message');
    });
  });

  describe('getExplicitBump', () => {
    it('should return MAJOR for [major] tag', () => {
      expect(ConventionalCommit.getExplicitBump('[major] feat: subject')).toBe(SemVerBumpType.MAJOR);
    });

    it('should return MINOR for [minor] tag', () => {
      expect(ConventionalCommit.getExplicitBump('[minor] feat: subject')).toBe(SemVerBumpType.MINOR);
    });

    it('should return PATCH for [patch] tag', () => {
      expect(ConventionalCommit.getExplicitBump('[patch] feat: subject')).toBe(SemVerBumpType.PATCH);
    });

    it('should return NONE for [skip-bump] tag', () => {
      expect(ConventionalCommit.getExplicitBump('[skip-bump] feat: subject')).toBe(SemVerBumpType.NONE);
    });

    it('should return undefined when no explicit bump tag is present', () => {
      expect(ConventionalCommit.getExplicitBump('feat: subject')).toBeUndefined();
    });
  });

  describe('bumpMatch', () => {
    describe('explicit bump tags', () => {
      it('should prioritize [major] over conventional commits', () => {
        const commit = ConventionalCommit.parse('[major] feat(pkg-a): subject');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.MAJOR);
      });

      it('should prioritize [minor] over conventional commits', () => {
        const commit = ConventionalCommit.parse('[minor] feat(pkg-a)!: subject');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.MINOR);
      });

      it('should prioritize [patch] over conventional commits', () => {
        const commit = ConventionalCommit.parse('[patch] feat(pkg-a)!: subject');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      });

      it('should prioritize [skip-bump] over conventional commits', () => {
        const commit = ConventionalCommit.parse('[skip-bump] feat(pkg-a)!: subject');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });
    });

    describe("default matchers (today's hard-coded behaviour)", () => {
      it('given a breaking commit scoped to the package when resolved then it is a major bump', () => {
        const commit = ConventionalCommit.parse('feat(pkg-a)!: breaking');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.MAJOR);
      });

      it('given a breaking commit scoped to a different package when resolved then it does not release this package', () => {
        const commit = ConventionalCommit.parse('feat(pkg-b)!: breaking');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });

      it('given a feat commit scoped to the package when resolved then it is a minor bump', () => {
        const commit = ConventionalCommit.parse('feat(pkg-a): add feature');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.MINOR);
      });

      it('given a feat commit scoped to another package when resolved then it does not release this package', () => {
        const commit = ConventionalCommit.parse('feat(pkg-b): add feature');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });

      it('given a fix or perf commit scoped to the package when resolved then it is a patch bump', () => {
        expect(ConventionalCommit.parse('fix(pkg-a): bug').bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.PATCH);
        expect(ConventionalCommit.parse('perf(pkg-a): faster').bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.PATCH);
      });

      it('given a docs commit when resolved then it matches nothing', () => {
        const commit = ConventionalCommit.parse('docs(pkg-a): update docs');
        expect(commit.bumpMatch(DEFAULT_BUMPS, 'pkg-a')).toBe(SemVerBumpType.NONE);
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

        expect(commit.bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.PATCH);
        expect(commit.bumpMatch(bumps, 'pkg-b')).toBe(SemVerBumpType.PATCH);
      });

      it('given a matcher restricted to an explicit package list when resolved then only listed packages are bumped', () => {
        const bumps: BumpMatchers = { major: [], minor: [], patch: [{ type: 'docs', scope: 'specs', packages: ['pkg-a'] }] };
        const commit = ConventionalCommit.parse('docs(specs): update pkg-a docs');

        expect(commit.bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.PATCH);
        expect(commit.bumpMatch(bumps, 'pkg-b')).toBe(SemVerBumpType.NONE);
      });

      it('given a matcher with scope "<package>" when resolved then it behaves like the default matchesScope rule', () => {
        const bumps: BumpMatchers = { major: [], minor: [{ type: 'feat', scope: '<package>' }], patch: [] };

        expect(ConventionalCommit.parse('feat(pkg-a): add feature').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.MINOR);
        expect(ConventionalCommit.parse('feat(pkg-b): add feature').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });

      it('given a repository-specific type-and-scope pair with no packages field when resolved then it falls back to scope-equals-package', () => {
        const bumps: BumpMatchers = { major: [], minor: [], patch: [{ type: 'docs', scope: 'specs' }] };

        expect(ConventionalCommit.parse('docs(specs): note').bumpMatch(bumps, 'specs')).toBe(SemVerBumpType.PATCH);
        expect(ConventionalCommit.parse('docs(other): note').bumpMatch(bumps, 'specs')).toBe(SemVerBumpType.NONE);
      });

      it('given a type restricted to one scope when resolved then it does not match under a different scope', () => {
        const bumps: BumpMatchers = { major: [], minor: [], patch: [{ type: 'docs', scope: 'specs', packages: '*' }] };
        expect(ConventionalCommit.parse('docs(other): note').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });

      it('given a commit matching no matcher when resolved then it is not a release trigger', () => {
        const bumps: BumpMatchers = { major: [], minor: [], patch: [] };
        expect(ConventionalCommit.parse('ci(github): upgrade action').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });

      it('given two matchers on the same commit at different levels when resolved then the highest wins', () => {
        const bumps: BumpMatchers = {
          major: [{ type: 'feat', scope: '<package>' }],
          minor: [{ type: 'feat', scope: '<package>' }],
          patch: [{ type: 'feat', scope: '<package>' }],
        };
        expect(ConventionalCommit.parse('feat(pkg-a): add feature').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.MAJOR);
      });

      it('given breaking: false when resolved then it only matches non-breaking commits', () => {
        const bumps: BumpMatchers = { major: [], minor: [{ type: 'feat', scope: '<package>', breaking: false }], patch: [] };

        expect(ConventionalCommit.parse('feat(pkg-a): add feature').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.MINOR);
        expect(ConventionalCommit.parse('feat(pkg-a)!: add feature').bumpMatch(bumps, 'pkg-a')).toBe(SemVerBumpType.NONE);
      });
    });
  });
});
