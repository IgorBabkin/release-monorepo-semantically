---
description: Check every GitHub Actions pin in .github/ against the latest release, read the release notes for breaking changes, and bump them
argument-hint: '[owner/action ...] (optional — defaults to every action found)'
allowed-tools: Bash(gh api:*), Bash(grep:*), Bash(sed:*), Bash(git diff:*), Bash(cat:*), Read, Edit
---

Update the GitHub Actions version pins in this repo. If `$ARGUMENTS` names
specific actions, limit the work to those; otherwise check them all.

Only bump after confirming the release notes contain nothing that breaks this
repo's usage.

## 1. Collect the pins

```bash
grep -rhn "uses:" .github/ | grep -v "uses: \./" | sed 's/.*uses: //' | sort -u
```

Local composite actions (`uses: ./...`) have no version and are skipped.

## 2. Look up the latest release for each

```bash
for repo in <owner/repo list>; do
  echo -n "$repo: "
  gh api "repos/$repo/releases/latest" --jq '.tag_name' 2>/dev/null || echo "ERR"
done
```

If `releases/latest` 404s (some actions only tag), fall back to
`gh api "repos/$repo/tags" --jq '.[0].name'`.

## 3. Read release notes for every major version being crossed

Do not skip this — a jump like `v4 → v8` crosses several majors, and each one
may change a default.

```bash
gh api "repos/$repo/releases?per_page=20" \
  --jq '.[] | select(.tag_name | test("^v[0-9]+\\.0\\.0$|^v[0-9]+$")) | "--- \(.tag_name) ---\n\(.body)"'
```

For each breaking change, decide whether this repo is actually affected. Check
the repo's own facts before assuming:

- `.nvmrc` and `package.json` `engines` — Node version requirements.
- `package.json` `packageManager` — pnpm/yarn major supported by the setup action.
- Whether the workflow uses the specific input or trigger that changed
  (e.g. `pull_request_target`, auto-caching, digest checks).

GitHub-hosted runners always satisfy the "minimum runner version" notes; only
flag those if the repo uses self-hosted runners (`runs-on:` names something
other than `ubuntu-*`/`windows-*`/`macos-*`).

## 4. Apply the bumps

```bash
sed -i '' -e 's|owner/action@vOLD|owner/action@vNEW|g' <files>
```

Note the BSD `sed -i ''` form — this repo is on macOS.

## 5. Verify

```bash
grep -rn "uses:" .github/
git diff .github/
```

Confirm every pin moved and nothing else in the files changed.

## Constraint to preserve

`pnpm/action-setup` must stay **before** `actions/setup-node` whenever
`setup-node` has `cache: 'pnpm'`, since the cache step needs pnpm on PATH.
Never reorder steps while bumping.

## Report

Per action: old → new, and the one behavioural change that mattered (or "no
change affecting us"). If an upgrade requires a workflow edit — a renamed
input, a changed default this repo relies on — make that edit alongside the
bump and call it out, rather than bumping blind.
