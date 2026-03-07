# AGENTS.md

This file provides guidance to Codex and other code agents working in this repository.

## Project Overview

This repository contains a TypeScript CLI for semantic versioning and release management in pnpm monorepos. It discovers workspace packages, analyzes conventional commits, calculates version bumps, updates internal dependency versions, renders changelogs, and creates release artifacts.

Core entrypoints and modules:

- `src/main.ts` wires the CLI, template overrides, and `--dry-run`.
- `src/MonorepoController.ts` coordinates discovery, version bumping, changelog rendering, tagging, and release commit creation.
- `src/services/` contains filesystem, git, rendering, package manager, and logging services.
- `templates/changelog.hbs` and `templates/release-commit-msg.hbs` define generated output.
- `e2e/` covers the release workflow behavior end to end.

## Working Rules

- Inspect existing code and tests before changing behavior. Match the current architecture instead of introducing parallel patterns or alternate abstractions without a clear need.
- Preserve user changes in a dirty worktree. Do not revert unrelated modifications.
- Keep edits small and targeted. Prefer extending the current services and controller flow over rewriting them.
- Use ASCII unless a file already requires non-ASCII text.
- Use TDD for development: write or update a failing test first, implement the smallest change to make it pass, then refactor if needed.
- Express behavior in BDD terms in tests and specs so scenarios describe expected outcomes, not just implementation details.
- When behavior changes, update or add tests close to the affected area before or alongside production code changes.

## Environment And Commands

- Node version: `>=22 <23`
- Package manager: `pnpm@10.20.0`
- Build: `pnpm run build`
- Unit tests: `pnpm test`
- End-to-end tests: `pnpm run test:e2e`
- Lint: `pnpm run lint`
- Release automation: `pnpm run release`
- CLI entrypoint: `monorepo-semantic-release`

## Domain Invariants

### Conventional Commits

All commits in this repository should follow conventional commits:

`<type>(<scope>): <subject>`

Release-triggering changes:

- `feat` -> minor
- `fix` -> patch
- `perf` -> patch
- `BREAKING CHANGE` or `!` -> major

Non-release types:

- `docs`
- `test`
- `ci`
- `chore`
- `refactor`
- `style`

### Release Flow

The intended release flow is sequential and dependency-aware:

1. Discover workspace packages from the root `package.json`.
2. Exclude private packages from release processing.
3. Sort packages so dependencies are handled before dependents.
4. Read commits since the last tag using the `<package-name>@<version>` format.
5. Determine the version bump from scoped commits plus internal dependency updates.
6. Update internal dependency versions exactly, bump package versions, and render changelogs.
7. Create one release commit and then create tags for released packages.

Do not parallelize per-package release processing. Later packages depend on version changes made to earlier ones.

### Version Bump Priority

Dependency updates trigger a `minor` bump and outrank patch-level commits.

Priority order:

`major` > `minor` > `patch` > `none`

Expected outcomes:

- breaking change + anything else -> `major`
- feature commit -> `minor`
- dependency update only -> `minor`
- fix/perf only -> `patch`
- no relevant commits and no dependency changes -> `none`

### Dependency Rules

- Internal monorepo dependencies must use exact versions, not ranges.
- When an internal dependency version changes, dependents should be updated to that exact version.
- Avoid introducing caret or tilde ranges for internal packages.

### Git And Artifact Rules

- Tag format must be exactly `<package-name>@<version>`.
- The changelog template is `templates/changelog.hbs`.
- The release commit template is `templates/release-commit-msg.hbs`.
- Respect CLI and `package.json` template overrides implemented in `src/main.ts`.
- `--dry-run` must not mutate files, create commits, or create tags.

## Implementation Notes

- Keep release logic centered in `MonorepoController`; service classes should stay focused on IO and integrations.
- Scope matching is package-name based. Changes to commit parsing or filtering should preserve that behavior unless tests and requirements are updated together.
- The project already has extensive e2e coverage. For workflow changes, prefer adding or updating an e2e spec in `e2e/`.
- Favor BDD-style test names and end-to-end scenarios that describe user-visible release behavior.
- `SPECS.md` is the authoritative product specification. Consult it before changing release semantics.
