import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(path.resolve(repoRoot, 'package.json'), 'utf-8')) as {
  name: string;
  bin: Record<string, string>;
};
const packageName = packageJson.name;
const packageBinPath = packageJson.bin['monorepo-semantic-release'];
const realPnpmPath = execSync('command -v pnpm', { encoding: 'utf-8' }).trim();
const tempRoots: string[] = [];

interface ExecResult {
  status: 'passed' | 'failed';
  stdout: string;
  stderr: string;
}

interface PackageFixture {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
}

export interface ReleaseOptions {
  /** Applies --dry-run to every step. */
  dryRun?: boolean;
  /** --template passed to the `vcs` step. */
  releaseCommitTemplate?: string;
  /** --template passed to the `changelog` step. */
  changelogTemplate?: string;
  /** --changelog-name passed to the `changelog` step. */
  changelogName?: string;
  /** Runs `vcs commit` and `vcs tag` but not `vcs push`. Default true. */
  push?: boolean;
  /** Runs `package-manager publish` after `vcs`. Default true. */
  publish?: boolean;
  /** Runs `release-notes` after publish. Default false: needs repo/token. */
  releaseNotes?: boolean;
  /** --template passed to the `release-notes` step. */
  releaseNotesTemplate?: string;
  env?: NodeJS.ProcessEnv;
}

export interface MonorepoFixture {
  remoteDir: string;
  workDir: string;
  run: (cmd: string) => string;
  commit: (message: string, packageName: string) => void;
  tags: () => string[];
  publishedPackages: () => string[];
  githubReleases: () => Array<{
    tagName: string;
    repository: string;
    title: string;
    notes: string;
    prerelease: boolean;
  }>;
  getPackageJson: (packageName: string) => {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    private?: boolean;
  };
  /** Runs a single `monorepo-semantic-release <args...>` invocation. */
  runCli: (args: string[], envOverrides?: NodeJS.ProcessEnv) => ExecResult;
  /** Writes a custom template under the fixture's `templates/` dir, creating it if needed. */
  writeTemplate: (relativePath: string, content: string) => string;
  /**
   * Runs the standard CI pipeline as a sequence of separate CLI invocations
   * (report -> package-json -> package-manager -> changelog -> vcs ->
   * [package-manager publish] -> [release-notes]), mirroring the workflow in
   * SPECS.md's CI Integration story. Stops at the first failing step. stdout
   * and stderr are the concatenation of every step that ran.
   */
  release: (options?: ReleaseOptions) => ExecResult;
}

function runCommand(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): string {
  return execSync(cmd, { cwd, env: { ...process.env, ...env }, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function runCommandCapture(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): ExecResult {
  // execSync only returns stdout on success and discards stderr entirely
  // unless the command fails; spawnSync captures both streams regardless of
  // exit status, which matters now that progress logs go to stderr.
  const result = spawnSync(cmd, { cwd, env: { ...process.env, ...env }, encoding: 'utf-8', shell: true });
  return {
    status: result.status === 0 ? 'passed' : 'failed',
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

export function createMonorepoFixture(packages: PackageFixture[], withRemote = true, includeInitialTags = true): MonorepoFixture {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'monorepo-semrel-e2e-'));
  tempRoots.push(tempRoot);

  const remoteDir = path.join(tempRoot, 'remote.git');
  const fixtureBinDir = path.join(tempRoot, 'bin');
  const publishedPackagesLog = path.join(tempRoot, 'published-packages.log');
  const githubReleasesLog = path.join(tempRoot, 'github-releases.log');
  const workDir = path.join(tempRoot, 'workspace');
  mkdirSync(fixtureBinDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    path.join(fixtureBinDir, 'pnpm'),
    `#!/usr/bin/env node
const { appendFileSync, readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const args = process.argv.slice(2);
if (args[0] === 'publish') {
  const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
  appendFileSync(process.env.MONOREPO_SEMREL_PUBLISH_LOG, \`\${pkg.name}@\${pkg.version}\\n\`);
  process.exit(0);
}

const result = spawnSync(${JSON.stringify(realPnpmPath)}, args, { stdio: 'inherit' });
if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 0);
`,
  );
  chmodSync(path.join(fixtureBinDir, 'pnpm'), 0o755);
  writeFileSync(
    path.join(fixtureBinDir, 'gh'),
    `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');

const args = process.argv.slice(2);
if (args[0] === '--version') {
  process.stdout.write('gh version 2.0.0\\n');
  process.exit(0);
}

if (args[0] === 'release' && args[1] === 'create') {
  const tagName = args[2];
  const getArg = (name) => {
    const index = args.indexOf(name);
    if (index === -1 || index + 1 >= args.length) return '';
    return args[index + 1];
  };

  appendFileSync(
    process.env.MONOREPO_SEMREL_GITHUB_RELEASE_LOG,
    JSON.stringify({
      tagName,
      repository: getArg('--repo'),
      title: getArg('--title'),
      notes: getArg('--notes'),
      prerelease: args.includes('--prerelease'),
    }) + '\\n',
  );
  process.exit(0);
}

process.exit(1);
`,
  );
  chmodSync(path.join(fixtureBinDir, 'gh'), 0o755);
  const fixtureEnv = {
    ...process.env,
    PATH: `${fixtureBinDir}:${process.env.PATH ?? ''}`,
    MONOREPO_SEMREL_PUBLISH_LOG: publishedPackagesLog,
    MONOREPO_SEMREL_GITHUB_RELEASE_LOG: githubReleasesLog,
  };

  runCommand(`git init --bare ${JSON.stringify(remoteDir)}`, tempRoot, fixtureEnv);
  runCommand('git init', workDir, fixtureEnv);
  runCommand('git config user.name "E2E Bot"', workDir, fixtureEnv);
  runCommand('git config user.email "e2e@example.com"', workDir, fixtureEnv);

  mkdirSync(path.join(workDir, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(repoRoot, path.join(workDir, 'node_modules', packageName), 'dir');
  const binPath = path.join(workDir, 'node_modules', '.bin', 'monorepo-semantic-release');
  writeFileSync(binPath, `#!/usr/bin/env node\nimport(${JSON.stringify(`../${packageName}/${packageBinPath}`)});\n`);
  chmodSync(binPath, 0o755);

  const rootPackageJson = {
    name: 'fixture-root',
    private: true,
    version: '1.0.0',
    workspaces: ['packages/*/package.json'],
  };
  writeFileSync(path.join(workDir, 'package.json'), `${JSON.stringify(rootPackageJson, null, 2)}\n`);

  for (const pkg of packages) {
    const packagePath = path.join(workDir, 'packages', pkg.name);
    mkdirSync(packagePath, { recursive: true });

    const packageJsonContent = {
      name: pkg.name,
      version: pkg.version,
      ...(pkg.private ? { private: true } : {}),
      ...(pkg.dependencies ? { dependencies: pkg.dependencies } : {}),
    };
    writeFileSync(path.join(packagePath, 'package.json'), `${JSON.stringify(packageJsonContent, null, 2)}\n`);
    writeFileSync(path.join(packagePath, 'README.md'), 'initial\n');
  }

  runCommand('git add .', workDir, fixtureEnv);
  runCommand('git commit -m "chore: initial fixture"', workDir, fixtureEnv);

  if (includeInitialTags) {
    for (const pkg of packages) {
      runCommand(`git tag ${pkg.name}@${pkg.version}`, workDir, fixtureEnv);
    }
  }

  if (withRemote) {
    runCommand(`git remote add origin ${JSON.stringify(remoteDir)}`, workDir, fixtureEnv);
    runCommand('git push -u origin HEAD', workDir, fixtureEnv);
    runCommand('git push --tags', workDir, fixtureEnv);
  }

  function runCli(args: string[], envOverrides?: NodeJS.ProcessEnv): ExecResult {
    const releaseEnv = { ...fixtureEnv, ...envOverrides };
    const commandArgs = args.map((argument) => JSON.stringify(argument)).join(' ');
    return runCommandCapture(`./node_modules/.bin/monorepo-semantic-release ${commandArgs}`, workDir, releaseEnv);
  }

  function release(options: ReleaseOptions = {}): ExecResult {
    const flags = options.dryRun ? ['--dry-run'] : [];
    let stdout = '';
    let stderr = '';

    const runStep = (args: string[]): ExecResult | undefined => {
      const result = runCli(args, options.env);
      stdout += (stdout ? '\n' : '') + result.stdout;
      stderr += (stderr ? '\n' : '') + result.stderr;
      return result.status === 'passed' ? undefined : { status: 'failed', stdout, stderr };
    };

    const reportResult = runCli(['report', ...flags], options.env);
    stdout += reportResult.stdout;
    stderr += reportResult.stderr;
    if (reportResult.status !== 'passed') {
      return { status: 'failed', stdout, stderr };
    }
    const context = reportResult.stdout;

    const failure =
      runStep(['package-json', '--context', context, ...flags]) ??
      runStep(['package-manager', '--context', context, ...flags]) ??
      runStep(['changelog', '--context', context, ...changelogFlags(options), ...flags]) ??
      (options.push === false
        ? (runStep(['vcs', 'commit', '--context', context, ...vcsFlags(options), ...flags]) ?? runStep(['vcs', 'tag', '--context', context, ...flags]))
        : runStep(['vcs', '--context', context, ...vcsFlags(options), ...flags])) ??
      (options.publish === false ? undefined : runStep(['package-manager', 'publish', '--context', context, ...flags])) ??
      (options.releaseNotes ? runStep(['release-notes', '--context', context, ...releaseNotesFlags(options), ...flags]) : undefined);

    return failure ?? { status: 'passed', stdout, stderr };
  }

  return {
    remoteDir,
    workDir,
    run(cmd: string): string {
      return runCommand(cmd, workDir, fixtureEnv);
    },
    commit(message: string, packageName: string): void {
      const packagePath = path.join(workDir, 'packages', packageName);
      const marker = path.join(packagePath, `${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
      writeFileSync(marker, `${message}\n`);
      runCommand('git add .', workDir, fixtureEnv);
      runCommand(`git commit -m ${JSON.stringify(message)}`, workDir, fixtureEnv);
    },
    tags(): string[] {
      const tagOutput = runCommand('git tag --list', workDir, fixtureEnv);
      return tagOutput ? tagOutput.split('\n').filter(Boolean) : [];
    },
    publishedPackages(): string[] {
      const output = runCommandCapture(`cat ${JSON.stringify(publishedPackagesLog)}`, workDir, fixtureEnv);
      return output.status === 'passed' && output.stdout ? output.stdout.split('\n').filter(Boolean) : [];
    },
    githubReleases() {
      const output = runCommandCapture(`cat ${JSON.stringify(githubReleasesLog)}`, workDir, fixtureEnv);
      if (output.status !== 'passed' || !output.stdout) {
        return [];
      }

      return output.stdout
        .split('\n')
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as {
              tagName: string;
              repository: string;
              title: string;
              notes: string;
              prerelease: boolean;
            },
        );
    },
    getPackageJson(packageName: string) {
      return JSON.parse(readFileSync(path.join(workDir, 'packages', packageName, 'package.json'), 'utf-8')) as {
        name: string;
        version: string;
        dependencies?: Record<string, string>;
        private?: boolean;
      };
    },
    writeTemplate(relativePath: string, content: string): string {
      const templatePath = path.join(workDir, relativePath);
      mkdirSync(path.dirname(templatePath), { recursive: true });
      writeFileSync(templatePath, content);
      return templatePath;
    },
    runCli,
    release,
  };
}

function changelogFlags(options: ReleaseOptions): string[] {
  const flags: string[] = [];
  if (options.changelogTemplate) flags.push('--template', options.changelogTemplate);
  if (options.changelogName) flags.push('--changelog-name', options.changelogName);
  return flags;
}

function vcsFlags(options: ReleaseOptions): string[] {
  return options.releaseCommitTemplate ? ['--template', options.releaseCommitTemplate] : [];
}

function releaseNotesFlags(options: ReleaseOptions): string[] {
  return options.releaseNotesTemplate ? ['--template', options.releaseNotesTemplate] : [];
}

export function disposeMonorepoFixtures(): void {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
}

export function readFixtureCommand(workDir: string, cmd: string): string {
  return runCommand(cmd, workDir);
}

export function runFixtureCommandCapture(workDir: string, cmd: string): ExecResult {
  return runCommandCapture(cmd, workDir);
}
