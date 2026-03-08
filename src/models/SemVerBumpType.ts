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

export function aggregateBumpTypes(...bumpType: SemVerBumpType[]): SemVerBumpType {
  return Math.max(...bumpType, SemVerBumpType.NONE);
}
