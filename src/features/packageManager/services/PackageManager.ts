import { SingleToken } from 'ts-ioc-container';

export interface PackageManager {
  /** Lockfile this package manager maintains, relative to the workspace root. */
  readonly lockfileName: string;
  bumpVersion(cwd: string, version: string): void;
  /**
   * Reconciles the lockfile with the manifests on disk. Resolution only — it
   * must not touch `node_modules`, since a release step runs against an
   * already-installed workspace.
   */
  refreshLockfile(cwd: string): void;
  publish(cwd: string): void;
}

export const PackageManagerKey = new SingleToken<PackageManager>('IPackageManager');
