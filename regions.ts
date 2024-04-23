import paper from "paper";
import { findAllCycles } from "./cycles";
import { EdgeId, PointId, Scene } from "./scene";
import { faceColorForRegion } from "./render";

export type RegionId = string;

function regionIdForCycle(cycle: Array<PointId>): RegionId {
  const sorted = cycle.toSorted();
  return sorted.join(",");
}

function findCyclesInEdges(
  edges: ReadonlyMap<EdgeId, [PointId, PointId]>
): Array<Array<PointId>> {
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

  return findAllCycles(graph);
}

export function findRegions(scene: Scene): Map<RegionId, Array<PointId>> {
  // find all cycles
  const cycles = findCyclesInEdges(scene.edges());
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
  for (const [regionId, [cycle, path]] of regions) {
    let containsOtherCycle = false;

    let cycleSet = new Set(cycle);

    for (const [otherRegionId, [otherCycle, _]] of regions) {
      if (regionId === otherRegionId) {
        continue;
      }

      for (const otherPointId of otherCycle) {
        if (cycleSet.has(otherPointId)) {
          continue;
        } else {
          if (path.contains(scene.getPoint(otherPointId))) {
            containsOtherCycle = true;
            break;
          }
        }
      }

      const isSuperSet = otherCycle.every((otherPointId) => {
        if (cycleSet.has(otherPointId)) {
          return true;
        }
      });

      if (isSuperSet) {
        containsOtherCycle = true;
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
