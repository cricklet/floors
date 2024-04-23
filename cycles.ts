export function findAllCycles<T>(
  graph: Map<T, Array<T>>
): Array<Array<T>> {
  const seenCycles: Set<string> = new Set();
  const cycles: Array<Array<T>> = [];

  function seen(path: Array<T>): boolean {
    path = path.toSorted();

    const key = path.join(",");
    if (seenCycles.has(key)) {
      return true;
    }

    seenCycles.add(key);
    return false;
  }

  function dfs(node: T, visited: Set<T>, path: Array<T>) {
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
    dfs(node, new Set<T>(), []);
  }

  return cycles;
}
