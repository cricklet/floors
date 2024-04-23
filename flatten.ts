import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";

function removeIntersectionOnce(scene: Scene, edgeId: EdgeId, otherId: EdgeId) {
  const [point1, point2] = scene.edges().get(edgeId)!;
  const path = new paper.Path.Line(
    scene.getPoint(point1),
    scene.getPoint(point2)
  );

  const [otherPoint1, otherPoint2] = scene.edges().get(otherId)!;

  if (edgeId === otherId) {
    return false;
  }

  // TODO: so much garbage collection
  const otherPath = new paper.Path.Line(
    scene.getPoint(otherPoint1),
    scene.getPoint(otherPoint2)
  );

  if (path.intersects(otherPath)) {
    const intersection = path.getIntersections(otherPath)[0].point;
    if (
      intersection.equals(scene.getPoint(point1)) ||
      intersection.equals(scene.getPoint(point2))
    ) {
      return false;
    }

    const intersectionPoint = scene.addPoint(
      intersection,
      `(${edgeId}${otherId})`
    );

    scene.removeEdge(edgeId);
    scene.removeEdge(otherId);

    scene.addEdge(point1, intersectionPoint);
    scene.addEdge(intersectionPoint, point2);
    scene.addEdge(otherPoint1, intersectionPoint);
    scene.addEdge(intersectionPoint, otherPoint2);

    return true;
  }

  return false;
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

  console.log(`number of points: ${flattened.points().size}`);

  return flattened;
}

export function findIntersections(
  scene: Readonly<Scene>
): Map<paper.Point, Array<EdgeId>> {
  const result = new Map<paper.Point, Array<EdgeId>>();

  const edgeIds = Array.from(scene.edges().keys()).toSorted();
  for (const edgeId of edgeIds) {
    for (const otherId of edgeIds) {
      if (edgeId === otherId) {
        continue;
      }

      const [point1, point2] = scene.edges().get(edgeId)!;
      const path = new paper.Path.Line(
        scene.getPoint(point1),
        scene.getPoint(point2)
      );

      const [otherPoint1, otherPoint2] = scene.edges().get(otherId)!;
      const otherPath = new paper.Path.Line(
        scene.getPoint(otherPoint1),
        scene.getPoint(otherPoint2)
      );

      if (path.intersects(otherPath)) {
        const intersection = path.getIntersections(otherPath)[0].point;
        if (
          intersection.equals(scene.getPoint(point1)) ||
          intersection.equals(scene.getPoint(point2))
        ) {
          continue;
        }

        if (!result.has(intersection)) {
          result.set(intersection, []);
        }

        result.get(intersection)!.push(edgeId);
        result.get(intersection)!.push(otherId);
      }
    }
  }

  return result;
}
