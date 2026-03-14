# QA Plan – monorepo-semantic-release

## 1) Objective

Validate the release CLI against functional correctness, sequencing integrity, and release safety for a pnpm-style monorepo.

## 2) Scope

- Workspace discovery and topological sorting
- Conventional commit validation and scope filtering
- Version bump calculation (commit + dependency update precedence)
- Dependency synchronization across package graph
- Changelog generation and commit grouping
- Release orchestration (`pnpm version`, tags, commit, lockfile)
- `--dry-run` correctness and no side effects
- Failure behavior and error clarity

## 3) Entry Criteria

- Node version in supported range (`>=24.14.0 <25`)
- Clean baseline git state before each test case
- Test fixtures restored before each case
- `pnpm-lock.yaml`/package manifests are tracked and restorable

## 3.1) Execution entrypoint

- Run baseline checks:
  - `pnpm run qa:run`
- Optional one-shot command:
  - `pnpm run qa:smoke` (equivalent to baseline checks)
- The QA runner writes results to:
  - `qa/reports/qa-report-<timestamp>.json`
  - `qa/reports/qa-report-<timestamp>.md`

## 4) Risks (Ranked)

1. Versioning logic mismatch (wrong bump)
2. Incorrect dependency propagation order
3. Invalid commit acceptance causing bad releases
4. Missing/invalid tags or final commit format
5. Changelog omissions or wrong section mapping
6. Side effects in `--dry-run`
7. Missing lockfile or stale dependency versions

## 5) Test Matrix

## T01 – Workspace discovery and ordering

- **Type:** Functional / integration
- **Preconditions:** Fixture with one foundational package and 4 dependents (all valid)
- **Steps:**
  - Run `pnpm run build`
  - Run CLI in dry-run mode
- **Expected:**
  - Packages discovered only from root `workspaces`
  - Private package(s) excluded
  - Topological order is deterministic and dependencies appear before dependents
  - Graph output clearly lists internal dependencies
- **Pass criteria:** ordering and counts exactly match dependency graph

## T02 – Conventional commit validation (negative)

- **Type:** Validation
- **Preconditions:** Add a non-conventional commit in target range
- **Steps:**
  - Run CLI normally and in `--dry-run`
- **Expected:**
  - Process fails fast
  - Offending commit hash + message is shown
  - Error includes remediation hint
- **Pass criteria:** no release side effects

## T03 – Feature bump path

- **Type:** Per-package functional
- **Preconditions:** One scoped `feat(scope): ...` commit since tag
- **Steps:**
  - Run CLI
- **Expected:** scoped package bumps minor, release entry created, tag created, changelog contains Feature section
- **Pass criteria:** bump type `minor`, expected version, single package tag and changelog heading for release

## T04 – Patch bump path

- **Type:** Per-package functional
- **Preconditions:** One scoped `fix` or `perf` commit since tag
- **Expected:** `patch` bump when no other release driver
- **Pass criteria:** expected version + changelog has Bug Fixes/Performance as appropriate

## T05 – Breaking change path

- **Type:** Per-package + propagation
- **Preconditions:** commit with `feat(scope)!: ...` and `BREAKING CHANGE`
- **Steps:**
  - Run CLI
- **Expected:** scoped package is `major`; dependents may bump based on dep updates
- **Pass criteria:** `major` strictly takes precedence

## T06 – Dependency update triggers bump (no scoped commits)

- **Type:** Propagation
- **Preconditions:** dependency package is changed and released, dependent package has no scoped commits
- **Expected:** dependent package gets `minor` bump and dependency version exact update
- **Pass criteria:** dependent changelog includes dependency update entry

## T07 – Combined bump precedence

- **Type:** Bump matrix
- **Preconditions:** package has patch commit and updated dependency in same cycle
- **Expected:** resulting bump is `minor`
- **Pass criteria:** `aggregateChanges` behavior matches spec

## T08 – Multiple package release ordering

- **Type:** Release orchestration
- **Preconditions:** feature in foundation package; dependency changes should propagate to two or more packages
- **Expected:** sequential processing in dependency order, each package version/tag as expected
- **Pass criteria:** no order violations, one final release commit

## T09 – Non-release commit filtering

- **Type:** Filtering
- **Preconditions:** commits only from `docs/test/chore/style/ci/refactor` for a package
- **Expected:** no bump, no changelog section from these types
- **Pass criteria:** package may still bump only if dependency update is detected

## T10 – Changelog content and ordering

- **Type:** Content
- **Preconditions:** package has breaking + features + fix + perf scoped commits
- **Expected:** changelog prepends release entry with section order:
  1. BREAKING CHANGES
  2. Features
  3. Bug Fixes
  4. Performance Improvements
- **Pass criteria:** headings, links, and append/prepend behavior are correct and cumulative

## T11 – Release commit and tags integrity

- **Type:** Git output contract
- **Preconditions:** at least two packages released
- **Expected:**
  - One final commit: `ci: release [skip-ci]`
  - One tag per released package: `<name>@<version>`
  - Release message lists grouped package entries
- **Pass criteria:** exact one-commit finalization, tags created for every released package

## T12 – Lockfile update

- **Type:** Integration
- **Preconditions:** successful release with updates
- **Expected:** `pnpm-lock.yaml` updated
- **Pass criteria:** lockfile changes consistent with package `version`/dependency changes

## T13 – Dry-run safety

- **Type:** Safety
- **Preconditions:** any scenario that would normally release
- **Expected:** no file mutations, no git commit, no tags, no push
- **Pass criteria:** working tree unchanged after run

## T14 – Invalid workspace/dependency failure

- **Type:** Robustness
- **Preconditions:** malformed `workspaces` or cyclic dependency introduced
- **Expected:** explicit failure with non-zero exit and clear message
- **Pass criteria:** no partial release artifacts

## 6) Execution procedure

1. Baseline validation: `pnpm run lint`, `pnpm test`, `pnpm run test:e2e`
2. Run T01–T14 in order per fixture release branch
3. For each test, capture:
   - command used
   - expected output snippet
   - observed output
   - final repo state (tags, versions, changelog, lockfile)

## 7) Acceptance criteria

- All high-risk tests (T02, T03, T05, T06, T07, T08, T09, T11, T13) pass
- No critical defects in sequencing or versioning
- Any failure includes reproducible fixture state + clear ownership and priority

## 8) Suggested test artifacts

- Keep a `fixtures/` folder with at least:
  - `baseline-empty-no-release`
  - `single-feature`
  - `breaking-change`
  - `dep-cascade`
  - `invalid-commit`
  - `invalid-workspace`
- Record each run in `QA_REPORT.md` with date, branch, hash, and verdict
