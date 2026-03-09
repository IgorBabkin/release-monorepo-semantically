import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NodeFileSystemService } from './NodeFileSystemService';

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
