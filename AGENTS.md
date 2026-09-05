# AGENTS.md

This file provides guidance to Codex and other code agents working in this repository.

## Project Overview

This repository contains a TypeScript CLI for semantic versioning and release management in pnpm monorepos. It's a set of independent steps, not one command: `report` discovers workspace packages, analyzes conventional commits, and calculates version bumps; `package-json`, `package-manager`, `changelog`, `vcs`, and `release-notes` each consume the JSON `report` produced (via `--context`) and do one job. The caller — a CI pipeline or a local shell loop — decides which steps run and in what order.

Core entrypoints and modules:

- `src/index.ts` wires the DI container and all feature modules.
- `src/cli/` is the CLI framework itself: `Application` (controller/action routing), `execute` (parses a method's `@command`/`@schema` into a validated options object), `decorators` (`@command`, `@schema`, `@action`, `@onDefault`).
- `src/features/<name>/<Name>Controller.ts` is each step's entrypoint (`report`, `package-json`, `package-manager`, `changelog`, `vcs`, `release-notes`); `src/features/<name>/<Name>Config.ts` is its config schema.
- `src/services/` contains filesystem, git, rendering, package manager, and logging services.
- `src/features/<name>/*.hbs` are each step's default Handlebars templates (`changelog.hbs`, `release-commit-msg.hbs`, `github-release-notes.hbs`); `scripts/copy-templates.mjs` copies them into `dist/` as part of `pnpm run build` since `tsc` only emits `.ts` output.
- `e2e/` covers the release workflow behavior end to end, via `e2e/releaseFixture.ts`'s `release()` helper, which chains the individual step invocations the way a real CI pipeline would.

## Working Rules

- Inspect existing code and tests before changing behavior. Match the current architecture instead of introducing parallel patterns or alternate abstractions without a clear need.
- Preserve user changes in a dirty worktree. Do not revert unrelated modifications.
- Keep edits small and targeted. Prefer extending the current services and controller flow over rewriting them.
- Use ASCII unless a file already requires non-ASCII text.
- Use TDD for development: write or update a failing test first, implement the smallest change to make it pass, then refactor if needed.
- Express behavior in BDD terms in tests and specs so scenarios describe expected outcomes, not just implementation details.
- When behavior changes, update or add tests close to the affected area before or alongside production code changes.
- Use [moq.ts](https://github.com/dvabuzyarov/moq.ts) for mocking in unit tests (see `CLAUDE.md`).

## Environment And Commands

- Node version: `>=20.11` (see `package.json` `engines`; `.nvmrc` pins the newer version CI develops against)
- Package manager: `pnpm` (see `package.json` `packageManager` for the exact pin)
- Build: `pnpm run build` (also copies `.hbs` templates into `dist/` — required before running the CLI from a checkout)
- Unit tests: `pnpm test`
- End-to-end tests: `pnpm run test:e2e` (runs `pnpm run build` first)
- Lint: `pnpm run lint`
- Release automation: `pnpm run release`
- CLI entrypoint: `monorepo-semantic-release <controller> [action] [--flags...]`

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

`report` does not reject non-conventional commits; a message it can't parse is treated as `type: "unknown"` with no bump and is silently excluded.

### Release Flow

The intended release flow is sequential and dependency-aware, split across steps:

1. `report`: discover workspace packages from the root `package.json`, excluding private packages; sort so dependencies are handled before dependents; read commits since each package's last `<package-name>@<version>` tag; determine the version bump from scoped commits plus internal dependency updates; write the result as JSON to stdout.
2. `package-json --context <json>`: update internal dependency versions to exact versions.
3. `package-manager --context <json>`: bump package versions via `pnpm version`.
4. `changelog --context <json>`: render and prepend changelog entries.
5. `vcs --context <json>`: create one release commit, then tags for released packages, then push (its default action runs `commit`, `tag`, `push` in that order; each is also its own named action).
6. `package-manager publish --context <json>` and `release-notes --context <json>`: optional, invoked separately by the pipeline.

Do not parallelize per-package processing within `report`. Later packages depend on version changes computed for earlier ones. Steps themselves are independent processes and never run concurrently with each other in the intended flow (each depends on the previous step's `--context` output).

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
- Default templates: `src/features/changelog/changelog.hbs`, `src/features/vcs/release-commit-msg.hbs`, `src/features/releaseNotes/github-release-notes.hbs`.
- Respect `--template` CLI overrides and `release.<step>` config overrides (`package.json`'s `release` section, or `.release.json`) — see `README.md` for precedence.
- `--dry-run` on a step must not mutate files, create commits, create tags, push, or publish for that step.
- `--verbose` on a step only adds observability lines (`SCAN`, `DEPS`, `PLAN`) to stderr. It must never change what the step does, and never write to stdout.
- `report` is the only step with a precondition: it fails if the working tree isn't clean. Don't add that check to `vcs` — its job is to commit the changes the earlier steps just made, so the tree is expected to be dirty when it runs.

## Implementation Notes

- Keep each step's logic centered in its own `<Name>Controller`; service classes should stay focused on IO and integrations.
- Scope matching is package-name based. Changes to commit parsing or filtering should preserve that behavior unless tests and requirements are updated together.
- The project already has extensive e2e coverage. For workflow changes, prefer adding or updating an e2e spec in `e2e/`.
- Favor BDD-style test names and end-to-end scenarios that describe user-visible release behavior.
- Progress logs go to stderr, not stdout — `report`'s stdout must stay pure JSON so `RELEASE_CONTEXT=$(monorepo-semantic-release report)` works without stripping log lines.
- `SPECS.md` is the authoritative product specification. Consult it before changing release semantics.
