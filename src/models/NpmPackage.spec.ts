import { describe, it, expect } from 'vitest';
import { NpmPackage } from './NpmPackage';

function makePkg(deps: Record<string, string> = {}, devDeps: Record<string, string> = {}) {
  return new NpmPackage('pkg-a', '/repo/pkg-a', '1.0.0', false, deps, devDeps);
}

describe('NpmPackage', () => {
  it('hasDependency returns true only for runtime deps', () => {
    const p = makePkg({ 'lib-a': '1.0.0' }, { 'lib-b': '1.0.0' });
    expect(p.hasDependency('lib-a')).toBe(true);
    expect(p.hasDependency('lib-b')).toBe(false);
    expect(p.hasDependency('missing')).toBe(false);
  });

  it('getDependencyNames filters to internal set', () => {
    const p = makePkg({ 'lib-a': '1.0.0', react: '18.0.0' });
    const names = new Set(['lib-a', 'lib-b']);
    expect(p.filterDependencies(names)).toEqual(['lib-a']);
  });
});
