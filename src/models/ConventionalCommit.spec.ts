import { describe, it, expect } from "vitest";
import { ConventionalCommit } from "./ConventionalCommit";
import { SemVerBumpType } from "./SemVerBumpType";

describe("ConventionalCommit", () => {
  describe("parse", () => {
    it("should parse feat commit with scope", () => {
      const commit = ConventionalCommit.parse("feat(my-pkg): add feature", "abc123");
      expect(commit.type).toBe("feat");
      expect(commit.scope).toBe("my-pkg");
      expect(commit.subject).toBe("add feature");
      expect(commit.isBreaking).toBe(false);
    });

    it("should parse fix commit without scope", () => {
      const commit = ConventionalCommit.parse("fix: resolve crash", "abc123");
      expect(commit.type).toBe("fix");
      expect(commit.scope).toBeNull();
      expect(commit.subject).toBe("resolve crash");
    });

    it("should parse breaking change with bang", () => {
      const commit = ConventionalCommit.parse("feat(my-pkg)!: breaking change", "abc123");
      expect(commit.isBreaking).toBe(true);
    });

    it("should return unknown type for non-conventional commit", () => {
      const commit = ConventionalCommit.parse("random message", "abc123");
      expect(commit.type).toBe("unknown");
      expect(commit.subject).toBe("random message");
    });
  });

  describe("bumpType", () => {
    it("should return MAJOR for breaking change", () => {
      const commit = ConventionalCommit.parse("feat(pkg)!: breaking", "abc");
      expect(commit.bumpType).toBe(SemVerBumpType.MAJOR);
    });

    it("should return MINOR for feat", () => {
      const commit = ConventionalCommit.parse("feat(pkg): feature", "abc");
      expect(commit.bumpType).toBe(SemVerBumpType.MINOR);
    });

    it("should return PATCH for fix", () => {
      const commit = ConventionalCommit.parse("fix(pkg): bugfix", "abc");
      expect(commit.bumpType).toBe(SemVerBumpType.PATCH);
    });

    it("should return PATCH for perf", () => {
      const commit = ConventionalCommit.parse("perf(pkg): optimize", "abc");
      expect(commit.bumpType).toBe(SemVerBumpType.PATCH);
    });

    it("should return NONE for docs", () => {
      const commit = ConventionalCommit.parse("docs(pkg): update docs", "abc");
      expect(commit.bumpType).toBe(SemVerBumpType.NONE);
    });
  });

  describe("isReleaseTrigger", () => {
    it("should return true for feat", () => {
      const commit = ConventionalCommit.parse("feat(pkg): feature", "abc");
      expect(commit.isReleaseTrigger()).toBe(true);
    });

    it("should return false for chore", () => {
      const commit = ConventionalCommit.parse("chore(pkg): cleanup", "abc");
      expect(commit.isReleaseTrigger()).toBe(false);
    });
  });

  describe("matchesScope", () => {
    it("should match when scope equals package name", () => {
      const commit = ConventionalCommit.parse("feat(my-pkg): feature", "abc");
      expect(commit.matchesScope("my-pkg")).toBe(true);
    });

    it("should not match different scope", () => {
      const commit = ConventionalCommit.parse("feat(other-pkg): feature", "abc");
      expect(commit.matchesScope("my-pkg")).toBe(false);
    });
  });
});
