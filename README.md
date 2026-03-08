# monorepo-semantic-release

CLI for semantic versioning and release automation in `pnpm` monorepos.

It discovers workspace packages, analyzes conventional commits per package scope, bumps versions in dependency order, updates internal dependency versions, generates changelogs, creates a release commit and tags, optionally creates GitHub Releases, and publishes to npm.

## Requirements

- Node.js: `>=22 <23`
- pnpm: `10.20.0`
- Git repository with conventional commits

## Installation

```bash
pnpm add -D release-monorepo-semantically
```

Run from your monorepo root:

```bash
pnpm monorepo-semantic-release
```

## Commit conventions

Release-triggering commits:

- `feat(scope): ...` -> `minor`
- `fix(scope): ...` -> `patch`
- `perf(scope): ...` -> `patch`
- `BREAKING CHANGE` or `!` -> `major`

Non-release types: `docs`, `test`, `ci`, `chore`, `refactor`, `style`.

Package scope is matched by package name.

## Release flow

1. Discover workspace packages from root `package.json` workspaces.
2. Exclude private packages.
3. Sort packages so dependencies are processed first.
4. Read commits since `<package-name>@<version>` tag.
5. Compute bump type (`major > minor > patch > none`).
6. Update package versions and internal dependency versions.
7. Render changelog entries.
8. Create one release commit and per-package tags.
9. Push commit/tags (unless disabled).
10. Create GitHub Releases (if configured).
11. Publish released packages (unless disabled).

## CLI options

```bash
monorepo-semantic-release [options]

Options:
  --dry-run                        Preview changes without mutating files/git/publish
  --no-push                        Skip git push
  --no-publish                     Skip npm publish
  --changelog-template <path>      Override changelog template
  --release-commit-template <path> Override release commit template
  -h, --help                       Show help
```

## Template overrides

You can override templates via CLI options or root `package.json`:

```json
{
  "releaseTemplates": {
    "changelogTemplate": "templates/changelog.hbs",
    "releaseCommitTemplate": "templates/release-commit-msg.hbs"
  }
}
```

Built-in templates:

- `templates/changelog.hbs`
- `templates/release-commit-msg.hbs`
- `templates/github-release-notes.hbs`

## GitHub Releases

GitHub release creation runs only when all conditions are met:

- `GITHUB_ACTIONS=true`
- `GITHUB_REPOSITORY` is set (for example `owner/repo`)
- `GITHUB_TOKEN` is set
- `gh` CLI is available
- not `--dry-run`
- not `--no-push`

Each released package creates a release:

- tag: `<package-name>@<version>`
- title: `<package-name> v<version>`
- notes rendered from `templates/github-release-notes.hbs`

## Plugin architecture

Release lifecycle is implemented by plugins:

- `PackageJsonPlugin`: updates internal dependency versions in `package.json`
- `ChangelogPlugin`: writes per-package changelog updates
- `GitPlugin`: creates release commit, tags, and push
- `GithubPlugin`: creates GitHub Releases
- `NpmPlugin`: bumps package version and publishes

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
- In `--dry-run`, no files/git/releases/publish actions are performed.
