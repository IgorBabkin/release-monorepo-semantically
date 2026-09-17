import { describe, it, expect } from 'vitest';
import { ConventionalCommit } from './ConventionalCommit.js';

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

  describe('matchesAny', () => {
    it('given a matcher with scope "<package>" when the commit is scoped to that package then it matches', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a): add feature');
      expect(commit.matchesAny([{ type: 'feat', scope: '<package>' }], 'pkg-a')).toBe(true);
    });

    it('given a matcher with scope "<package>" when the commit is scoped to a different package then it does not match', () => {
      const commit = ConventionalCommit.parse('feat(pkg-b): add feature');
      expect(commit.matchesAny([{ type: 'feat', scope: '<package>' }], 'pkg-a')).toBe(false);
    });

    it('given a matcher with breaking: true when the commit is breaking then it matches regardless of type', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a)!: breaking');
      expect(commit.matchesAny([{ breaking: true }], 'pkg-a')).toBe(true);
    });

    it('given a matcher with breaking: false when the commit is breaking then it does not match', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a)!: breaking');
      expect(commit.matchesAny([{ type: 'feat', scope: '<package>', breaking: false }], 'pkg-a')).toBe(false);
    });

    it('given a matcher with a literal scope and packages "*" when the commit matches that scope then every package matches', () => {
      const commit = ConventionalCommit.parse('docs(specs): note');
      const matcher = [{ type: 'docs', scope: 'specs', packages: '*' as const }];

      expect(commit.matchesAny(matcher, 'pkg-a')).toBe(true);
      expect(commit.matchesAny(matcher, 'pkg-b')).toBe(true);
    });

    it('given a matcher with a literal scope and an explicit packages list when the commit matches that scope then only listed packages match', () => {
      const commit = ConventionalCommit.parse('docs(specs): note');
      const matcher = [{ type: 'docs', scope: 'specs', packages: ['pkg-a'] }];

      expect(commit.matchesAny(matcher, 'pkg-a')).toBe(true);
      expect(commit.matchesAny(matcher, 'pkg-b')).toBe(false);
    });

    it('given a matcher with a literal scope and no packages field when resolved then it falls back to scope-equals-package', () => {
      const matcher = [{ type: 'docs', scope: 'specs' }];

      expect(ConventionalCommit.parse('docs(specs): note').matchesAny(matcher, 'specs')).toBe(true);
      expect(ConventionalCommit.parse('docs(other): note').matchesAny(matcher, 'specs')).toBe(false);
    });

    it('given no matcher matches when resolved then it returns false', () => {
      const commit = ConventionalCommit.parse('ci(github): upgrade action');
      expect(commit.matchesAny([{ type: 'docs' }], 'pkg-a')).toBe(false);
    });

    it('given an empty matcher list when resolved then it returns false', () => {
      const commit = ConventionalCommit.parse('feat(pkg-a): add feature');
      expect(commit.matchesAny([], 'pkg-a')).toBe(false);
    });
  });
});
