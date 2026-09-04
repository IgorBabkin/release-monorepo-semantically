export interface PackageJSON {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  // Read-only as far as a release is concerned: a peer range states which
  // versions a consumer may pair the package with, so it must survive a
  // dependency bump untouched.
  peerDependencies?: Record<string, string>;
  workspaces?: string[]; // global workspaces field for monorepos
}
