import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";

class LinesCache {
  private _paths: Map<EdgeId, [paper.Point, paper.Point, paper.Path]>;

  constructor() {
    this._paths = new Map();
  }

  lineInScene(
    scene: Readonly<Scene>,
    edgeId: EdgeId,
    point1: PointId,
    point2: PointId
  ): paper.Path {
    const point1Pos = scene.points().get(point1)!;
    const point2Pos = scene.points().get(point2)!;
    return this.line(edgeId, point1Pos, point2Pos);
  }

  line(edgeId: EdgeId, point1: paper.Point, point2: paper.Point): paper.Path {
    if (this._paths.has(edgeId)) {
      const [cachedPoint0, cachedPoint1, cachedPath] = this._paths.get(edgeId)!;
      if (cachedPoint0.equals(point1) && cachedPoint1.equals(point2)) {
        return cachedPath;
      } else {
        cachedPath.remove();
        this._paths.delete(edgeId);
      }
    }

    const path = new paper.Path.Line({
      segments: [point1, point2],
      insert: false,
    });

    this._paths.set(edgeId, [point1, point2, path]);
    return path;
  }
}

const linesCache = new LinesCache();

function removeIntersectionOnce(scene: Scene, edgeId: EdgeId) {
  const [point1, point2] = scene.edges().get(edgeId)!;
  const path = linesCache.lineInScene(scene, edgeId, point1, point2);

  for (const [otherId, [otherPoint1, otherPoint2]] of scene.edges()) {
    if (edgeId === otherId) {
      continue;
    }

    const otherPath = linesCache.lineInScene(
      scene,
      otherId,
      otherPoint1,
      otherPoint2
    );
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
