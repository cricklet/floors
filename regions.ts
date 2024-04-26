import paper from "paper";
import { findAllCycles } from "./dfs";
import { EdgeId, PointId, Scene } from "./scene";
import { faceColorForRegion } from "./render";
import { windingOfCycle } from "./rooms";

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

  const graph = scene.pointToSortedPoints();

  _cachedGraphHash = scene.graphHash();
  _cachedCycles = findAllCycles(graph, 14);

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

export function* enumerateIndexAndItem<T>(
  it: Iterable<T>
): Iterable<[number, T]> {
  let i = 0;
  for (const item of it) {
    yield [i, item];
    i++;
  }
}

export function sortedRegions(
  regions: Map<RegionId, Array<PointId>>
): Array<Array<PointId>> {
  const keys = Array.from(regions.keys());
  keys.sort();
  return keys.map((key) => regions.get(key)!);
}

function angleOfEdge(p1: paper.Point, p2: paper.Point): number {
  // eg: angleOfEdge(<0, 0>, <100, 100>) => 45
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

type DirectedEdgeId = string;

function directedEdgeId(p1: PointId, p2: PointId): DirectedEdgeId {
  return `${p1}-${p2}`;
}

export function moduloAngle(start: number, other: number): number {
  while (other < start) {
    other += 360;
  }
  while (other > start + 360) {
    other -= 360;
  }
  return other;
}

function findRegionsFast(scene: Scene): Map<RegionId, Array<PointId>> {
  const anglesLookup: Map<PointId, Map<PointId, number>> = new Map();
  const graph = scene.pointToPoints();
  for (const [edge, [p1, p2]] of scene.edges()) {
    const angle = angleOfEdge(scene.getPoint(p1), scene.getPoint(p2));
    if (!anglesLookup.has(p1)) {
      anglesLookup.set(p1, new Map());
    }
    if (!anglesLookup.has(p2)) {
      anglesLookup.set(p2, new Map());
    }
    anglesLookup.get(p1)!.set(p2, angle);
    anglesLookup.get(p2)!.set(p1, angle + 180);
  }

  function sortNeighbors(
    last: PointId,
    current: PointId
  ): Array<[number, PointId]> {
    const startAngle = moduloAngle(
      0,
      180 + anglesLookup.get(last)!.get(current)!
    );

    const neighbors = graph.get(current)!;
    const neighborAngles = [...neighbors]
      .filter((neighbor) => neighbor !== last)
      .map((neighbor): [number, PointId] => {
        return [anglesLookup.get(current)!.get(neighbor)!, neighbor];
      })
      .map(([neighborAngle, neighbor]): [number, PointId] => {
        return [moduloAngle(startAngle, neighborAngle), neighbor];
      })
      .sort(([a1, _], [a2, __]) => a1 - a2);

    return neighborAngles;
  }

  const regions = new Map<RegionId, Array<PointId>>();
  const seenEdges = new Set<DirectedEdgeId>();

  // calculate cycles, always counter-clockwise
  for (const first of graph.keys()) {
    for (const second of graph.get(first)!) {
      const startingEdge = directedEdgeId(first, second);
      // console.log("");

      if (seenEdges.has(startingEdge)) {
        continue;
      }

      // console.log(`starting ${first} -> ${second}`);

      const seen = new Set<PointId>();
      function traverse(
        last: PointId,
        current: PointId,
        depth: number = 1
      ): Array<PointId> | undefined {
        let indent = "  ".repeat(depth);

        if (seen.has(current)) {
          return undefined;
        }
        seen.add(current);

        const neighbors = sortNeighbors(last, current);
        // console.log(`${indent}neighbors of ${current}: start ${moduloAngle(0, anglesLookup.get(last)!.get(current)!)} => ${neighbors.join(", ")}`);
        for (const [_, neighbor] of neighbors) {
          const nextDepth = depth + 1;

          // console.log(`${indent}traversing ${current} -> ${neighbor}`);

          if (neighbor === first) {
            return [last, current];
          }

          const foundCycle = traverse(current, neighbor, nextDepth);
          if (foundCycle !== undefined) {
            const cycle = [last, ...foundCycle];
            // console.log(`${indent}found cycle: ${cycle}`);
            return cycle;
          }
        }

        return undefined;
      }

      const cycle = traverse(first, second);
      if (cycle === undefined) {
        continue;
      }

      const cyclePoints = cycle.map((pointId) => scene.getPoint(pointId));
      if (windingOfCycle(cyclePoints) === "counterclockwise") {
        for (let i = 0; i < cycle.length; i++) {
          const point1 = cycle[i];
          const point2 = cycle[(i + 1) % cycle.length];
          seenEdges.add(directedEdgeId(point1, point2));
        }
        regions.set(regionIdForCycle(cycle), cycle);
      } else {
        // console.log(`skipping cycle ${cycle}`);
      }
    }
  }

  // for (const [_, cycle] of regions) {
  //   console.log(`cycle: ${cycle}`);
  // }

  return regions;
}

function findRegionsBrute(scene: Scene): Map<RegionId, Array<PointId>> {
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
    regions.set(regionId, [cycle, path]);
  }

  // find cycles that do not contain any other cycles
  const minimalCycles = new Map<RegionId, Array<PointId>>();

  for (const [i, [regionId, [cycle, path]]] of enumerateIndexAndItem(regions)) {
    let containsOtherCycle = false;
    let cycleSet = new Set(cycle);
    let edgesSet = cycleToEdges(cycle);

    for (const [j, [otherRegionId, [otherCycle, _]]] of enumerateIndexAndItem(
      regions
    )) {
      if (regionId === otherRegionId) {
        continue;
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

  return minimalCycles;
}

const _SHOULD_CHECK = false;

export function findRegions(scene: Scene): Map<RegionId, Array<PointId>> {
  const fast = findRegionsFast(scene);

  if (_SHOULD_CHECK) {
    const brute = findRegionsBrute(scene);

    if (fast.size !== brute.size) {
      throw new Error(`fast.size ${fast.size} !== brute.size ${brute.size}`);
    }

    for (const [regionId, cycle] of brute) {
      if (!fast.has(regionId)) {
        throw new Error(`missing region ${regionId}`);
      }
    }
  }

  return fast;
}
