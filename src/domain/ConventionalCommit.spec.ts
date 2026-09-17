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
});
