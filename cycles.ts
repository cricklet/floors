type Graph<T> = Map<T, T[]>;

export function findAllCycles<T>(graph: Graph<T>): T[][] {
  let cycles: T[][] = [];
  let path: T[] = [];
  let visited = new Set<T>();
  let stack = Array.from(graph.keys());

  function dfs(node: T, start: T) {
    if (visited.has(node)) {
      if (node === start && path.length > 1) {
        let cycle = path.slice();
        cycle.push(node);
        cycle.sort((a, b) => a - b); // Sort to normalize the cycle
        const cycleStr = cycle.join(",");
        if (!uniqueCycles.has(cycleStr)) {
          cycles.push(cycle);
          uniqueCycles.add(cycleStr);
        }
      }
      return;
    }

    visited.add(node);
    path.push(node);
    for (let neighbor of graph.get(node) || []) {
      if (neighbor !== start || path.length > 1) {
        // Avoid immediate backtracking
        dfs(neighbor, start);
      }
    }
    visited.delete(node);
    path.pop();
  }

  let uniqueCycles = new Set<string>(); // To store unique cycles as strings
  for (let node of stack) {
    dfs(node, node);
    visited.add(node); // Ensure we don't revisit the same starting point
  }

  return cycles;
}
