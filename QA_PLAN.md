# QA Plan – monorepo-semantic-release

## 1) Objective

Validate the release CLI's steps against functional correctness, sequencing integrity, and release safety for a pnpm-style monorepo.

## 2) Scope

- Workspace discovery and topological sorting (`report`)
- Conventional commit scope filtering and bump calculation
- Dependency synchronization across the package graph (`package-json`, `package-manager`)
- Changelog generation and commit grouping (`changelog`)
- Release commit, tags, and push (`vcs`)
- GitHub release creation (`release-notes`)
- `--dry-run` correctness and no side effects, on every step
- Template overrides (CLI flag, `package.json` config, `.release.json`) and their precedence
- Failure behavior: partial-pipeline failure leaves prior steps' artifacts in place

## 3) Entry Criteria

- Node version in the supported range (`>=20.11`, see `package.json` `engines`)
- pnpm installed and on `PATH`
- Clean baseline git state before each test case
- `pnpm install` completed

## 3.1) Execution entrypoint

The QA matrix below is fully automated as the e2e suite:

```bash
pnpm run test:e2e
```

This builds the CLI (`pnpm run build`, including copying `.hbs` templates into `dist/`) and runs every spec in `e2e/*.spec.ts` against a fresh temporary git repository per test, via `e2e/releaseFixture.ts`. There is no separate QA runner or report directory — vitest's own pass/fail output is the QA report.

## 4) Risks (Ranked)

1. Versioning logic mismatch (wrong bump)
2. Incorrect dependency propagation order
3. A step silently no-ops instead of doing its job (e.g. a flag swallowed by a sibling action's command parser)
4. Missing/invalid tags or final commit format
5. Changelog omissions or wrong section mapping
6. Side effects in `--dry-run`
7. A pipeline stopping mid-sequence (e.g. failed push) leaving inconsistent partial state
8. Config/template override precedence resolving incorrectly

## 5) Test Matrix

Each row is a real, automated spec in `e2e/`. Numbering has gaps (T01–T14 don't exist) because earlier test IDs were retired as the CLI moved from a single monolithic command to the current step model; new tests keep incrementing rather than backfilling.

| ID  | File                                                  | Validates                                                                            |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| T00 | `T00-release-workflow.spec.ts`                        | Full pipeline happy path: bump, tag, commit, push, publish                           |
| T15 | `T15-no-changes.spec.ts`                              | No release-triggering commits since last tag -> no version/tag change                |
| T16 | `T16-first-release-without-tags.spec.ts`              | First release when no `<package>@<version>` tag exists yet                           |
| T17 | `T17-private-package-excluded.spec.ts`                | `"private": true` packages are never released, even with matching commits            |
| T18 | `T18-missing-changelog-handled.spec.ts`               | `CHANGELOG.md` is created when absent                                                |
| T19 | `T19-lockfile-updates.spec.ts`                        | `pnpm-lock.yaml` is preserved/updated consistently through a release                 |
| T20 | `T20-dependency-exact-version.spec.ts`                | Internal dependency ranges are normalized to exact versions and trigger a bump       |
| T21 | `T21-scope-mismatch-no-release.spec.ts`               | A commit scoped to a different package doesn't release this one                      |
| T22 | `T22-merge-commits-ignored.spec.ts`                   | A non-conventional commit message doesn't trigger a bump                             |
| T23 | `T23-large-volume.spec.ts`                            | 25 commits in one release are processed without error                                |
| T24 | `T24-partial-failure-artifacts.spec.ts`               | With `push`/`publish` skipped, local version bump and tag still land                 |
| T25 | `T25-release-commit-message.spec.ts`                  | Multi-package release commit body format (headings, bullets, `Affected:` footer)     |
| T26 | `T26-changelog-links.spec.ts`                         | Changelog entries include a commit hash reference                                    |
| T27 | `T27-idempotent-rerun.spec.ts`                        | Re-running the pipeline with nothing new is a no-op (no duplicate tags/changelog)    |
| T28 | `T28-version-mapping.spec.ts`                         | `feat` -> minor, `fix` -> patch                                                      |
| T29 | `T29-failed-push.spec.ts`                             | A push failure stops the pipeline before `package-manager publish` runs              |
| T30 | `T30-template-overrides-cli.spec.ts`                  | `--template` overrides the release commit and changelog templates                    |
| T31 | `T31-template-overrides-config.spec.ts`               | `package.json`'s `release.<step>.template` overrides the default template            |
| T32 | `T32-template-override-precedence.spec.ts`            | `--template` wins over `package.json` config                                         |
| T33 | `T33-help-with-directory-workspaces.spec.ts`          | `--help` on a step prints usage and releases nothing                                 |
| T34 | `T34-packaged-default-templates.spec.ts`              | Bundled default templates are used when no override is configured                    |
| T35 | `T35-dry-run-no-side-effects.spec.ts`                 | `--dry-run` across the pipeline leaves the repo byte-identical                       |
| T36 | `T36-github-releases.spec.ts`                         | `release-notes` creates a GitHub Release; skipped on `--dry-run` or when not invoked |
| T37 | `T37-template-overrides-package-json-section.spec.ts` | `release.changelog.changelogName` writes to a non-default changelog file name        |
| T38 | `T38-template-overrides-config-file.spec.ts`          | `.release.json` overrides the same step's `package.json` config                      |
| T39 | `T39-dependency-block-preserved.spec.ts`              | A bump lands in the block it was declared in; the lockfile is refreshed after it     |

## 6) Execution procedure

1. Baseline validation: `pnpm run lint`, `pnpm test`, `pnpm run test:e2e`
2. All 26 files above run as part of `pnpm run test:e2e`; there's no separate per-test invocation
3. On failure, vitest's output already includes: the failing assertion, expected vs. actual, and the fixture's temp directory is left in place until the process exits (the fixture doesn't clean up on assertion failure mid-run within the same process)

## 7) Acceptance criteria

- All of T00, T20, T24, T25, T28, T29, T35, T39 pass (highest-risk: bump correctness, dependency propagation, manifest/lockfile consistency, partial-failure ordering, dry-run safety)
- No regressions in the rest of the matrix
- Any failure is reproducible from a clean checkout via `pnpm run test:e2e`
