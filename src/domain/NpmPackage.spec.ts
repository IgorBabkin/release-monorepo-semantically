import { describe, it, expect } from 'vitest';
import { NpmPackage } from './NpmPackage.js';

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

  it('getDependencyUpdates reports the block a runtime dependency was read from', () => {
    const p = makePkg({ 'lib-a': '^1.0.0' });

    expect(p.getDependencyUpdates(new Map([['lib-a', '1.1.0']]))).toEqual([
      { packageName: 'lib-a', oldVersion: '^1.0.0', newVersion: '1.1.0', sections: ['dependencies'] },
    ]);
  });

  it('getDependencyUpdates reports devDependencies when that is where the dependency lives', () => {
    const p = makePkg({}, { 'lib-a': '1.0.0' });

    expect(p.getDependencyUpdates(new Map([['lib-a', '1.1.0']]))).toEqual([
      { packageName: 'lib-a', oldVersion: '1.0.0', newVersion: '1.1.0', sections: ['devDependencies'] },
    ]);
  });

  it('getDependencyUpdates reports every block declaring an outdated dependency', () => {
    const p = makePkg({ 'lib-a': '1.0.0' }, { 'lib-a': '^1.0.0' });

    expect(p.getDependencyUpdates(new Map([['lib-a', '1.1.0']]))).toEqual([
      { packageName: 'lib-a', oldVersion: '1.0.0', newVersion: '1.1.0', sections: ['dependencies', 'devDependencies'] },
    ]);
  });

  it('getDependencyUpdates skips blocks already on the released version', () => {
    const p = makePkg({ 'lib-a': '1.1.0' }, { 'lib-a': '1.0.0' });

    expect(p.getDependencyUpdates(new Map([['lib-a', '1.1.0']]))).toEqual([
      { packageName: 'lib-a', oldVersion: '1.0.0', newVersion: '1.1.0', sections: ['devDependencies'] },
    ]);
  });

  it('getDependencyUpdates ignores a dependency that is not declared at all', () => {
    const p = makePkg({ 'lib-a': '1.0.0' });

    expect(p.getDependencyUpdates(new Map([['lib-b', '1.1.0']]))).toEqual([]);
  });

  it('getDependencyNames filters to internal set', () => {
    const p = makePkg({ 'lib-a': '1.0.0', react: '18.0.0' });
    const names = new Set(['lib-a', 'lib-b']);
    expect(p.filterDependencies(names)).toEqual(['lib-a']);
  });
});
