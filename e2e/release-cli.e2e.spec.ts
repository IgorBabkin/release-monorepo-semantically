import { chmodSync, cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(thisFile), "..");
const templatesDir = path.resolve(repoRoot, "templates");
const tempRoots: string[] = [];
const packageName = "release-monorepo-semantically";

function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: "pipe" }).trim();
}

describe("release CLI e2e", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("runs release workflow in a disposable monorepo and pushes commit to origin", () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "monorepo-semrel-e2e-"));
    tempRoots.push(tempRoot);

    const remoteDir = path.join(tempRoot, "remote.git");
    const workDir = path.join(tempRoot, "workspace");
    mkdirSync(workDir);

    run(`git init --bare ${JSON.stringify(remoteDir)}`, tempRoot);
    run("git init", workDir);
    run('git config user.name "E2E Bot"', workDir);
    run('git config user.email "e2e@example.com"', workDir);

    cpSync(templatesDir, path.join(workDir, "templates"), { recursive: true });
    mkdirSync(path.join(workDir, "packages", "pkg-a"), { recursive: true });
    mkdirSync(path.join(workDir, "node_modules", ".bin"), { recursive: true });
    symlinkSync(repoRoot, path.join(workDir, "node_modules", packageName), "dir");
    const binPath = path.join(workDir, "node_modules", ".bin", "monorepo-semantic-release");
    writeFileSync(binPath, `#!/usr/bin/env node\nrequire("../${packageName}/dist/bin/release.js");\n`);
    chmodSync(binPath, 0o755);

    writeFileSync(
      path.join(workDir, "package.json"),
      JSON.stringify(
        {
          name: "fixture-root",
          private: true,
          version: "1.0.0",
          workspaces: ["packages/*/package.json"],
        },
        null,
        2,
      ) + "\n",
    );

    writeFileSync(
      path.join(workDir, "packages", "pkg-a", "package.json"),
      JSON.stringify(
        {
          name: "pkg-a",
          version: "1.0.0",
        },
        null,
        2,
      ) + "\n",
    );
    writeFileSync(path.join(workDir, "packages", "pkg-a", "README.md"), "initial\n");

    run("git add .", workDir);
    run('git commit -m "chore: initial fixture"', workDir);
    run("git tag pkg-a@1.0.0", workDir);
    run(`git remote add origin ${JSON.stringify(remoteDir)}`, workDir);
    run("git push -u origin HEAD", workDir);
    run("git push --tags", workDir);

    writeFileSync(path.join(workDir, "packages", "pkg-a", "README.md"), "changed\n");
    run("git add .", workDir);
    run('git commit -m "fix(pkg-a): exercise release flow"', workDir);

    run("./node_modules/.bin/monorepo-semantic-release", workDir);

    const latestSubject = run("git log -1 --pretty=%s", workDir);
    const branch = run("git branch --show-current", workDir);
    const remoteHead = run(`git --git-dir=${JSON.stringify(remoteDir)} rev-parse refs/heads/${branch}`, workDir);
    const localHead = run("git rev-parse HEAD", workDir);
    const pkgJson = JSON.parse(readFileSync(path.join(workDir, "packages", "pkg-a", "package.json"), "utf-8")) as {
      version: string;
    };

    expect(latestSubject).toBe("release: semantic");
    expect(remoteHead).toBe(localHead);
    expect(typeof pkgJson.version).toBe("string");
  });
});
