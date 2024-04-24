import paper from "paper";
import { findAllCycles } from "./cycles";
import { EdgeId, PointId, Scene } from "./scene";
import { faceColorForRegion } from "./render";

export type RegionId = string;

function regionIdForCycle(cycle: Array<PointId>): RegionId {
  const sorted = cycle.toSorted();
  return sorted.join(",");
}

let _cachedGraphHash: number = -1;
let _cachedCycles: Array<Array<PointId>> = [];

function findCyclesInEdges(scene: Readonly<Scene>): Array<Array<PointId>> {
  if (_cachedGraphHash === scene.graphHash()) {
    return _cachedCycles;
  }

  const edges = scene.edges();
  const graph = new Map<PointId, PointId[]>();
  for (const [_, [point1, point2]] of edges) {
    if (!graph.has(point1)) {
      graph.set(point1, []);
    }
    if (!graph.has(point2)) {
      graph.set(point2, []);
    }
    graph.get(point1)!.push(point2);
    graph.get(point2)!.push(point1);
  }

  _cachedGraphHash = scene.graphHash();
  _cachedCycles = findAllCycles(graph);

  return _cachedCycles;
}

function edgeFromPoints(point1: PointId, point2: PointId): string {
  return [point1, point2].toSorted().join("");
}

function cycleToEdges(cycle: Array<PointId>): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < cycle.length; i++) {
    const point1 = cycle[i];
    const point2 = cycle[(i + 1) % cycle.length];

    const edge = edgeFromPoints(point1, point2);
    result.add(edge);
  }
  return result;
}

function* enumerate<T>(it: Iterable<T>): Iterable<[number, T]> {
  let i = 0;
  for (const item of it) {
    yield [i, item];
    i++;
  }
}

export function findRegions(scene: Scene): Map<RegionId, Array<PointId>> {
  // find all cycles
  const cycles = findCyclesInEdges(scene);
  const regions = new Map<RegionId, [Array<PointId>, paper.Path]>();

  for (const cycle of cycles) {
    const regionId = regionIdForCycle(cycle);

    const path = new paper.Path();
    for (const pointId of cycle) {
      path.add(scene.getPoint(pointId));
    }
    path.closed = true;
    path.fillColor = new paper.Color(faceColorForRegion(regionId));

    regions.set(regionId, [cycle, path]);
  }

  // find cycles that do not contain any other cycles
  const minimalCycles = new Map<RegionId, Array<PointId>>();

  // enumerate regions with index

  for (const [i, [regionId, [cycle, path]]] of enumerate(regions)) {
    let containsOtherCycle = false;
    let cycleSet = new Set(cycle);
    let edgesSet = cycleToEdges(cycle);

    // console.log('')
    // console.log('checking', regionId)
    // console.log('edgesSet', edgesSet)

    for (const [j, [otherRegionId, [otherCycle, _]]] of enumerate(regions)) {
      if (regionId === otherRegionId) {
        continue;
      }

      for (const otherPointId of otherCycle) {
        if (cycleSet.has(otherPointId)) {
          continue;
        }
        if (path.contains(scene.getPoint(otherPointId))) {
          containsOtherCycle = true;
          break;
        }
      }

      for (let i = 0; i < otherCycle.length; i++) {
        const otherPointId1 = otherCycle[i];
        const otherPointId2 = otherCycle[(i + 1) % otherCycle.length];
        const otherPoint1 = scene.getPoint(otherPointId1);
        const otherPoint2 = scene.getPoint(otherPointId2);

        const otherEdge = edgeFromPoints(otherPointId1, otherPointId2);
        if (edgesSet.has(otherEdge)) {
          continue;
        }

        const intermediatePoint = otherPoint1.add(otherPoint2).divide(2);
        if (path.contains(intermediatePoint)) {
          containsOtherCycle = true;
          break;
        }
      }

      if (containsOtherCycle) {
        break;
      }
    }

    if (!containsOtherCycle) {
      minimalCycles.set(regionId, cycle);
    }
  }

  console.log(`# of cycles ${minimalCycles.size}`);

  return minimalCycles;
}
