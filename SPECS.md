# Release CLI Script Specification (for pnpm monorepo only)

## Overview

Use **_handlebars_** for generation of commit message and changelog

Automated release management CLI for the monorepo. Analyzes conventional commits, determines semantic version bumps per package, generates changelogs, updates package versions, and creates release commits with tags.

## Goals

1. Calculate version of based on commits (each package)
2. Bump version (each package)
3. Sync dependant packages
4. Generate changelog (each package)
5. Create release commit
6. Create git tag (each package)

## Commit Convention Requirements

**CRITICAL RULE:** All commits in the repository MUST follow the Conventional Commits specification.

### Requirements

1. **All commits created by the release CLI** - MUST be conventional commits
2. **All commits read from git history** - MUST be conventional commits
3. **All developer commits** - MUST be conventional commits

### Conventional Commit Format

[Specification](https://www.conventionalcommits.org/en/v1.0.0/#specification)

**Pattern:**

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Examples:**

```
feat(ts-ioc-container): add lazy provider support
fix(@ts-ioc-container/react): resolve context hook issue
perf(@ts-ioc-container/express): optimize middleware chain
docs(ts-ioc-container): update README examples
test(@ts-ioc-container/solidjs): add integration tests
ci: release
chore: update dependencies
```

### Enforcement

**Current behavior:** `report` does not validate commit format. A commit that doesn't parse as `<type>(<scope>): <subject>` is treated as `type: "unknown"` with no bump (equivalent to a non-release type like `chore`) and is silently excluded from the release — it neither triggers a bump nor fails the run. Enforcing conventional commit format (e.g. via commitlint in a commit-msg hook) is left to the consuming repository; `report` only classifies what it finds.

## CLI Interface

There is no single release command. The tool is a set of independent steps — `report`, `package-json`, `package-manager`, `changelog`, `vcs`, `release-notes` — invoked as `monorepo-semantic-release <controller> [action] [--flags...]`. `report` reads the repository and computes what should release; every other step receives that result via `--context <json>` and does one job. The caller (a CI pipeline, or a local shell loop) decides which steps to run, in what order, and whether to run them at all — the tool does not orchestrate a multi-step release itself. See [CI Integration User Story](#ci-integration-user-story) below for the canonical sequence, and `README.md` for the full command reference.

### Usage

```bash
RELEASE_CONTEXT=$(monorepo-semantic-release report)

monorepo-semantic-release package-json    --context "$RELEASE_CONTEXT"
monorepo-semantic-release package-manager --context "$RELEASE_CONTEXT"
monorepo-semantic-release changelog       --context "$RELEASE_CONTEXT"
monorepo-semantic-release vcs             --context "$RELEASE_CONTEXT"
```

### CLI Options

**`--dry-run`** (optional, every step)

- Previews that one step's effect without making any changes
- No file modifications, no git commits, no git tags, no pushes, no publishes for that invocation
- Safe to run repeatedly for planning and verification; chain it onto every step in the pipeline to preview the whole release

**`--context <json>`** (required on every step except `report`)

- The JSON `report` wrote to stdout: released packages, their new versions, and the commits that triggered each bump

There is no `--no-push`/`--no-publish` equivalent: a pipeline that wants to skip pushing or publishing simply doesn't invoke `vcs push` (or invokes `vcs commit`/`vcs tag` instead of bare `vcs`) or `package-manager publish`.

## Workflow

### High-Level Flow

```
1. `report`
   ├─ Discover workspace packages from package.json → workspaces
   ├─ Build dependency graph (internal dependencies)
   ├─ Sort topologically (dependencies first)
   ├─ For each package in sorted order:
   │  ├─ Filter commits since its last release tag by scope
   │  ├─ Check for outdated internal dependencies
   │  ├─ Calculate version bump (commits + dependency updates)
   │  └─ Track released version for the next package's dependency check
   └─ Write { releasedVersions, releasedPackages, releasedCommits } as JSON to stdout
  ↓
2. `package-json --context <json>`     — update internal dependency versions in package.json
  ↓
3. `package-manager --context <json>`  — run pnpm version <newVersion> per released package
  ↓
4. `changelog --context <json>`        — generate & prepend CHANGELOG.md per released package
  ↓
5. `vcs --context <json>`              — stage everything, one release commit, one tag per package, push
  ↓
6. `package-manager publish --context <json>`  — publish bumped packages (optional)
  ↓
7. `release-notes --context <json>`            — create GitHub Releases (optional)
```

Each step after `report` is its own process invocation and reads the same `--context`; nothing is shared between steps except that JSON blob. A pipeline can stop after any step, skip a step entirely, or re-run one in isolation (e.g. `vcs push` again after a failed push, without recomputing `report` or redoing the commit).

### Sequential Processing (IMPORTANT)

Packages **MUST** be processed sequentially (not in parallel) because:

1. Later packages may depend on earlier packages
2. Dependency version updates need to happen in order
3. ONLY one result commit must be created

**Example:**

```
1. Release ts-ioc-container@2.1.0 first
   ↓
2. Then release @ts-ioc-container/react@1.6.0
   - Detects ts-ioc-container was updated (2.0.5 → 2.1.0)
   - Updates dependency in package.json
   - Triggers MINOR bump due to dependency update
```

### Domain terms

- NpmPackage
- Monorepo / Workspace
- SemVerType (minor, major, patch)
- SemanticCommit
- Changelog
- Release

### Phase 1: Discovery & Analysis

#### 1.1 Discover Packages from Workspaces

**IMPORTANT:** Package list is derived from root `package.json` → `workspaces` field.

**Example Output:**

```typescript
[
  { name: 'ts-ioc-container', path: 'packages/ts-ioc-container', version: '2.0.5', private: false },
  { name: '@ts-ioc-container/react', path: 'packages/react', version: '1.5.1', private: false },
  { name: '@ts-ioc-container/solidjs', path: 'packages/solidjs', version: '1.0.0', private: false },
  { name: '@ts-ioc-container/express', path: 'packages/express', version: '1.2.0', private: false },
  { name: '@ts-ioc-container/fastify', path: 'packages/fastify', version: '1.1.0', private: false },
];
// Note: 'docs' is excluded because it has "private": true
```

#### 1.2 Build Dependency Graph

**IMPORTANT:** Analyze internal monorepo dependencies and build dependency graph for topological sorting.

#### 1.3 Topological Sort

**IMPORTANT:** Sort packages by dependency order - packages without internal dependencies first.

**Example Output (sorted):**

```typescript
[
  // 1. Packages with no internal dependencies (foundations)
  { name: 'ts-ioc-container', dependencies: [] },

  // 2. Packages depending on foundations
  { name: '@ts-ioc-container/react', dependencies: ['ts-ioc-container'] },
  { name: '@ts-ioc-container/solidjs', dependencies: ['ts-ioc-container'] },
  { name: '@ts-ioc-container/express', dependencies: ['ts-ioc-container'] },
  { name: '@ts-ioc-container/fastify', dependencies: ['ts-ioc-container'] },
];
```

#### 1.4 Detect Changed Packages

For each workspace package, determine if it has changes since last release:

**Input:**

- Git history since last package-specific tag (e.g., `ts-ioc-container@1.2.3`)
- OR since last release commit if no tags exist
- OR all commits if never released

**Commit Scope Mapping:**

- `ts-ioc-container` → `packages/ts-ioc-container/`
- `@ts-ioc-container/react` → `packages/react/`
- `@ts-ioc-container/solidjs` → `packages/solidjs/`
- `@ts-ioc-container/express` → `packages/express/`
- `@ts-ioc-container/fastify` → `packages/fastify/`

#### 1.2 Parse Conventional Commits

**Conventional Commit Format:**

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Parsed Structure:**

```typescript
interface ConventionalCommit {
  hash: string;
  type: string; // feat, fix, perf, docs, test, ci, chore, refactor, style
  scope: string; // Package scope
  subject: string;
  body: string | null;
  footer: Record<string, string>; // BREAKING CHANGE, etc.
  isBreaking: boolean; // true if footer contains BREAKING CHANGE
  authorName: string;
  authorEmail: string;
  date: Date;
}
```

**Breaking Change Detection:**

- Footer contains `BREAKING CHANGE:`
- OR commit message contains `!` after scope: `feat(scope)!: message`

### Phase 2: Version Calculation

#### 2.1 Check for Outdated Dependencies

**IMPORTANT:** Before calculating version bump, check if package has outdated internal dependencies.

**Important Note on Version Format:**

- Internal dependencies **MUST use exact versions** (not wildcards)
- ✅ Correct: `"ts-ioc-container": "2.0.5"`
- ✅ Also correct: `"ts-ioc-container": "workspace:*"` — see below
- ❌ Incorrect: `"ts-ioc-container": "^2.0.5"`
- This ensures precise dependency tracking and update detection

**The `workspace:` protocol.** A specifier such as `workspace:*` or
`workspace:^1.0.0` always resolves to the copy in this workspace, so it is
never stale and is **never rewritten**. It still counts as an internal
dependency for bump detection, so a dependent declaring one is released
alongside the dependency it tracks; only the manifest rewrite is skipped.
`pnpm publish` substitutes the real version into the published tarball, so
consumers still receive an exact version.

Rewriting such a specifier would be actively harmful: it replaces a local link
with a version that is only published at the _end_ of the release, leaving the
lockfile refresh below (§4.3) nothing to resolve, and the release deadlocks —
the refresh needs the version published, and publishing needs the refresh to
pass.

#### 2.2 Determine Version Bump

For each package, calculate the next version using semantic versioning rules based on **scoped commits** and **dependency updates**.

**Version Bump Priority (highest to lowest):**

1. **MAJOR** - Breaking changes (commits with `!` or `BREAKING CHANGE` footer)
2. **MINOR** - New features (`feat`) OR internal dependency updates
3. **PATCH** - Bug fixes (`fix`) or performance improvements (`perf`)
4. **NONE** - Non-release commits (docs, tests, chores, refactors, style)

**Combination Rules:**

When combining commits and dependency updates, the **highest priority** bump type wins.

The final bump type is calculated by aggregating individual bump types using `aggregateChanges()`:

```typescript
// SemVerBumpType is a numeric enum: NONE=0, PATCH=1, MINOR=2, MAJOR=3
// aggregateChanges returns the maximum (highest priority) bump type
aggregateChanges(...changes: SemVerBumpType[]) = Math.max(SemVerBumpType.NONE, ...changes)
```

Each change source produces its own bump type independently:

- **Commits**: `MAJOR` (breaking) / `MINOR` (feat) / `PATCH` (fix/perf) / `NONE` (other)
- **Dependency updates**: `MINOR` if any exist, `NONE` otherwise

These are then aggregated — the highest value wins:

| Commits                | Dependency Update | Result    | Reason              |
| ---------------------- | ----------------- | --------- | ------------------- |
| Breaking change        | Yes               | **MAJOR** | `max(3, 2) = MAJOR` |
| Breaking change        | No                | **MAJOR** | `max(3, 0) = MAJOR` |
| Feature                | Yes               | **MINOR** | `max(2, 2) = MINOR` |
| Feature                | No                | **MINOR** | `max(2, 0) = MINOR` |
| Patch (fix/perf)       | Yes               | **MINOR** | `max(1, 2) = MINOR` |
| Patch (fix/perf)       | No                | **PATCH** | `max(1, 0) = PATCH` |
| None (docs/test/chore) | Yes               | **MINOR** | `max(0, 2) = MINOR` |
| None (docs/test/chore) | No                | **NONE**  | `max(0, 0) = NONE`  |

**Examples:**

```typescript
// Example 1: Breaking change + dependency update → MAJOR
// Commits: [{ type: 'feat', isBreaking: true }]
// Dependency updates: ['ts-ioc-container: 2.0.0 → 3.0.0']
// Result: MAJOR (breaking change wins)

// Example 2: Patch + dependency update → MINOR
// Commits: [{ type: 'fix', subject: 'bug fix' }]
// Dependency updates: ['ts-ioc-container: 2.0.0 → 2.1.0']
// Result: MINOR (dependency update has higher priority)

// Example 3: Patch only → PATCH
// Commits: [{ type: 'fix', subject: 'bug fix' }]
// Dependency updates: []
// Result: PATCH (standard patch bump)

// Example 4: No commits + dependency update → MINOR
// Commits: []
// Dependency updates: ['ts-ioc-container: 2.0.0 → 2.1.0']
// Result: MINOR (dependency update alone triggers minor)
```

**Key Rules:**

- ✅ Dependency updates trigger a **MINOR** version bump, even if there are no code changes in the package
- ✅ Dependency updates have **higher priority than patches** but **lower priority than breaking changes**
- ✅ Only **scoped commits** (matching the package name) are considered for version calculation
- ✅ Breaking changes **always** trigger MAJOR, regardless of dependency updates

**Release-triggering commit types:**

- `feat` → Minor bump
- `fix` → Patch bump
- `perf` → Patch bump
- `BREAKING CHANGE` or `!` → Major bump
- Dependency update → Minor bump

**Non-release commit types (filtered out):**

- `docs` → No release
- `test` → No release
- `ci` → No release
- `chore` → No release
- `refactor` → No release
- `style` → No release

#### 2.4 Update Package Dependencies

After calculating version bump, update `package.json` dependencies to new versions:

### Phase 3: Changelog Generation

#### 3.1 Changelog Format

Each package maintains its own `CHANGELOG.md` at the package root.

**Template:**
Use handlebars

**Structure:**

```markdown
# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.1.0](https://github.com/IgorBabkin/ts-ioc-container/compare/ts-ioc-container@2.0.5...ts-ioc-container@2.1.0) (2026-02-03)

### BREAKING CHANGES

- **core:** removed deprecated Container.bind() method ([a1b2c3d](https://github.com/IgorBabkin/ts-ioc-container/commit/a1b2c3d))

### Features

- **provider:** add new provider type for lazy initialization ([b2c3d4e](https://github.com/IgorBabkin/ts-ioc-container/commit/b2c3d4e))
- **factory:** support async factory functions ([c3d4e5f](https://github.com/IgorBabkin/ts-ioc-container/commit/c3d4e5f))

### Bug Fixes

- **singleton:** memory leak in singleton provider ([d4e5f6a](https://github.com/IgorBabkin/ts-ioc-container/commit/d4e5f6a))

# [2.0.5](https://github.com/IgorBabkin/ts-ioc-container/compare/ts-ioc-container@2.0.4...ts-ioc-container@2.0.5) (2026-01-15)

...
```

**Key Features:**

- Each version is a level 1 heading (`#`) with GitHub compare link
- Includes commit links to GitHub
- Section order: BREAKING CHANGES → Features → Bug Fixes → Performance Improvements
- Changelog is **cumulative** (new releases prepended to existing content)

#### 3.2 Changelog Section Mapping

**Section Order:**

1. **BREAKING CHANGES** (if any) - always first
2. **Features** (`feat` commits)
3. **Bug Fixes** (`fix` commits)
4. **Performance Improvements** (`perf` commits)

**Note:** Non-release commits (`docs`, `test`, `ci`, `chore`, `refactor`, `style`) are NOT included in changelog.

#### 3.4 Changelog Template

Uses Handlebars template from `scripts/templates/changelog.hbs`:

**Example CHANGELOG entry with dependency update:**

```markdown
# [1.6.0](https://github.com/IgorBabkin/ts-ioc-container/compare/@ts-ioc-container/react@1.5.1...@ts-ioc-container/react@1.6.0) (2026-02-03)

### Features

- **deps:** update ts-ioc-container to 2.1.0
```

#### 3.5 Changelog Update

**IMPORTANT:** Changelog is **cumulative** - new releases are prepended, keeping all previous releases.

### Phase 4: Version Updates

Handled by the `package-json` step (dependency versions) and the `package-manager` step (the version bump itself).

#### 4.1 Update package.json using pnpm version

**IMPORTANT:** Use `pnpm version` command to bump versions (not manual JSON editing).

**Why `pnpm version`?**

- Validates semantic version format
- Runs `preversion`, `version`, and `postversion` scripts from package.json
- Updates package.json atomically
- Standard pnpm behavior (more reliable than manual JSON editing)

#### 4.2 Update internal dependency versions

An internal dependency is bumped **in the block it was declared in**:
a `devDependencies` entry is rewritten as a `devDependencies` entry, a
`dependencies` entry as a `dependencies` entry, and a dependency declared in
both is refreshed in both.

**IMPORTANT:** The step never creates a block a package did not already have.
Writing every bump into `dependencies` turns a dev-only dependency into a
runtime one and ships consumers a duplicate copy of a package they already
resolve themselves.

`peerDependencies` is never rewritten. A peer range (`>=56`) states which
versions a consumer may pair the package with; pinning it to the version just
released would be wrong.

#### 4.3 Update pnpm-lock.yaml

Rewriting a manifest changes a specifier the lockfile has recorded, so after
the manifests are written the `package-json` step regenerates the lockfile:

```bash
pnpm install --lockfile-only --ignore-scripts
```

Resolution only — a release step runs against an already-installed workspace
and must not touch `node_modules`. The refreshed lockfile is picked up by
`vcs commit` along with the manifests, so the committed tree installs cleanly;
without it every later `pnpm install --frozen-lockfile` fails with
`ERR_PNPM_OUTDATED_LOCKFILE`, on release branches and feature branches alike.

The refresh is skipped when nothing was rewritten, when the workspace has no
lockfile, and under `--dry-run`. A package whose internal dependencies are all
declared with the `workspace:` protocol rewrites nothing, so it never triggers
a refresh.

### Phase 5: Git Operations

Handled by the `vcs` step (`commit`, `tag`, and `push` actions, run in that order by the default action).

#### 5.1 Create Release Commits

**IMPORTANT:** Create **one commit per all package**, staged and created by `vcs commit`.

**Commit Message Format** (from `src/features/vcs/release-commit-msg.hbs`):

```
ci(release): publish [skip-ci]

## 📦 package1@version

- 🔹 type[!]: subject
- 🔹 type[!]: subject

## 📦 package2@version

- 🔹 type[!]: subject

Affected: 📌 package1@version,package2@version
```

**Example:**

```
ci(release): publish [skip-ci]

## 📦 ts-ioc-container@2.1.0

- 🔹 feat: add new provider type
- 🔹 feat: support async factory functions
- 🔹 fix: memory leak in singleton provider

## 📦 @ts-ioc-container/react@1.6.0

- 🔹 fix: resolve context hook issue

Affected: 📌 ts-ioc-container@2.1.0,@ts-ioc-container/react@1.6.0
```

#### 5.2 Create Git Tags

Create a tag for each released package:

**Tag Format:** `<package-name>@<version>`

**Examples:**

- `ts-ioc-container@2.1.0`
- `@ts-ioc-container/react@1.5.2`

If a tag with the target name already exists in the repository, skip creating it rather than raising an error (idempotent — safe to re-run after a partial/failed release).

## Output Format

Every step logs one line per action, tagged with its own name (`[report]`, `[vcs]`, ...), to **stderr**. `report` writes nothing else to stderr; its **stdout** carries only the serialized JSON context, so it can be captured directly (`RELEASE_CONTEXT=$(monorepo-semantic-release report)`) without stripping log lines out of it first. `--dry-run` prefixes each skipped action with `SKIP` and appends `(dry-run)`; every other step still emits its normal log lines, just without the side effect.

### Console Output (actual run, stderr)

```
[report] 🚀 BUMP     ts-ioc-container 2.0.5 -> 2.1.0 (minor)
[report] 🚀 BUMP     @ts-ioc-container/react 1.5.1 -> 1.6.0 (minor)
[package-manager] 🚀 BUMP     ts-ioc-container@2.1.0
[package-manager] 🚀 BUMP     @ts-ioc-container/react@1.6.0
[changelog] 📝 WRITE    ts-ioc-container CHANGELOG.md
[changelog] 📝 WRITE    @ts-ioc-container/react CHANGELOG.md
[vcs] 📦 COMMIT   release commit created
[vcs] 🏷️ TAG      ts-ioc-container@2.1.0
[vcs] 🏷️ TAG      @ts-ioc-container/react@1.6.0
[vcs] PUSH     HEAD and 2 tag(s)
[package-manager] PUBLISH  ts-ioc-container@2.1.0
[package-manager] PUBLISH  @ts-ioc-container/react@1.6.0
```

### Console Output (`--dry-run`, stderr)

```
[report] 🚀 BUMP     ts-ioc-container 2.0.5 -> 2.1.0 (minor)
[package-manager] ⚠ SKIP     BUMP     ts-ioc-container@2.1.0 (dry-run)
[changelog] ⚠ SKIP     WRITE    ts-ioc-container CHANGELOG.md (dry-run)
[vcs] ⚠ SKIP     COMMIT (dry-run)
ci(release): publish [skip-ci]
...
[vcs] ⚠ SKIP     TAG      ts-ioc-container@2.1.0 (dry-run)
[vcs] ⚠ SKIP     PUSH     HEAD and 1 tag(s) (dry-run)
```

## Error Handling

The CLI is designed to run in CI environments where the repository state is controlled. `report` performs one pre-flight check — the working tree must be clean — before computing anything; every other step fails naturally when the underlying command it wraps fails.

**Error Behavior:**

If a step fails:

- A recognized failure (see below) prints `[CODE] message` to stderr via the domain exception it raised
- An unrecognized failure prints the raw error
- The process exits with a non-zero status code
- Nothing about the working directory is rolled back — whatever that step had already done (e.g. `vcs`'s commit and tag actions, before its push action fails) stays in place for inspection

**Common Errors:**

- **`DIRTY_WORKING_TREE`**: `report` refuses to run against an unclean working tree
- **`MISSING_GITHUB_CREDENTIALS`**: `release-notes` has no repository/token from config or `GITHUB_REPOSITORY`/`GITHUB_TOKEN`
- **`GITHUB_CLI_UNAVAILABLE`**: `release-notes` needs `gh` on `PATH`
- **`INVALID_CONFIG`**: `package.json`'s `release` section or `.release.json` failed to parse, or failed a step's config schema
- **Missing/invalid `package.json` or `workspaces`**: thrown when `report` reads the repository
- **Git errors**: git commands fail with their own stderr output (e.g. push rejected, no configured remote)
- **`pnpm version`/`pnpm publish` errors**: pnpm fails if the version already exists or is invalid
- **Template errors**: Handlebars fails if a `--template` path is missing or invalid

## CI Integration User Story

**As a CI pipeline**, I want to run the release process as a sequence of discrete, independently-invocable steps so that each feature/controller can be controlled, skipped, or extended without modifying the core tool.

### Flow

```
Step 1 — Generate release report
  monorepo-semantic-release report
  └─ Analyzes commits, calculates version bumps, builds release context
  └─ Serializes result to JSON and writes it to RELEASE_CONTEXT env var

Step 2 — Run each feature/controller in order, passing the context

  monorepo-semantic-release package-json --context "$RELEASE_CONTEXT"
  └─ Updates internal dependency versions in each package.json

  monorepo-semantic-release package-manager --context "$RELEASE_CONTEXT"
  └─ Bumps package versions via pnpm version

  monorepo-semantic-release changelog --context "$RELEASE_CONTEXT"
  └─ Generates and prepends changelog entries

  monorepo-semantic-release vcs --context "$RELEASE_CONTEXT"
  └─ Stages files, creates release commit, creates git tags, pushes

  monorepo-semantic-release package-manager publish --context "$RELEASE_CONTEXT"
  └─ Publishes bumped packages to npm

  monorepo-semantic-release release-notes --context "$RELEASE_CONTEXT"
  └─ Creates GitHub release entries via gh CLI
```

### Example GitHub Actions Workflow

```yaml
- name: Generate release context
  run: |
    RELEASE_CONTEXT=$(monorepo-semantic-release report)
    echo "RELEASE_CONTEXT=$RELEASE_CONTEXT" >> $GITHUB_ENV

- name: Update package.json dependencies
  run: monorepo-semantic-release package-json --context "$RELEASE_CONTEXT"

- name: Bump versions
  run: monorepo-semantic-release package-manager --context "$RELEASE_CONTEXT"

- name: Generate changelogs
  run: monorepo-semantic-release changelog --context "$RELEASE_CONTEXT"

- name: Commit, tag and push
  run: monorepo-semantic-release vcs --context "$RELEASE_CONTEXT"

- name: Publish to npm
  run: monorepo-semantic-release package-manager publish --context "$RELEASE_CONTEXT"

- name: Create GitHub releases
  run: monorepo-semantic-release release-notes --context "$RELEASE_CONTEXT"
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Key Properties

- **Report step is read-only** — it never modifies files, commits, or pushes; its only precondition is a clean working tree, so it's safe to run speculatively otherwise
- **Each controller is idempotent in isolation** — it receives the full context and performs only its own concern
- **Context is the contract** — the JSON blob passed via `--context` is the sole input to each controller; no shared mutable state between steps
- **Steps can be skipped or reordered** — the CI pipeline owns orchestration; the tool provides building blocks

---

## Use Cases

### Use Case 1: Simple Feature Release

**Scenario:** Developer adds a new feature to core library

**Setup:**

- Monorepo with `ts-ioc-container` (core) and `@ts-ioc-container/react` (depends on core)
- Developer commits: `feat(ts-ioc-container): add lazy provider support`

**Execution:** the standard pipeline (see [CI Integration User Story](#ci-integration-user-story))

**Expected Behavior:**

1. ✓ Detects 1 feat commit in `ts-ioc-container`
2. ✓ Calculates MINOR bump: 2.0.5 → 2.1.0
3. ✓ No changes in `@ts-ioc-container/react` (skipped)
4. ✓ Generates changelog with feature description
5. ✓ Creates tag: `ts-ioc-container@2.1.0`

**Result:**

- Only `ts-ioc-container` released
- Dependent packages unchanged (they use exact version 2.0.5)

---

### Use Case 2: Cascading Dependency Updates

**Scenario:** Core library updated, triggers updates in dependent packages

**Setup:**

- `ts-ioc-container@2.0.5` → released as `2.1.0` (new feature)
- `@ts-ioc-container/react@1.5.1` depends on `ts-ioc-container@2.0.5`
- `@ts-ioc-container/solidjs@1.0.0` depends on `ts-ioc-container@2.0.5`

**Execution:** the standard pipeline (see [CI Integration User Story](#ci-integration-user-story))

**Expected Behavior:**

1. ✓ Release `ts-ioc-container@2.1.0` first
2. ✓ Detect `@ts-ioc-container/react` has outdated dependency
3. ✓ Update package.json: `"ts-ioc-container": "2.1.0"`
4. ✓ Calculate MINOR bump for dependency update: 1.5.1 → 1.6.0
5. ✓ Same for `@ts-ioc-container/solidjs`: 1.0.0 → 1.1.0
6. ✓ Generate changelogs with "update ts-ioc-container to 2.1.0"

**Result:**

- 3 packages released in dependency order
- Dependency versions synchronized
- Each package has updated changelog

---

### Use Case 3: Breaking Change Propagation

**Scenario:** Core library has breaking change

**Setup:**

- Developer commits: `feat(ts-ioc-container)!: remove deprecated Container.bind()`
- Commit body includes: `BREAKING CHANGE: Container.bind() removed. Use Container.addRegistration()`

**Execution:** the standard pipeline with `--dry-run` on each step (see [Use Case 5](#use-case-5-dry-run-mode))

**Expected Behavior:**

1. ✓ Detects breaking change in `ts-ioc-container`
2. ✓ Calculates MAJOR bump: 2.0.5 → 3.0.0
3. ✓ Dependent packages get MINOR bump (dependency update): 1.5.1 → 1.6.0
4. ✓ Changelog includes BREAKING CHANGES section with details

**Result:**

- Core library: MAJOR version bump
- Dependent packages: MINOR version bump (just dependency update)
- Clear breaking change documentation

---

### Use Case 4: Multiple Package Changes (Same Cycle)

**Scenario:** Developer made changes to multiple packages

**Setup:**

```
Commits:
- feat(ts-ioc-container): add feature A
- fix(@ts-ioc-container/react): fix bug B
- perf(@ts-ioc-container/express): improve performance C
```

**Execution:** the standard pipeline (see [CI Integration User Story](#ci-integration-user-story))

**Expected Behavior:**

1. ✓ Process in dependency order (core first)
2. ✓ `ts-ioc-container`: 2.0.5 → 2.1.0 (feat)
3. ✓ `@ts-ioc-container/react`: 1.5.1 → 1.6.0 (fix + dependency update = minor)
4. ✓ `@ts-ioc-container/express`: 2.0.0 → 2.1.0 (perf + dependency update = minor)

**Result:**

- Multiple packages released correctly
- Dependency updates handled automatically
- All changelogs generated

---

### Use Case 5: Dry-Run Mode

**Scenario:** Developer wants to preview release without making changes

**Setup:**

- Multiple packages with various changes
- Want to verify version bumps and changelog before actual release
- Need to plan release communication

**Execution:**

Add `--dry-run` to every step in the pipeline; `report` itself always computes the real bumps (there's nothing to preview differently), so the flag on it only exists for symmetry:

```bash
RELEASE_CONTEXT=$(monorepo-semantic-release report --dry-run)

monorepo-semantic-release package-json    --context "$RELEASE_CONTEXT" --dry-run
monorepo-semantic-release package-manager --context "$RELEASE_CONTEXT" --dry-run
monorepo-semantic-release changelog       --context "$RELEASE_CONTEXT" --dry-run
monorepo-semantic-release vcs             --context "$RELEASE_CONTEXT" --dry-run
```

**Expected Behavior:**

1. ✓ Analyze all packages and commits
2. ✓ Calculate version bumps
3. ✓ Render the release commit message (shown in the log line, never committed)
4. ✗ NO file modifications
5. ✗ NO git commits or tags
6. ✗ NO remote push
7. ✗ NO publish

**Console Output (stderr):**

```
[report] 🚀 BUMP     ts-ioc-container 2.0.5 -> 2.1.0 (minor)
[report] 🚀 BUMP     @ts-ioc-container/react 1.5.1 -> 1.6.0 (minor)
[package-manager] ⚠ SKIP     BUMP     ts-ioc-container@2.1.0 (dry-run)
[package-manager] ⚠ SKIP     BUMP     @ts-ioc-container/react@1.6.0 (dry-run)
[changelog] ⚠ SKIP     WRITE    ts-ioc-container CHANGELOG.md (dry-run)
[changelog] ⚠ SKIP     WRITE    @ts-ioc-container/react CHANGELOG.md (dry-run)
[vcs] ⚠ SKIP     COMMIT (dry-run)
ci(release): publish [skip-ci]

## 📦 ts-ioc-container@2.1.0

- 🔹 feat: add lazy provider support
- 🔹 feat: support async factory functions
- 🔹 fix: memory leak in singleton provider

## 📦 @ts-ioc-container/react@1.6.0

- 🔹 feat: update from 1.5.1 to 1.6.0

Affected: 📌 ts-ioc-container@2.1.0,@ts-ioc-container/react@1.6.0
[vcs] ⚠ SKIP     TAG      ts-ioc-container@2.1.0 (dry-run)
[vcs] ⚠ SKIP     TAG      @ts-ioc-container/react@1.6.0 (dry-run)
[vcs] ⚠ SKIP     PUSH     HEAD and 2 tag(s) (dry-run)
```

**Result:**

- Full visibility into what would happen, including the exact release commit message
- No risk to repository state
- Can be run multiple times safely
- Each step's `--dry-run` is independent — a pipeline can preview one step while running the others for real

---

## Success Criteria

✅ The CLI should:

1. Detect all packages with release-worthy commits
2. Calculate correct semantic version bumps (including dependency updates)
3. Generate well-formatted changelogs with GitHub links
4. Update package.json versions atomically using pnpm version
5. Create properly formatted git tags (package@version)
6. Handle internal monorepo dependencies (exact versions)
7. Sort packages topologically (dependencies first)
8. Update dependent packages when dependencies change
9. Provide clear, colorful console output
10. Work as standalone NPM package (installable in any monorepo)
