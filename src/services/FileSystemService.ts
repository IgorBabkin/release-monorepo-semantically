import {SingleToken} from "ts-ioc-container";

export interface FileSystemService {
  readJson(filePath: string): unknown;
  writeJson(filePath: string, data: unknown): void;
  readFile(filePath: string): string;
  writeFile(filePath: string, content: string): void;
  fileExists(filePath: string): boolean;
  findPackages(rootPath: string): string[];
}

export const FileSystemServiceKey = new SingleToken<FileSystemService>('FileSystemService');
