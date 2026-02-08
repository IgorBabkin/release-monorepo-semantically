import { DependencyUpdate } from './DependencyUpdate';
import { PackageJSON } from './PackageJSON';

export class NpmPackage {
  static createFromPackage(pkgJson: PackageJSON, pkgPath: string): NpmPackage {
    return new NpmPackage(
      pkgJson.name,
      pkgPath,
      pkgJson.version,
      pkgJson.private ?? false,
      pkgJson.dependencies ?? {},
      pkgJson.devDependencies ?? {},
    );
  }

  constructor(
    readonly name: string,
    readonly path: string,
    readonly version: string,
    readonly isPrivate: boolean,
    readonly dependencies: Record<string, string>,
    readonly devDependencies: Record<string, string>,
  ) {}

  getInternalDependencies(packageNames: Set<string>): string[] {
    return Object.keys(this.dependencies).filter((d) => packageNames.has(d));
  }

  getOutdatedDependencies(releasedVersions: Map<string, string>): DependencyUpdate[] {
    const updates: DependencyUpdate[] = [];

    for (const [depName, depVersion] of Object.entries(this.dependencies)) {
      const newVersion = releasedVersions.get(depName);
      if (newVersion && newVersion !== depVersion) {
        updates.push({ packageName: depName, oldVersion: depVersion, newVersion });
      }
    }

    return updates;
  }
}
