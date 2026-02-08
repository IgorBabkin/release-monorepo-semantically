import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';
import { FileSystemService } from './FileSystemService';
import {bindTo, register} from "ts-ioc-container";
import { FileSystemServiceKey } from './FileSystemService';

@register(bindTo(FileSystemServiceKey))
export class NodeFileSystemService implements FileSystemService {
  readJson<T = unknown>(filePath: string): T {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  writeJson(filePath: string, data: unknown): void {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
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

  findPackages(rootPath: string): string[] {
    const rootPkgJson = this.readJson<{ workspaces?: string[] }>(join(rootPath, 'package.json'));
    const patterns = rootPkgJson.workspaces ?? [];

    return patterns.flatMap((pattern) => globSync(pattern, { cwd: rootPath, absolute: true }));
  }
}
