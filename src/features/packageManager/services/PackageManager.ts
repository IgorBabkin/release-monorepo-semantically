import { SingleToken } from 'ts-ioc-container';

export interface PackageManager {
  bumpVersion(cwd: string, version: string): void;
  publish(cwd: string): void;
}

export const PackageManagerKey = new SingleToken<PackageManager>('IPackageManager');
