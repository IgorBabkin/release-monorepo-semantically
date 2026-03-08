import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';
import { PackageJSON } from '../models/PackageJSON';
import path from 'node:path';
import { isPresent, uniqBy } from '../utils/utils';

export class NodeFileSystemService {
  readJson<T = unknown>(filePath: string): T {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  writeToPackageJsonOrFail(dirname: string, data: unknown): void {
    writeFileSync(this.resolvePackageJsonPath(dirname), JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  readFile(filePath: string): string {
    return readFileSync(filePath, 'utf-8');
  }

  writeFile(filePath: string, content: string): void {
    writeFileSync(filePath, content, 'utf-8');
  }

  fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  findManyPackageJsonByGlob(patterns: string[], cwd: string): [string, PackageJSON][] {
    return uniqBy(
      patterns
        .flatMap((pattern) => globSync(pattern, { cwd, absolute: true }))
        .map((entryPath) => this.resolveWorkspacePackageJsonPath(entryPath))
        .filter<string>(isPresent)
        .map((pkgPath) => {
          const content = readFileSync(pkgPath, 'utf-8');
          return [path.dirname(pkgPath), JSON.parse(content)];
        }),
      (a, b) => a[0] === b[0],
    );
  }

  readPackageJsonOrFail(pkgPath: string): PackageJSON {
    const content = readFileSync(this.resolvePackageJsonPath(pkgPath), 'utf-8');
    return JSON.parse(content);
  }

  private resolvePackageJsonPath(inputPath: string): string {
    return path.basename(inputPath) === 'package.json' ? inputPath : path.resolve(inputPath, 'package.json');
  }

  private resolveWorkspacePackageJsonPath(entryPath: string): string | undefined {
    const packageJsonPath = path.basename(entryPath) === 'package.json' ? entryPath : path.resolve(entryPath, 'package.json');
    return existsSync(packageJsonPath) ? packageJsonPath : undefined;
  }
}
