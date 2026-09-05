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

/**
 * A specifier using pnpm's `workspace:` protocol always points at the copy in
 * this workspace, so it is never stale and must not be rewritten to an exact
 * version. Rewriting it would replace a local link with a version that is only
 * published later in the release, leaving the lockfile refresh with nothing to
 * resolve. `pnpm publish` substitutes the real version into the tarball.
 */
export function isWorkspaceProtocol(specifier: string): boolean {
  return specifier.startsWith('workspace:');
}

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
