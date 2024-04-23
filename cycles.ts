export function findAllCycles(
  graph: Map<number, Array<number>>
): Array<Array<number>> {
  const seenCycles: Set<string> = new Set();
  const cycles: Array<Array<number>> = [];

  function seen(path: Array<number>): boolean {
    path = path.toSorted();

    const key = path.join(",");
    if (seenCycles.has(key)) {
      return true;
    }

    seenCycles.add(key);
    return false;
  }

  function dfs(node: number, visited: Set<number>, path: Array<number>) {
    visited.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, visited, path);
      } else if (path.includes(neighbor)) {
        const cycle = path.slice(path.indexOf(neighbor));
        if (cycle.length > 2) {
          if (!seen(cycle)) {
            cycles.push(cycle);
          }
        }
      }
    }

    path.pop();
    visited.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node, new Set<number>(), []);
  }

  return cycles;
}
