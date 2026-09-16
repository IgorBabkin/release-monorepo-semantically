import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NodeFileSystemService } from './NodeFileSystemService.js';
import { InvalidPackageJsonException, InvalidRootPackageJsonException, MissingPackageJsonException } from '../exceptions/DomainException.js';

describe('NodeFileSystemService', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('given file content when read and write methods are used then values are persisted and retrieved', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const sampleFile = path.join(root, 'sample.txt');
    service.writeFile(sampleFile, 'hello');

    expect(service.fileExists(sampleFile)).toBe(true);
    expect(service.readFile(sampleFile)).toBe('hello');
  });

  it('given package json path forms when package json methods run then directory and file paths are supported', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const pkgDir = path.join(root, 'pkg-a');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"pkg-a","version":"1.0.0"}\n');

    service.writeToPackageJsonOrFail(pkgDir, { name: 'pkg-a', version: '1.0.1' });

    expect(service.readPackageJsonOrFail(pkgDir)).toEqual({ name: 'pkg-a', version: '1.0.1' });
    expect(service.readPackageJsonOrFail(path.join(pkgDir, 'package.json'))).toEqual({ name: 'pkg-a', version: '1.0.1' });
  });

  it('given workspace globs with duplicate matches when package json files are discovered then unique package directories are returned', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const pkgA = path.join(root, 'packages', 'a');
    const pkgB = path.join(root, 'packages', 'b');
    mkdirSync(pkgA, { recursive: true });
    mkdirSync(pkgB, { recursive: true });
    writeFileSync(path.join(pkgA, 'package.json'), '{"name":"pkg-a","version":"1.0.0"}\n');
    writeFileSync(path.join(pkgB, 'package.json'), '{"name":"pkg-b","version":"1.0.0"}\n');

    const discovered = service.findManyPackageJsonByGlob(['packages/*', 'packages/*/package.json']);

    expect(discovered.map(([pkgPath]) => pkgPath).sort()).toEqual([pkgA, pkgB]);
    expect(discovered.map(([, pkg]) => pkg.name).sort()).toEqual(['pkg-a', 'pkg-b']);
  });

  it('given a package manifest missing required fields when it is read then the failure names them', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const pkgDir = path.join(root, 'pkg-a');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(path.join(pkgDir, 'package.json'), '{"description":"no name, no version"}\n');

    expect(() => service.readPackageJsonOrFail(pkgDir)).toThrow(InvalidPackageJsonException);
    expect(() => service.readPackageJsonOrFail(pkgDir)).toThrow(/name: is required/);
    expect(() => service.readPackageJsonOrFail(pkgDir)).toThrow(/version: /);
  });

  it('given a version that is not major.minor.patch when the manifest is read then it is rejected', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const pkgDir = path.join(root, 'pkg-a');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"pkg-a","version":"1.0.0-beta.1"}\n');

    expect(() => service.readPackageJsonOrFail(pkgDir)).toThrow(/must be a semantic version/);
  });

  it('given malformed json when a manifest is read then the failure names the file', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const pkgDir = path.join(root, 'pkg-a');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(path.join(pkgDir, 'package.json'), '{"name":"pkg-a",\n');

    expect(() => service.readPackageJsonOrFail(pkgDir)).toThrow(/not valid JSON/);
  });

  it('given no manifest at all when one is read then the failure says which one is missing', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    expect(() => service.readPackageJsonOrFail('pkg-a')).toThrow(MissingPackageJsonException);
  });

  it('given a root manifest without workspaces when the root is read then the missing field is reported', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    writeFileSync(path.join(root, 'package.json'), '{"name":"root","private":true}\n');

    expect(() => service.readRootPackageJsonOrFail()).toThrow(InvalidRootPackageJsonException);
    expect(() => service.readRootPackageJsonOrFail()).toThrow(/workspaces: is required/);
  });

  it('given a root manifest with an empty workspaces list when the root is read then it is rejected', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    writeFileSync(path.join(root, 'package.json'), '{"name":"root","workspaces":[]}\n');

    expect(() => service.readRootPackageJsonOrFail()).toThrow(/at least one workspace glob/);
  });

  it('given a valid root manifest when it is read then fields this tool does not model survive', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    writeFileSync(path.join(root, 'package.json'), '{"name":"root","workspaces":["packages/*"],"scripts":{"ci":"pnpm install"}}\n');

    expect(service.readRootPackageJsonOrFail()).toEqual({ name: 'root', workspaces: ['packages/*'], scripts: { ci: 'pnpm install' } });
  });

  it('given a workspace package with an invalid manifest when packages are discovered then the failure names that package', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const pkgA = path.join(root, 'packages', 'a');
    mkdirSync(pkgA, { recursive: true });
    writeFileSync(path.join(pkgA, 'package.json'), '{"name":"pkg-a"}\n');

    expect(() => service.findManyPackageJsonByGlob(['packages/*'])).toThrow(InvalidPackageJsonException);
    expect(() => service.findManyPackageJsonByGlob(['packages/*'])).toThrow(new RegExp(pkgA));
  });

  it('given json file when readJson is called then parsed content is returned', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-fs-service-'));
    tempRoots.push(root);
    const service = new NodeFileSystemService(root);

    const jsonPath = path.join(root, 'config.json');
    writeFileSync(jsonPath, '{"a":1,"b":"ok"}\n');

    expect(service.readJson<{ a: number; b: string }>(jsonPath)).toEqual({ a: 1, b: 'ok' });
    expect(readFileSync(jsonPath, 'utf-8')).toContain('"a":1');
  });
});
