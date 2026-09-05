export enum SemVerBumpType {
  NONE = 0,
  PATCH = 1,
  MINOR = 2,
  MAJOR = 3,
}

export function bumpTypeToString(type: SemVerBumpType): string | undefined {
  switch (type) {
    case SemVerBumpType.MAJOR:
      return 'major';

    case SemVerBumpType.MINOR:
      return 'minor';

    case SemVerBumpType.PATCH:
      return 'patch';

    default:
      return undefined;
  }
}

export function bumpVersion(version: string, bumpType: SemVerBumpType): string {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (bumpType) {
    case SemVerBumpType.MAJOR:
      return `${major + 1}.0.0`;
    case SemVerBumpType.MINOR:
      return `${major}.${minor + 1}.0`;
    case SemVerBumpType.PATCH:
      return `${major}.${minor}.${patch + 1}`;
    default:
      return version;
  }
}

/**
 * The bump a released version represents, read back from the two versions.
 * The release context carries each package's previous and new version but not
 * the bump that produced it, so the later steps recover it here instead of the
 * serialized context growing a field every step would have to keep in sync.
 */
export function detectBumpType(oldVersion: string, newVersion: string): SemVerBumpType {
  const [oldMajor, oldMinor, oldPatch] = oldVersion.split('.').map(Number);
  const [newMajor, newMinor, newPatch] = newVersion.split('.').map(Number);

  if (newMajor > oldMajor) return SemVerBumpType.MAJOR;
  if (newMajor === oldMajor && newMinor > oldMinor) return SemVerBumpType.MINOR;
  if (newMajor === oldMajor && newMinor === oldMinor && newPatch > oldPatch) return SemVerBumpType.PATCH;
  return SemVerBumpType.NONE;
}
