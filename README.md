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

Every step accepts `--context <json>` (except `report`, which produces it) and `--dry-run` (preview only; no files, git state, or publishes change). Steps run in a fresh process each time, so `--context` is how state passes between them.

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
