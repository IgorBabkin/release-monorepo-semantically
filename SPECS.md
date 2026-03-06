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

- The release CLI MUST validate that all commits follow conventional format
- Non-conventional commits MUST cause the release process to fail with a clear error message
- The error message MUST identify the problematic commit(s) and provide guidance on fixing them

**Example Error:**

```
❌ Release failed: Non-conventional commits detected

The following commits do not follow conventional commit format:
  - a1b2c3d: "Updated README" (missing type and scope)
  - d4e5f6a: "quick fix" (missing type and scope)

All commits must follow the format: <type>(<scope>): <subject>

Allowed types: feat, fix, perf, docs, test, ci, chore, refactor, style
Allowed scopes: ts-ioc-container, @ts-ioc-container/react, @ts-ioc-container/solidjs, @ts-ioc-container/express, @ts-ioc-container/fastify

Please rewrite these commits using conventional format and try again.
```

## CLI Interface

The release process is orchestrated entirely from the root package.json:

**Script workflow:**

1. Discover all workspace packages
2. Build dependency graph
3. Sort packages topologically (dependencies first)
4. Process each package sequentially in dependency order
5. Track updated dependency versions between package releases

### Usage

```bash
# Root command - releases all packages in dependency order
monorepo-semantic-release

# Dry-run mode - preview changes without modifying anything
monorepo-semantic-release --dry-run
```

### CLI Options

**`--dry-run`** (optional)

- Simulates the entire release process without making any changes
- Shows exactly what would be released, version bumps, and changelogs
- No file modifications, no git commits, no git tags, no pushes
- Safe to run repeatedly for planning and verification

**Examples:**

```bash
# Preview what would be released
monorepo-semantic-release --dry-run

# Perform actual release
monorepo-semantic-release
```

## Workflow

### High-Level Flow

```
Root Release Script (monorepo-semantic-release)
  ↓
1. Discover workspace packages from package.json → workspaces
  ↓
2. Build dependency graph (internal dependencies)
  ↓
3. Topological sort (dependencies first)
  ↓
4. Detect commits since last release
  ↓
4. For each package in sorted order:
   ├─ Filter commits out by package name (scope)
   ├─ Check for outdated internal dependencies
   ├─ Calculate version bump (commits + dependency updates)
   ├─ Skip if no changes (BumpType.NONE)
   ├─ Update dependencies in package.json
   ├─ Run pnpm version <newVersion>
   ├─ Generate & prepend new changelog to CHANGELOG.md
   ├─ Create git tag: pkg@version
   └─ Track released version for next package's dependency check
  ↓
5. Update root pnpm-lock.yaml
  ↓
6. Create single release commit: ci: release [skip-ci]
   (includes all packages and changes)
```

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
- ❌ Incorrect: `"ts-ioc-container": "^2.0.5"`
- This ensures precise dependency tracking and update detection

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

#### 4.1 Update package.json using pnpm version

**IMPORTANT:** Use `pnpm version` command to bump versions (not manual JSON editing).

**Why `pnpm version`?**

- Validates semantic version format
- Runs `preversion`, `version`, and `postversion` scripts from package.json
- Updates package.json atomically
- Standard pnpm behavior (more reliable than manual JSON editing)

#### 4.2 Update pnpm-lock.yaml

After updating all package.json files, regenerate the lockfile:

### Phase 5: Git Operations

#### 5.1 Create Release Commits

**IMPORTANT:** Create **one commit per all package**.

**Commit Message Format** (from `scripts/templates/release-commit-message.hbs`):

```
ci: release [skip-ci]

## package1@version

- type[!]: subject
- type[!]: subject

## package2@version

- type[!]: subject

Affected: package1@version,package2@version
```

**Example:**

```
ci: release [skip-ci]

## ts-ioc-container@2.1.0

- feat: add new provider type
- feat: support async factory functions
- fix: memory leak in singleton provider

## @ts-ioc-container/react@1.6.0

- fix: resolve context hook issue

Affected: ts-ioc-container@2.1.0,@ts-ioc-container/react@1.6.0
```

#### 5.2 Create Git Tags

Create a tag for each released package:

**Tag Format:** `<package-name>@<version>`

**Examples:**

- `ts-ioc-container@2.1.0`
- `@ts-ioc-container/react@1.5.2`

## Output Format

### Console Output (--dry-run)

```
🔍 Discovering workspace packages...
  Found 5 packages in workspaces

🔗 Building dependency graph...
  ts-ioc-container (no internal deps)
  @ts-ioc-container/react → ts-ioc-container
  @ts-ioc-container/solidjs → ts-ioc-container
  @ts-ioc-container/express → ts-ioc-container
  @ts-ioc-container/fastify → ts-ioc-container

📊 Topological sort order:
  1. ts-ioc-container
  2. @ts-ioc-container/react
  3. @ts-ioc-container/solidjs
  4. @ts-ioc-container/express
  5. @ts-ioc-container/fastify

🔍 Analyzing changes...

📦 ts-ioc-container
  Current version: 2.0.5
  Commits:         5 (3 feat, 2 fix)
  Bump reason:     New features
  Next version:    2.1.0 (minor)

📦 @ts-ioc-container/react
  Current version: 1.5.1
  Commits:         0
  Dependencies:    ts-ioc-container 2.0.5 → 2.1.0
  Bump reason:     Dependency update
  Next version:    1.6.0 (minor)

📦 @ts-ioc-container/solidjs
  Current version: 1.0.0
  Commits:         0
  Dependencies:    ts-ioc-container 2.0.5 → 2.1.0
  Bump reason:     Dependency update
  Next version:    1.1.0 (minor)

📦 @ts-ioc-container/express
  No changes

📦 @ts-ioc-container/fastify
  No changes

📝 Release plan:

  [1/3] ts-ioc-container (2.0.5 → 2.1.0)
    ✓ Run pnpm version 2.1.0
    ✓ Update CHANGELOG.md
    ✓ Git tag: ts-ioc-container@2.1.0

  [2/3] @ts-ioc-container/react (1.5.1 → 1.6.0)
    ✓ Update dependency: ts-ioc-container@2.1.0
    ✓ Run pnpm version 1.6.0
    ✓ Update CHANGELOG.md
    ✓ Git tag: @ts-ioc-container/react@1.6.0

  [3/3] @ts-ioc-container/solidjs (1.0.0 → 1.1.0)
    ✓ Update dependency: ts-ioc-container@2.1.0
    ✓ Run pnpm version 1.1.0
    ✓ Update CHANGELOG.md
    ✓ Git tag: @ts-ioc-container/solidjs@1.1.0

  Final:
    ✓ Update pnpm-lock.yaml
    ✓ Git commit: ci: release [skip-ci]
    ✓ Push 1 commit and 3 tags to remote
```

### Console Output (Actual Run)

```
🔍 Discovering workspace packages...
  ✓ Found 5 packages

🔗 Building dependency graph...
  ✓ Analyzed internal dependencies

📊 Release order (3 packages):
  1. ts-ioc-container
  2. @ts-ioc-container/react
  3. @ts-ioc-container/solidjs

📦 [1/3] Releasing ts-ioc-container@2.1.0...
  ✓ Detected 5 commits (3 feat, 2 fix)
  ✓ Calculated bump: minor (new features)
  ✓ pnpm version 2.1.0
  ✓ Generated CHANGELOG.md
  ✓ Git tag: ts-ioc-container@2.1.0

📦 [2/3] Releasing @ts-ioc-container/react@1.6.0...
  ✓ Detected dependency update: ts-ioc-container 2.0.5 → 2.1.0
  ✓ Updated package.json dependencies
  ✓ Calculated bump: minor (dependency update)
  ✓ pnpm version 1.6.0
  ✓ Generated CHANGELOG.md
  ✓ Git tag: @ts-ioc-container/react@1.6.0

📦 [3/3] Releasing @ts-ioc-container/solidjs@1.1.0...
  ✓ Detected dependency update: ts-ioc-container 2.0.5 → 2.1.0
  ✓ Updated package.json dependencies
  ✓ Calculated bump: minor (dependency update)
  ✓ pnpm version 1.1.0
  ✓ Generated CHANGELOG.md
  ✓ Git tag: @ts-ioc-container/solidjs@1.1.0

🔒 Finalizing...
  ✓ Updated pnpm-lock.yaml
  ✓ Git commit: ci: release [skip-ci]

🚀 Pushing to remote...
  ✓ Pushed 1 commit
  ✓ Pushed 3 tags

✨ Release complete!

Released packages:
  • ts-ioc-container@2.1.0 (5 commits)
  • @ts-ioc-container/react@1.6.0 (dependency update)
  • @ts-ioc-container/solidjs@1.1.0 (dependency update)
```

## Error Handling

The CLI is designed to run in CI environments where the repository state is controlled. No pre-flight checks are performed - the script will fail naturally when issues occur.

**Error Behavior:**

If an error occurs during the release process:

- Display clear error message showing what failed
- Exit with non-zero status code
- Leave working directory in current state for inspection

**Common Errors:**

- **Missing package.json**: Script will throw error when attempting to read file
- **Invalid workspaces**: Script will fail when parsing workspaces field
- **Git errors**: Git commands will fail with appropriate error messages
- **pnpm version errors**: pnpm will fail if version already exists or invalid
- **Template errors**: Handlebars will fail if templates are missing or invalid
- **Push errors**: Git push will fail with authentication or network errors

### Usage in Monorepo

```bash
monorepo-semantic-release
```

**Note:** Individual packages do not need a `release` script. The root script handles all packages automatically.

## Use Cases

### Use Case 1: Simple Feature Release

**Scenario:** Developer adds a new feature to core library

**Setup:**

- Monorepo with `ts-ioc-container` (core) and `@ts-ioc-container/react` (depends on core)
- Developer commits: `feat(ts-ioc-container): add lazy provider support`

**Execution:**

```bash
monorepo-semantic-release --dry-run
```

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

**Execution:**

```bash
monorepo-semantic-release
```

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

**Execution:**

```bash
monorepo-semantic-release --dry-run
```

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

**Execution:**

```bash
monorepo-semantic-release
```

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

```bash
monorepo-semantic-release --dry-run
```

**Expected Behavior:**

1. ✓ Analyze all packages and commits
2. ✓ Calculate version bumps
3. ✓ Generate preview of changelog content
4. ✓ Show what tags would be created
5. ✓ Show what would be committed
6. ✗ NO file modifications
7. ✗ NO git commits or tags
8. ✗ NO remote push

**Console Output:**

```
🔍 DRY-RUN MODE - No changes will be made

📊 Release plan:

  [1/3] ts-ioc-container (2.0.5 → 2.1.0)
    • 5 commits: 3 feat, 2 fix
    • Bump reason: New features
    • Would update: package.json, CHANGELOG.md
    • Would create tag: ts-ioc-container@2.1.0

  [2/3] @ts-ioc-container/react (1.5.1 → 1.6.0)
    • Dependency update: ts-ioc-container 2.0.5 → 2.1.0
    • Bump reason: Dependency update
    • Would update: package.json, CHANGELOG.md
    • Would create tag: @ts-ioc-container/react@1.6.0

  [3/3] @ts-ioc-container/solidjs (1.0.0 → 1.1.0)
    • Dependency update: ts-ioc-container 2.0.5 → 2.1.0
    • Bump reason: Dependency update
    • Would update: package.json, CHANGELOG.md
    • Would create tag: @ts-ioc-container/solidjs@1.1.0

📝 Would create commit:
  ci: release [skip-ci]

  ## ts-ioc-container@2.1.0

  - feat: add lazy provider support
  - feat: support async factory functions
  - fix: memory leak in singleton provider

  ## @ts-ioc-container/react@1.6.0

  - deps: update ts-ioc-container to 2.1.0

  ## @ts-ioc-container/solidjs@1.1.0

  - deps: update ts-ioc-container to 2.1.0

  Affected: ts-ioc-container@2.1.0,@ts-ioc-container/react@1.6.0,@ts-ioc-container/solidjs@1.1.0

🚀 Would push:
  • 1 commit
  • 3 tags

✨ Dry-run complete - no changes were made

To perform the actual release, run:
  monorepo-semantic-release
```

**Result:**

- Full visibility into what would happen
- No risk to repository state
- Can be run multiple times safely
- Perfect for CI/CD preview jobs

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
