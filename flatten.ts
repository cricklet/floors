import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";

function removeIntersectionOnce(scene: Scene, edgeId: EdgeId) {
  const [point1, point2] = scene.edges().get(edgeId)!;
  const path = new paper.Path.Line({
    segments: [scene.getPoint(point1), scene.getPoint(point2)],
    insert: false,
  });

  for (const [otherId, [otherPoint1, otherPoint2]] of scene.edges()) {
    if (edgeId === otherId) {
      continue;
    }

    // TODO: so much garbage collection
    const otherPath = new paper.Path.Line({
      segments: [scene.getPoint(otherPoint1), scene.getPoint(otherPoint2)],
      insert: false,
    });

    if (path.intersects(otherPath)) {
      const intersection = path.getIntersections(otherPath)[0].point;
      if (
        intersection.equals(scene.getPoint(point1)) ||
        intersection.equals(scene.getPoint(point2))
      ) {
        continue;
      }

      const intersectionPoint = scene.addPoint(intersection);

      scene.addEdge(point1, intersectionPoint);
      scene.addEdge(intersectionPoint, point2);
      scene.addEdge(otherPoint1, intersectionPoint);
      scene.addEdge(intersectionPoint, otherPoint2);

      scene.removeEdge(edgeId);
      scene.removeEdge(otherId);

      return true;
    }
  }

  return false;
}

export function flattenScene(source: Readonly<Scene>): Scene {
  const flattened = new Scene();
  flattened.cloneFrom(source);

  for (let i = 0; i < 1000; i++) {
    console.log("flattening...");
    let foundIntersection = false;

    for (const edgeId of flattened.edges().keys()) {
      const updated = removeIntersectionOnce(flattened, edgeId);
      if (updated) {
        foundIntersection = true;
        break;
      }
    }

    if (!foundIntersection) {
      break;
    }
  }

  return flattened;
}
