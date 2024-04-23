import { findAllCycles } from "./cycles";
import { EdgeId, PointId, Scene } from "./scene";

function findCyclesInEdges(edges: ReadonlyMap<EdgeId, [PointId, PointId]>) {
  const graph = new Map<PointId, PointId[]>();
  for (const [edgeId, [point1, point2]] of edges) {
    if (!graph.has(point1)) {
      graph.set(point1, []);
    }
    if (!graph.has(point2)) {
      graph.set(point2, []);
    }
    graph.get(point1)!.push(point2);
    graph.get(point2)!.push(point1);
  }

  console.log(JSON.stringify(Object.fromEntries(graph), null, 2));

  return findAllCycles(graph);
}

export function findRegions(scene: Scene) {
  // find all cycles
  const cycles = findCyclesInEdges(scene.edges());
  console.log(cycles);

  // add all cycles that do not intersect another cycle
}
