import 'reflect-metadata';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';
import { formatValidationIssues, PACKAGE_JSON_SCHEMA, PackageJSON, ROOT_PACKAGE_JSON_SCHEMA, RootPackageJSON } from '../domain/PackageJSON.js';
import { InvalidPackageJsonException, InvalidRootPackageJsonException, MissingPackageJsonException } from '../exceptions/DomainException.js';
import { z } from 'zod';
import path from 'node:path';
import { isPresent, uniqBy } from '../utils/utils.js';
import { inject, register, SingleToken } from 'ts-ioc-container';
import { globalConfig } from '../domain/GlobalConfig.js';

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
   * Reads a released package's manifest and validates the fields a release
   * depends on.
   * @param pkgPath Must be relative to cwd
   */
  readPackageJsonOrFail(pkgPath: string): PackageJSON;
  /**
   * Reads the workspace root manifest and validates that it declares the
   * `workspaces` globs the packages are discovered through.
   */
  readRootPackageJsonOrFail(): RootPackageJSON;
}
export const IFileSystemServiceKey = new SingleToken<IFileSystemService>('IFileSystemService');

@register(IFileSystemServiceKey)
export class NodeFileSystemService implements IFileSystemService {
  constructor(@inject(globalConfig('cwd')) private readonly cwd: string) {}

  readJson<T = unknown>(filePath: string, options?: { cwd?: string }): T {
    const absolutePath = this.resolveAbsolutePath(filePath, options);
    const content = readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  }

  writeToPackageJsonOrFail(dirname: string, data: unknown, options?: { cwd?: string }): void {
    const absolutePath = this.resolvePackageJsonPath(this.resolveAbsolutePath(dirname, options));
    const jsonContent = JSON.stringify(data, null, 2);
    writeFileSync(absolutePath, jsonContent + '\n', 'utf-8');
  }

  readFile(filePath: string, options?: { cwd?: string }): string {
    const absolutePath = this.resolveAbsolutePath(filePath, options);
    return readFileSync(absolutePath, 'utf-8');
  }

  writeFile(filePath: string, content: string, options?: { cwd?: string }): void {
    writeFileSync(this.resolveAbsolutePath(filePath, options), content, 'utf-8');
  }

  fileExists(filePath: string, options?: { cwd?: string }): boolean {
    return existsSync(this.resolveAbsolutePath(filePath, options));
  }

  findManyPackageJsonByGlob(patterns: string[], options?: { cwd?: string }): [string, PackageJSON][] {
    return uniqBy(
      patterns
        .flatMap((pattern) => globSync(pattern, { cwd: options?.cwd ?? this.cwd, absolute: true }))
        .map((entryPath) => {
          const packageJsonPath = this.resolvePackageJsonPath(this.resolveAbsolutePath(entryPath, options));
          return existsSync(packageJsonPath) ? packageJsonPath : undefined;
        })
        .filter<string>(isPresent)
        .map((pkgPath) => [path.dirname(pkgPath), this.parsePackageJson(pkgPath, PACKAGE_JSON_SCHEMA, InvalidPackageJsonException)]),
      (a, b) => a[0] === b[0],
    );
  }

  readPackageJsonOrFail(pkgPath: string, options?: { cwd?: string }): PackageJSON {
    const absolutePath = this.resolvePackageJsonPath(this.resolveAbsolutePath(pkgPath, options));
    return this.parsePackageJson(absolutePath, PACKAGE_JSON_SCHEMA, InvalidPackageJsonException);
  }

  readRootPackageJsonOrFail(options?: { cwd?: string }): RootPackageJSON {
    const absolutePath = this.resolvePackageJsonPath(this.resolveAbsolutePath('./', options));
    return this.parsePackageJson<RootPackageJSON>(absolutePath, ROOT_PACKAGE_JSON_SCHEMA, InvalidRootPackageJsonException);
  }

  /**
   * Validates without remapping: the object handed back is the one
   * `JSON.parse` produced, so a manifest written back afterwards keeps its
   * field order and the fields no schema here models.
   */
  private parsePackageJson<T extends PackageJSON>(absolutePath: string, schema: z.ZodType, Exception: new (filePath: string, reason: string) => Error): T {
    if (!existsSync(absolutePath)) {
      throw new MissingPackageJsonException(absolutePath);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(absolutePath, 'utf-8'));
    } catch (error) {
      throw new Exception(absolutePath, `not valid JSON (${(error as Error).message})`);
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Exception(absolutePath, formatValidationIssues(result.error));
    }

    return parsed as T;
  }

  private resolveAbsolutePath(paths: string, options: { cwd?: string } = {}) {
    return path.resolve(options.cwd ?? this.cwd, paths);
  }

  private resolvePackageJsonPath(absolutePath: string): string {
    return path.basename(absolutePath) === 'package.json' ? absolutePath : path.resolve(absolutePath, 'package.json');
  }
}
