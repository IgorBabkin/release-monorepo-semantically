import 'reflect-metadata';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';
import { PackageJSON } from '../models/PackageJSON';
import path from 'node:path';
import { isPresent, uniqBy } from '../utils/utils';
import { bindTo, inject, register, SingleToken } from 'ts-ioc-container';
import { globalConfig } from '../models/GlobalConfig';

/**
 * @description Works relative to cwd
 */
export interface IFileSystemService {
  /**
   * @param filePath Must be relative to cwd
   */
  readJson<T = unknown>(filePath: string): T;

  /**
   * @param dirname Must be relative to cwd
   * @param data
   */
  writeToPackageJsonOrFail(dirname: string, data: unknown): void;
  /**
   * @param filePath Must be relative to cwd
   */
  readFile(filePath: string): string;
  /**
   * @param filePath Must be relative to cwd
   */
  writeFile(filePath: string, content: string): void;
  /**
   * @param filePath Must be relative to cwd
   */
  fileExists(filePath: string): boolean;
  /**
   * @param patterns Must be relative to cwd
   */
  findManyPackageJsonByGlob(patterns: string[]): [string, PackageJSON][];
  /**
   * @param pkgPath Must be relative to cwd
   */
  readPackageJsonOrFail(pkgPath: string): PackageJSON;
}
export const IFileSystemServiceKey = new SingleToken<IFileSystemService>('IFileSystemService');

@register(bindTo(IFileSystemServiceKey))
export class NodeFileSystemService implements IFileSystemService {
  constructor(@inject(globalConfig('cwd')) private readonly cwd: string) {}

  readJson<T = unknown>(filePath: string, options?: {cwd?: string}): T {
    const absolutePath = this.resolveAbsolutePath(filePath, options);
    const content = readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  }

  writeToPackageJsonOrFail(dirname: string, data: unknown, options?: {cwd?: string}): void {
    const absolutePath = this.resolvePackageJsonPath(this.resolveAbsolutePath(dirname, options));
    const jsonContent = JSON.stringify(data, null, 2);
    writeFileSync(absolutePath, jsonContent + '\n', 'utf-8');
  }

  readFile(filePath: string, options?: {cwd?: string}): string {
    const absolutePath = this.resolveAbsolutePath(filePath, options);
    return readFileSync(absolutePath, 'utf-8');
  }

  writeFile(filePath: string, content: string, options?: {cwd?: string}): void {
    writeFileSync(this.resolveAbsolutePath(filePath, options), content, 'utf-8');
  }

  fileExists(filePath: string, options?: {cwd?: string}): boolean {
    return existsSync(this.resolveAbsolutePath(filePath, options));
  }

  findManyPackageJsonByGlob(patterns: string[], options?: {cwd?: string}): [string, PackageJSON][] {
    return uniqBy(
      patterns
        .flatMap((pattern) => globSync(pattern, { cwd: options?.cwd ?? this.cwd, absolute: true }))
        .map((entryPath) => {
          const packageJsonPath = this.resolvePackageJsonPath(this.resolveAbsolutePath(entryPath, options));
          return existsSync(packageJsonPath) ? packageJsonPath : undefined;
        })
        .filter<string>(isPresent)
        .map((pkgPath) => {
          const content = readFileSync(pkgPath, 'utf-8');
          return [path.dirname(pkgPath), JSON.parse(content)];
        }),
      (a, b) => a[0] === b[0],
    );
  }

  readPackageJsonOrFail(pkgPath: string, options?: {cwd?: string}): PackageJSON {
    const absolutePath = this.resolvePackageJsonPath(this.resolveAbsolutePath(pkgPath, options));
    const content = readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  }

  private resolveAbsolutePath(paths: string, options: {cwd?: string} = {}) {
    return path.resolve(options.cwd ?? this.cwd, paths);
  }

  private resolvePackageJsonPath(absolutePath: string): string {
    return path.basename(absolutePath) === 'package.json' ? absolutePath : path.resolve(absolutePath, 'package.json');
  }
}
