import { describe, it, expect } from 'vitest';
import { SemVerBumpType, bumpVersion, detectBumpType } from './SemVerBumpType.js';

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

describe('detectBumpType', () => {
  it('should detect a major bump', () => {
    expect(detectBumpType('1.2.3', '2.0.0')).toBe(SemVerBumpType.MAJOR);
  });

  it('should detect a minor bump', () => {
    expect(detectBumpType('1.2.3', '1.3.0')).toBe(SemVerBumpType.MINOR);
  });

  it('should detect a patch bump', () => {
    expect(detectBumpType('1.2.3', '1.2.4')).toBe(SemVerBumpType.PATCH);
  });

  it('should detect no bump when the version is unchanged', () => {
    expect(detectBumpType('1.2.3', '1.2.3')).toBe(SemVerBumpType.NONE);
  });
});
