/**
 * The package.json blocks an internal dependency version may be declared in,
 * and therefore the only blocks a release is allowed to write a bump back to.
 *
 * `peerDependencies` is deliberately absent: a peer range expresses
 * compatibility (`>=56`), not a pinned version, so pinning it to the freshly
 * released version would be wrong.
 */
export const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'] as const;

export type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

export interface DependencyVersionChange {
  packageName: string;
  oldVersion: string;
  newVersion: string;
  /**
   * Every block the outdated version was read from. The bump is written back
   * to exactly these blocks, so a dependency declared only as a devDependency
   * never grows a `dependencies` entry alongside it.
   */
  sections: DependencySection[];
}
