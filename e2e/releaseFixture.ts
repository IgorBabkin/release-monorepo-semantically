import { chmodSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const templatesDir = path.resolve(repoRoot, 'templates');
const packageName = 'release-monorepo-semantically';
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
  getPackageJson: (packageName: string) => {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    private?: boolean;
  };
  release: (options?: string | string[]) => ExecResult;
}

function runCommand(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function runCommandCapture(cmd: string, cwd: string): ExecResult {
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
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

  const remoteDir = path.join(tempRoot, 'remote.git');
  const workDir = path.join(tempRoot, 'workspace');
  mkdirSync(workDir, { recursive: true });

  runCommand(`git init --bare ${JSON.stringify(remoteDir)}`, tempRoot);
  runCommand('git init', workDir);
  runCommand('git config user.name "E2E Bot"', workDir);
  runCommand('git config user.email "e2e@example.com"', workDir);

  cpSync(templatesDir, path.join(workDir, 'templates'), { recursive: true });
  mkdirSync(path.join(workDir, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(repoRoot, path.join(workDir, 'node_modules', packageName), 'dir');
  const binPath = path.join(workDir, 'node_modules', '.bin', 'monorepo-semantic-release');
  writeFileSync(binPath, `#!/usr/bin/env node\nrequire("../${packageName}/dist/bin/release.js");\n`);
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

  runCommand('git add .', workDir);
  runCommand('git commit -m "chore: initial fixture"', workDir);

  if (includeInitialTags) {
    for (const pkg of packages) {
      runCommand(`git tag ${pkg.name}@${pkg.version}`, workDir);
    }
  }

  if (withRemote) {
    runCommand(`git remote add origin ${JSON.stringify(remoteDir)}`, workDir);
    runCommand('git push -u origin HEAD', workDir);
    runCommand('git push --tags', workDir);
  }

  return {
    remoteDir,
    workDir,
    run(cmd: string): string {
      return runCommand(cmd, workDir);
    },
    commit(message: string, packageName: string): void {
      const packagePath = path.join(workDir, 'packages', packageName);
      const marker = path.join(packagePath, `${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
      writeFileSync(marker, `${message}\n`);
      runCommand('git add .', workDir);
      runCommand(`git commit -m ${JSON.stringify(message)}`, workDir);
    },
    tags(): string[] {
      const tagOutput = runCommand('git tag --list', workDir);
      return tagOutput ? tagOutput.split('\n').filter(Boolean) : [];
    },
    getPackageJson(packageName: string) {
      return JSON.parse(readFileSync(path.join(workDir, 'packages', packageName, 'package.json'), 'utf-8')) as {
        name: string;
        version: string;
        dependencies?: Record<string, string>;
        private?: boolean;
      };
    },
    release(options?: string | string[]) {
      if (!options) {
        return runCommandCapture('./node_modules/.bin/monorepo-semantic-release', workDir);
      }

      const commandArgs = Array.isArray(options) ? options.map((argument) => JSON.stringify(argument)).join(' ') : JSON.stringify(options);
      return runCommandCapture(`./node_modules/.bin/monorepo-semantic-release ${commandArgs}`, workDir);
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
