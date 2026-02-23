// package which is dependent less from rest of package must be first (dependencies first)

export interface Sortable {
  name: string;
  filterDependencies(packageNames: Set<string>): string[];
}

export function sortLessDependenciesFirst<T extends Sortable>(packages: T[]): T[] {
  // Build graph of internal dependencies (only monorepo packages)
  const packageNames = new Set(packages.map((p) => p.name));
  const graph = new Map<string, string[]>();
  for (const pkg of packages) {
    graph.set(pkg.name, pkg.filterDependencies(packageNames));
  }

  // DFS-based topological sort (dependencies first)
  const visited = new Set<string>();
  const visiting = new Set<string>(); // for cycle detection
  const order: string[] = [];

  const visit = (name: string) => {
    if (visited.has(name)) return;
    if (visiting.has(name)) return; // cycle detected; break the cycle
    visiting.add(name);
    for (const dep of graph.get(name) ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  };

  for (const pkg of packages) {
    visit(pkg.name);
  }

  const byName = new Map(packages.map((p) => [p.name, p] as const));
  return order.map((name) => byName.get(name)!).filter(Boolean);
}
