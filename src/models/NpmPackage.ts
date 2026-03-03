import { PackageJSON } from './PackageJSON';
import { Sortable } from '../sortLessDependenciesFirst';

export class NpmPackage implements Sortable {
  static createFromPackage(pkgJson: PackageJSON, pkgPath: string): NpmPackage {
    return new NpmPackage(pkgJson.name, pkgPath, pkgJson.version, pkgJson.private ?? false, pkgJson.dependencies ?? {}, pkgJson.devDependencies ?? {});
  }

  constructor(
    readonly name: string,
    readonly path: string,
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
}
