import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';
import { FileSystemService } from './FileSystemService';

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

  findManyByGlob(patterns: string[], cwd = process.cwd()): string[] {
    return patterns.flatMap((pattern) => globSync(pattern, { cwd, absolute: true }));
  }
}
