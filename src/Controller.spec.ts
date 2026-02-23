import { describe, it, expect } from 'vitest';
import { NpmPackage } from './models/NpmPackage';
import { sortLessDependenciesFirst } from './sortLessDependenciesFirst';

function createPkg(name: string, deps: Record<string, string> = {}): NpmPackage {
  return new NpmPackage(name, `/${name}`, '1.0.0', false, deps, {});
}

describe('sortLessDependenciesFirst', () => {
  it('puts dependencies before dependents (simple pair)', () => {
    // A depends on B => order should be B, A
    const A = createPkg('A', { B: '1.0.0' });
    const B = createPkg('B');

    const result = sortLessDependenciesFirst([A, B]).map((p) => p.name);
    expect(result).toEqual(['B', 'A']);
  });

  it('handles dependency chains (C -> B -> A order)', () => {
    const A = createPkg('A', { B: '1.0.0' });
    const B = createPkg('B', { C: '1.0.0' });
    const C = createPkg('C');

    const result = sortLessDependenciesFirst([A, B, C]).map((p) => p.name);
    expect(result).toEqual(['C', 'B', 'A']);
  });

  it('ignores external dependencies', () => {
    const A = createPkg('A', { react: '18.0.0' });
    const B = createPkg('B');

    const result = sortLessDependenciesFirst([A, B]).map((p) => p.name);
    // No internal dependency between A and B, relative order can be [A,B] or [B,A].
    // But both must appear exactly once.
    expect(result.sort()).toEqual(['A', 'B'].sort());
  });

  it('terminates and includes all packages even with cycles', () => {
    // A <-> B cycle
    const A = createPkg('A', { B: '1.0.0' });
    const B = createPkg('B', { A: '1.0.0' });

    const result = sortLessDependenciesFirst([A, B]).map((p) => p.name);
    // In a cycle, exact order is undefined, but should include both once and terminate
    expect(result.sort()).toEqual(['A', 'B'].sort());
  });
});
