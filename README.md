# monorepo-semantic-release

CLI for semantic versioning and release automation in `pnpm` monorepos.

It discovers workspace packages, analyzes conventional commits per package scope, bumps versions in dependency order, updates internal dependency versions, generates changelogs, creates a release commit and tags, optionally creates GitHub Releases, and publishes to npm.

The tool is a set of discrete steps rather than a single command: one step analyzes the repository and produces a release context, and each other step consumes that context to do one job. Your CI pipeline decides which steps to run and in what order — the tool doesn't orchestrate itself. This makes it easy to skip a step (no GitHub token? skip `release-notes`), add your own steps in between, or re-run a single step in isolation.

## Requirements

- Node.js: `>=20.11`
- pnpm
- Git repository with conventional commits

## Installation

```bash
pnpm add -D release-monorepo-semantically
```

## Usage

Every step after `report` takes the JSON it produced via `--context`. A minimal pipeline, run from your monorepo root:

```bash
RELEASE_CONTEXT=$(monorepo-semantic-release report)

monorepo-semantic-release package-json    --context "$RELEASE_CONTEXT"
monorepo-semantic-release package-manager --context "$RELEASE_CONTEXT"
monorepo-semantic-release changelog       --context "$RELEASE_CONTEXT"
monorepo-semantic-release vcs             --context "$RELEASE_CONTEXT"
```

`report` only writes its JSON context to stdout — nothing else goes there, so it's safe to capture directly like this. Progress messages from every step go to stderr.

### GitHub Actions example

```yaml
- name: Generate release context
  run: |
    RELEASE_CONTEXT=$(monorepo-semantic-release report)
    echo "RELEASE_CONTEXT=$RELEASE_CONTEXT" >> "$GITHUB_ENV"

- name: Update internal dependency versions
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

## Commit conventions

Release-triggering commits:

- `feat(scope): ...` -> `minor`
- `fix(scope): ...` -> `patch`
- `perf(scope): ...` -> `patch`
- `BREAKING CHANGE` or `!` -> `major`

Non-release types: `docs`, `test`, `ci`, `chore`, `refactor`, `style`.

Package scope is matched by package name.

## Steps

Every step accepts `--context <json>` (except `report`, which produces it), `--dry-run` (preview only; no files, git state, or publishes change), and `--verbose` (explain what is being released; see [Verbose output](#verbose-output)). Steps run in a fresh process each time, so `--context` is how state passes between them.

| Command           | Action      | Does                                                                                                                                                                                                                                          |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report`          | (only one)  | Discovers workspace packages, computes version bumps from commits since each package's last release tag, fails if the working tree isn't clean. Writes the release context as JSON to stdout.                                                 |
| `package-json`    | (only one)  | Updates internal dependency versions in each released package's `package.json` to exact versions, in the `dependencies`/`devDependencies` block each was declared in (peer ranges are left alone), then refreshes the workspace lockfile.     |
| `package-manager` | _(default)_ | Bumps each released package's version via `pnpm version`.                                                                                                                                                                                     |
| `package-manager` | `publish`   | Publishes each released package via `pnpm publish`. Kept separate from the version bump so a pipeline can't reach the registry by accident.                                                                                                   |
| `changelog`       | (only one)  | Renders and prepends a changelog entry per released package. `--template <path>` and `--changelog-name <value>` (default `CHANGELOG.md`) override the defaults.                                                                               |
| `vcs`             | _(default)_ | Runs `commit`, `tag`, and `push` in that order in one invocation.                                                                                                                                                                             |
| `vcs`             | `commit`    | Stages everything and creates the release commit. `--template <path>` overrides the message template.                                                                                                                                         |
| `vcs`             | `tag`       | Creates a `<package-name>@<version>` tag per released package.                                                                                                                                                                                |
| `vcs`             | `push`      | Pushes `HEAD` and, if any packages were released, the new tags.                                                                                                                                                                               |
| `release-notes`   | (only one)  | Creates a GitHub Release per released package via the `gh` CLI. Needs `repository`/`token` from config or the `GITHUB_REPOSITORY`/`GITHUB_TOKEN` environment variables, and `gh` on `PATH`. `--template <path>` overrides the notes template. |

`vcs commit`/`vcs tag`/`vcs push` exist so a pipeline can skip pushing (e.g. to inspect a release commit locally) without giving up tagging or committing.

### Verbose output

`--verbose` adds observability lines to a step's stderr output — which packages are affected, the versions they move between, and the bump type behind each one. Nothing else changes: the step does exactly the same work, and `report`'s stdout stays pure JSON.

On `report` it explains how the plan was reached — every package scanned, the release-triggering commits found for it, and the internal dependency updates that force a bump on their own:

```
$ monorepo-semantic-release report --verbose
[report] SCAN     2 public package(s) in dependency order: pkg-a, pkg-b
[report] SCAN     pkg-a 2 commit(s) since pkg-a@1.0.0, 1 release-triggering
[report] SCAN     pkg-a <- feat(pkg-a)!: rework api [4518a1c] (major)
[report] BUMP     pkg-a 1.0.0 -> 2.0.0 (major)
[report] SCAN     pkg-b 2 commit(s) since pkg-b@2.0.0, 1 release-triggering
[report] SCAN     pkg-b <- fix(pkg-b): small fix [4e07b8d] (patch)
[report] DEPS     pkg-b <- pkg-a 1.0.0 -> 2.0.0 in dependencies (forces minor)
[report] BUMP     pkg-b 2.0.0 -> 2.1.0 (minor)
[report] PLAN     2 package(s) affected
[report] PLAN     pkg-a 1.0.0 -> 2.0.0 (major, 1 commit(s))
[report] PLAN     pkg-b 2.0.0 -> 2.1.0 (minor, 1 commit(s), deps: pkg-a@2.0.0)
```

On every other step it reports the plan carried by the `--context` it was handed, so a step re-run on its own still says what it is about to release:

```
$ monorepo-semantic-release changelog --context "$RELEASE_CONTEXT" --verbose
[changelog] PLAN     2 package(s) affected
[changelog] PLAN     pkg-a 1.0.0 -> 2.0.0 (major, 1 commit(s))
[changelog] PLAN     pkg-b 2.0.0 -> 2.1.0 (minor, 1 commit(s), deps: pkg-a@2.0.0)
[changelog] WRITE    pkg-a CHANGELOG.md
[changelog] WRITE    pkg-b CHANGELOG.md
```

The plan is printed once per invocation, even when a step fans out into several actions (`vcs` runs commit, tag and push). `package-json` additionally reports every dependency specifier it rewrites, with the block it lives in.

## Configuration

Steps read settings from a `release` section in the root `package.json`, a root `.release.json` file, or the corresponding CLI flag (wins over both). When both files configure the same step, `.release.json`'s section replaces `package.json`'s entirely rather than merging field by field; steps configured only in `package.json` are unaffected. Each step reads its own key:

```json
{
  "release": {
    "vcs": { "template": "templates/release-commit-msg.hbs" },
    "changelog": { "template": "templates/changelog.hbs", "changelogName": "CHANGELOG.md" },
    "release-notes": { "repository": "acme/repo", "token": "..." },
    "package-manager": { "kind": "pnpm" }
  }
}
```

`.release.json` uses the same shape without the `release` wrapper:

```json
{
  "vcs": { "template": "templates/release-commit-msg.hbs" }
}
```

`dryRun: true` in any section makes that step always preview, equivalent to always passing `--dry-run` to it.

## Templates

Default templates ship with the package and are used automatically. Override per step with `--template <path>` (relative to the working directory) or the matching config section:

- `changelog` — per-package changelog entry
- `vcs` (used by the `commit` action) — release commit message
- `release-notes` — GitHub release notes body

Templates are [Handlebars](https://handlebarsjs.com/), with `now`, `hasBreakingChanges`, `hasFeatures`, `hasFixes`, `hasPerformance`, `findBreakingChanges`, `findFeatures`, `findFixes`, `findPerformance`, `lookup`, and `call` helpers registered.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run test:e2e
pnpm run lint
```

## Notes

- Internal monorepo dependencies are written as exact versions.
- Tag format is fixed: `<package-name>@<version>`.
- Private packages (`"private": true`) are never released.
- `--dry-run` on any step performs no file, git, or registry mutation for that step.
- `--verbose` on any step only adds stderr output; it never changes what the step does.
