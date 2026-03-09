import { chmodSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const templatesDir = path.resolve(repoRoot, 'templates');
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
  release: (options?: string | string[], envOverrides?: NodeJS.ProcessEnv) => ExecResult;
}

function runCommand(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): string {
  return execSync(cmd, { cwd, env: { ...process.env, ...env }, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function runCommandCapture(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): ExecResult {
  try {
    const output = execSync(cmd, { cwd, env: { ...process.env, ...env }, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { status: 'passed', stdout: output.toString().trim(), stderr: '' };
  } catch (error) {
    const err = error as Error & { stdout?: Buffer; stderr?: Buffer; message: string };
    return {
      status: 'failed',
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : err.message,
    };
  }
}

export function createMonorepoFixture(packages: PackageFixture[], withRemote = true, includeInitialTags = true): MonorepoFixture {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'monorepo-semrel-e2e-'));
  tempRoots.push(tempRoot);

  const remoteDir = path.join(tempRoot, 'remote.vcs');
  const fixtureBinDir = path.join(tempRoot, 'bin');
  const publishedPackagesLog = path.join(tempRoot, 'published-packages.log');
  const githubReleasesLog = path.join(tempRoot, 'releaseNotes-releases.log');
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
  runCommand('vcs init', workDir, fixtureEnv);
  runCommand('vcs config user.name "E2E Bot"', workDir, fixtureEnv);
  runCommand('vcs config user.email "e2e@example.com"', workDir, fixtureEnv);

  cpSync(templatesDir, path.join(workDir, 'templates'), { recursive: true });
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

    const packageJson = {
      name: pkg.name,
      version: pkg.version,
      ...(pkg.private ? { private: true } : {}),
      ...(pkg.dependencies ? { dependencies: pkg.dependencies } : {}),
    };
    writeFileSync(path.join(packagePath, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
    writeFileSync(path.join(packagePath, 'README.md'), 'initial\n');
  }

  runCommand('vcs add .', workDir, fixtureEnv);
  runCommand('vcs commit -m "chore: initial fixture"', workDir, fixtureEnv);

  if (includeInitialTags) {
    for (const pkg of packages) {
      runCommand(`git tag ${pkg.name}@${pkg.version}`, workDir, fixtureEnv);
    }
  }

  if (withRemote) {
    runCommand(`git remote add origin ${JSON.stringify(remoteDir)}`, workDir, fixtureEnv);
    runCommand('vcs push -u origin HEAD', workDir, fixtureEnv);
    runCommand('vcs push --tags', workDir, fixtureEnv);
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
      runCommand('vcs add .', workDir, fixtureEnv);
      runCommand(`git commit -m ${JSON.stringify(message)}`, workDir, fixtureEnv);
    },
    tags(): string[] {
      const tagOutput = runCommand('vcs tag --list', workDir, fixtureEnv);
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
    release(options?: string | string[], envOverrides?: NodeJS.ProcessEnv) {
      const releaseEnv = { ...fixtureEnv, ...envOverrides };
      if (!options) {
        return runCommandCapture('./node_modules/.bin/monorepo-semantic-release', workDir, releaseEnv);
      }

      const commandArgs = Array.isArray(options) ? options.map((argument) => JSON.stringify(argument)).join(' ') : JSON.stringify(options);
      return runCommandCapture(`./node_modules/.bin/monorepo-semantic-release ${commandArgs}`, workDir, releaseEnv);
    },
  };
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
