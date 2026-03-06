# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CLI tool for automated semantic versioning and release management in pnpm monorepos. It analyzes conventional commits, calculates semantic version bumps per package, generates changelogs, updates package versions, and creates release commits with tags.

**Key Domain Concepts:**

- NpmPackage - Individual packages in the workspace
- Monorepo/Workspace - pnpm workspace with multiple packages
- SemVerType - minor, major, patch version bumps
- SemanticCommit - Conventional commit format parser
- Changelog - Handlebars-based changelog generation
- Release - Full release orchestration

## Conventional Commits Requirement

**CRITICAL:** All commits in this repository MUST follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

Format: `<type>(<scope>): <subject>`

Release-triggering types:

- `feat` → Minor bump
- `fix` → Patch bump
- `perf` → Patch bump
- `BREAKING CHANGE` or `!` → Major bump

Non-release types (filtered out):

- `docs`, `test`, `ci`, `chore`, `refactor`, `style` → No release

## Release Process Architecture

The CLI follows a sequential, dependency-aware release workflow:

1. **Discovery Phase**
   - Read `package.json` → `workspaces` field to discover packages
   - Build dependency graph of internal monorepo dependencies
   - Topologically sort packages (dependencies first)
   - Filter out private packages

2. **Analysis Phase**
   - For each package, detect commits since last tag (`package@version`)
   - Parse conventional commits from git history
   - Filter commits by scope (scope maps to package name)
   - Check for outdated internal dependencies

3. **Version Calculation**
   - Determine bump type from commits AND dependency updates
   - **Important:** Dependency updates trigger MINOR bump
   - **Priority:** Breaking > Minor (feat/dep update) > Patch (fix/perf) > None
   - Example: fix commit + dependency update = MINOR (dependency wins)

4. **Update Phase** (per package, in dependency order)
   - Update internal dependencies in package.json (exact versions)
   - Run `pnpm version <newVersion>` (NOT manual JSON editing)
   - Generate changelog using Handlebars templates
   - Prepend new release to existing CHANGELOG.md
   - Create git tag: `package@version`

5. **Finalization Phase**
   - Update root `pnpm-lock.yaml`
   - Create single release commit: `ci: release [skip-ci]`
   - Push commit and all tags to remote

## Key Implementation Rules

### Sequential Processing

Packages MUST be processed sequentially (not parallel) because:

- Later packages depend on earlier packages
- Dependency version updates happen in order
- Only one final commit is created

### Dependency Management

- Internal dependencies MUST use exact versions (not `^` or `~`)
- Example: `"ts-ioc-container": "2.0.5"` ✅
- Example: `"ts-ioc-container": "^2.0.5"` ❌
- This enables precise dependency update detection

### Version Bump Priority

When combining commits and dependency updates:

| Commits  | Dependency Update | Result | Reason                        |
| -------- | ----------------- | ------ | ----------------------------- |
| Breaking | Yes               | MAJOR  | Breaking has highest priority |
| Breaking | No                | MAJOR  | Breaking triggers major       |
| Feature  | Yes               | MINOR  | Both trigger minor            |
| Feature  | No                | MINOR  | Feature triggers minor        |
| Patch    | Yes               | MINOR  | Dependency update wins        |
| Patch    | No                | PATCH  | Standard patch                |
| None     | Yes               | MINOR  | Dependency update alone       |
| None     | No                | NONE   | No release                    |

### Git Tag Format

- Format: `<package-name>@<version>`
- Examples: `ts-ioc-container@2.1.0`, `@ts-ioc-container/react@1.5.2`

### Release Commit Format

Template location: `templates/release-commit-message.hbs`

```
ci: release [skip-ci]

## package1@version

- type[!]: subject
- type[!]: subject

## package2@version

- type[!]: subject

Affected: package1@version,package2@version
```

### Changelog Format

Template location: `templates/changelog.hbs`

Structure:

- Cumulative (prepend new releases)
- Each version is H1 with GitHub compare link
- Section order: BREAKING CHANGES → Features → Bug Fixes → Performance
- Includes commit links to GitHub
- Non-release commits excluded

## Commands

The main command is:

```bash
monorepo-semantic-release
```

This orchestrates the entire release process from the repository root.

## Development Guidelines

### When Working on Version Calculation

- Reference SPECS.md section 2.2 "Determine Version Bump"
- Remember dependency updates have higher priority than patches
- Test with all combination scenarios from the specification

### When Working on Changelog Generation

- Use Handlebars templates in `templates/`
- Maintain section order: BREAKING → Features → Fixes → Perf
- Include GitHub compare links in version headers
- Prepend to existing changelog (cumulative)

### When Working on Git Operations

- Use `pnpm version` command (not manual JSON editing)
- Create ONE commit for all packages
- Tag format must be exact: `package@version`
- Include `[skip-ci]` in commit message

### Scope to Package Mapping

Commit scopes map to package names:

- `ts-ioc-container` → `packages/ts-ioc-container/`
- `@ts-ioc-container/react` → `packages/react/`
- Scope must match package name exactly

## Testing Considerations

When implementing or testing:

1. Use `--dry-run` mode for safe testing
2. Test with multiple packages having interdependencies
3. Verify topological sort correctness
4. Test breaking changes, features, fixes, and dependency updates
5. Verify changelog generation includes all commit types correctly
6. Ensure tags are created before the final commit
7. Test error handling - script should fail naturally with clear messages
