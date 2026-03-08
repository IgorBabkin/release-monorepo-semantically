import { PackageJSON } from './PackageJSON';
import { Sortable } from '../sortLessDependenciesFirst';
import { DependencyVersionChange } from './ReleaseTypes';
import { SemVerBumpType } from './SemVerBumpType';

export class NpmPackage implements Sortable {
  static createFromPackage(pkgJson: PackageJSON, pkgPath: string): NpmPackage {
    return new NpmPackage(pkgJson.name, pkgPath, pkgJson.version, pkgJson.private ?? false, pkgJson.dependencies ?? {}, pkgJson.devDependencies ?? {});
  }

  constructor(
    readonly name: string,
    readonly dirname: string,
    readonly version: string,
    readonly isPrivate: boolean,
    readonly dependencies: Record<string, string>,
    readonly devDependencies: Record<string, string>,
  ) {}

  filterDependencies(packageNames: Set<string>): string[] {
    return Object.keys({ ...this.dependencies, ...this.devDependencies }).filter((d) => packageNames.has(d));
  }

  hasDependency(depPkgName: string) {
    return Object.keys(this.dependencies).includes(depPkgName);
  }

  getCommitTag(): string {
    return `${this.name}@${this.version}`;
  }

  private findDependencyVersionByNameOrFail(depName: string): string {}

  private hasOutdatedDependency(depName: string, newVersion: string): boolean {
    return false;
  }

  getDependencyUpdates(releasedVersions: Map<string, string>): DependencyVersionChange[] {
    const changes: DependencyVersionChange[] = [];

    for (const [depName, newVersion] of releasedVersions) {
      if (this.hasOutdatedDependency(depName, newVersion)) {
        changes.push({
          packageName: depName,
          oldVersion: this.findDependencyVersionByNameOrFail(depName),
          newVersion,
        });
      }
    }

    return changes;
  }

  // for hbs only
  hasDependencyUpdates(releasedVersions: Map<string, string>) {
    return this.getDependencyUpdates(releasedVersions).length > 0;
  }

  getNewVersion(bumpType: SemVerBumpType): string {
    const [major, minor, patch] = this.version.split('.').map(Number);
    switch (bumpType) {
      case SemVerBumpType.MAJOR:
        return `${major + 1}.0.0`;
      case SemVerBumpType.MINOR:
        return `${major}.${minor + 1}.0`;
      case SemVerBumpType.PATCH:
        return `${major}.${minor}.${patch + 1}`;
      default:
        return this.version;
    }
  }
}
