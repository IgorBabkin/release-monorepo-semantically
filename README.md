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
  --dry-run                        Preview changes without mutating files/vcs/publish
  --no-push                        Skip vcs push
  --no-publish                     Skip packageManager publish
  --changelog-template <path>      Override changelog template
  --release-commit-template <path> Override release commit template
  -h, --help                       Show help
```

## Template overrides

You can override templates via CLI options, a root `package.json` section, or `.semantic-release.json`.

`package.json`:

```json
{
  "release": {
    "releaseTemplates": {
      "changelogTemplate": "templates/changelog.hbs",
      "releaseCommitTemplate": "templates/release-commit-msg.hbs"
    }
  }
}
```

`.semantic-release.json`:

```json
{
  "releaseTemplates": {
    "changelogTemplate": "templates/changelog.hbs",
    "releaseCommitTemplate": "templates/release-commit-msg.hbs"
  }
}
```

Precedence (highest to lowest): CLI flags, `.semantic-release.json`, `package.json` config, built-in defaults.

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
- `PackageManagerPlugin`: bumps package version and publishes

## Plugin selection and order

You can choose which plugins run and in what order with `plugins`.

`package.json`:

```json
{
  "release": {
    "plugins": [
      { "name": "package-json" },
      { "name": "changelog", "template": "templates/changelog.hbs", "changelogName": "CHANGELOG.md" },
      { "name": "vcs", "template": "templates/release-commit-msg.hbs" },
      { "name": "releaseNotes", "template": "templates/releaseNotes-release-notes.hbs" },
      { "name": "packageManager" }
    ]
  }
}
```

`.semantic-release.json`:

```json
{
  "plugins": [
    { "name": "package-json" },
    { "name": "changelog", "template": "templates/changelog.hbs", "changelogName": "CHANGELOG.md" },
    { "name": "vcs", "template": "templates/release-commit-msg.hbs" },
    { "name": "releaseNotes", "template": "templates/releaseNotes-release-notes.hbs" },
    { "name": "packageManager" }
  ]
}
```

Default order: `["package-json", "changelog", "git", "github", "npm"]`.
For `changelog`, `git`, and `github` plugins, `template` is required.  
For `changelog`, `changelogName` is optional and defaults to `CHANGELOG.md`.

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
