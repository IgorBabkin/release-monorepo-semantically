import { describe, it, expect } from 'vitest';
import { SemVerBumpType, bumpVersion } from './SemVerBumpType';

describe('bumpVersion', () => {
  it('should bump major version', () => {
    expect(bumpVersion('1.2.3', SemVerBumpType.MAJOR)).toBe('2.0.0');
  });

  it('should bump minor version', () => {
    expect(bumpVersion('1.2.3', SemVerBumpType.MINOR)).toBe('1.3.0');
  });

  it('should bump patch version', () => {
    expect(bumpVersion('1.2.3', SemVerBumpType.PATCH)).toBe('1.2.4');
  });

  it('should return same version for NONE', () => {
    expect(bumpVersion('1.2.3', SemVerBumpType.NONE)).toBe('1.2.3');
  });
});
