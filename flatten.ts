import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";

function findIntersection(
  scene: Readonly<Scene>,
  edgeId: EdgeId,
  otherId: EdgeId
): paper.Point | undefined {
  const [point1, point2] = scene.edges().get(edgeId)!;
  const path = new paper.Path.Line(
    scene.getPoint(point1),
    scene.getPoint(point2)
  );

  const [otherPoint1, otherPoint2] = scene.edges().get(otherId)!;

  if (edgeId === otherId) {
    return undefined;
  }

  // TODO: so much garbage collection
  const otherPath = new paper.Path.Line(
    scene.getPoint(otherPoint1),
    scene.getPoint(otherPoint2)
  );

  if (!path.intersects(otherPath)) {
    return undefined;
  }

  const intersection = path.getIntersections(otherPath)[0].point;
  if (
    intersection.equals(scene.getPoint(point1)) ||
    intersection.equals(scene.getPoint(point2))
  ) {
    return undefined;
  }

  return intersection;
}

export function splitEdge(
  scene: Scene,
  edgeId: EdgeId,
  intersectionPoint: PointId
): PointId {
  const [point1, point2] = scene.edges().get(edgeId)!;

  scene.removeEdge(edgeId);

  scene.addEdge(point1, intersectionPoint);
  scene.addEdge(intersectionPoint, point2);

  return intersectionPoint;
}

function removeIntersectionOnce(scene: Scene, edgeId: EdgeId, otherId: EdgeId) {
  const intersection = findIntersection(scene, edgeId, otherId);
  if (!intersection) {
    return false;
  }

  const intersectionPoint = scene.addPoint(
    intersection,
    `(${edgeId}${otherId})`
  );

  splitEdge(scene, edgeId, intersectionPoint);
  splitEdge(scene, otherId, intersectionPoint);

  return true;
}

export function flattenScene(source: Readonly<Scene>): Scene {
  const flattened = new Scene();
  flattened.cloneFrom(source);

  for (let i = 0; i < 1000; i++) {
    let foundIntersection = false;

    const edgeIds = Array.from(flattened.edges().keys()).toSorted();

    for (const edgeId of edgeIds) {
      for (const otherId of edgeIds) {
        const updated = removeIntersectionOnce(flattened, edgeId, otherId);
        if (updated) {
          foundIntersection = true;
          break;
        }
      }

      if (foundIntersection) {
        break;
      }
    }

    if (!foundIntersection) {
      break;
    }
  }

  return flattened;
}

export function findIntersections(
  scene: Readonly<Scene>
): Map<paper.Point, Set<EdgeId>> {
  const result = new Map<paper.Point, Set<EdgeId>>();

  const edgeIds = Array.from(scene.edges().keys()).toSorted();
  for (const edgeId of edgeIds) {
    for (const otherId of edgeIds) {
      if (edgeId === otherId) {
        continue;
      }

      const intersection = findIntersection(scene, edgeId, otherId);
      if (intersection) {
        if (!result.has(intersection)) {
          result.set(intersection, new Set());
        }
        result.get(intersection)!.add(edgeId);
        result.get(intersection)!.add(otherId);
      }
    }
  }

  return result;
}

export function findEdgesSplitByPoint(
  scene: Readonly<Scene>,
  target: paper.Point
): Array<EdgeId> {
  const result = [];

  const edgeIds = Array.from(scene.edges().keys()).toSorted();
  for (const edgeId of edgeIds) {
    const [pointId1, pointId2] = scene.edges().get(edgeId)!;
    const [point1, point2] = [
      scene.getPoint(pointId1),
      scene.getPoint(pointId2),
    ];

    if (point1 === target || point2 === target) {
      // The target is one of the endpoints (not a split)
      continue;
    }

    const line = new paper.Path.Line(point1, point2);
    const nearest = line.getNearestPoint(target);
    if (nearest.getDistance(target) < 0.5) {
      result.push(edgeId);
    }
  }

  return result;
}
