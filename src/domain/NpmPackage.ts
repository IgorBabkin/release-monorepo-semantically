import { PackageJSON } from './PackageJSON.js';
import { Sortable } from '../utils/sortLessDependenciesFirst.js';
import { DEPENDENCY_SECTIONS, DependencySection, DependencyVersionChange } from './ReleaseTypes.js';
import { SemVerBumpType } from './SemVerBumpType.js';
import { MissingDependencyVersionException } from '../exceptions/DomainException.js';

export interface NpmPackageJSON {
  name: string;
  dirname: string;
  version: string;
  isPrivate: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export type PackageName = string;
export type PackageVersion = string;

export class NpmPackage implements Sortable {
  static createFromPackage(pkgJson: PackageJSON, pkgDirname: string): NpmPackage {
    return new NpmPackage(pkgJson.name, pkgDirname, pkgJson.version, pkgJson.private ?? false, pkgJson.dependencies ?? {}, pkgJson.devDependencies ?? {});
  }

  static fromJSON(data: NpmPackageJSON): NpmPackage {
    return new NpmPackage(data.name, data.dirname, data.version, data.isPrivate, data.dependencies, data.devDependencies);
  }

  constructor(
    readonly name: string,
    readonly dirname: string,
    readonly version: string,
    readonly isPrivate: boolean,
    readonly dependencies: Record<string, string>,
    readonly devDependencies: Record<string, string>,
  ) {}

  toJSON(): NpmPackageJSON {
    return {
      name: this.name,
      dirname: this.dirname,
      version: this.version,
      isPrivate: this.isPrivate,
      dependencies: this.dependencies,
      devDependencies: this.devDependencies,
    };
  }

  filterDependencies(packageNames: Set<string>): string[] {
    return Object.keys({ ...this.dependencies, ...this.devDependencies }).filter((d) => packageNames.has(d));
  }

  hasDependency(depPkgName: string) {
    return Object.keys(this.dependencies).includes(depPkgName);
  }

  getCommitTag(): string {
    return `${this.name}@${this.version}`;
  }

  private findDependencyVersionByNameOrFail(depName: string, sections: DependencySection[]): string {
    const dependencyVersion = sections.map((section) => this[section][depName]).find(Boolean);
    if (!dependencyVersion) {
      throw new MissingDependencyVersionException(this.name, depName);
    }
    return dependencyVersion;
  }

  /**
   * Every block that declares `depName` at something other than `newVersion`.
   * A dependency can legitimately be declared twice (a devDependency next to a
   * runtime one), and each declaration has to be refreshed, or the release
   * leaves a stale specifier behind.
   */
  private findOutdatedDependencySections(depName: string, newVersion: string): DependencySection[] {
    return DEPENDENCY_SECTIONS.filter((section) => {
      const dependencyVersion = this[section][depName];
      return Boolean(dependencyVersion) && dependencyVersion !== newVersion;
    });
  }

  getDependencyUpdates(releasedVersions: Map<string, string>): DependencyVersionChange[] {
    const changes: DependencyVersionChange[] = [];

    for (const [depName, newVersion] of releasedVersions) {
      const sections = this.findOutdatedDependencySections(depName, newVersion);
      if (sections.length > 0) {
        changes.push({
          packageName: depName,
          oldVersion: this.findDependencyVersionByNameOrFail(depName, sections),
          newVersion,
          sections,
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
