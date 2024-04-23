import * as paper from "paper";
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

    const path = new paper.Path.Line(point1, point2);
    this._paths.set(edgeId, [point1, point2, path]);
    return path;
  }
}

const linesCache = new LinesCache();

function flattenOnce(flattened: Scene) {
  for (const [edgeId, [point1, point2]] of flattened.edges()) {
    const path = linesCache.lineInScene(flattened, edgeId, point1, point2);

    for (const [otherId, [otherPoint1, otherPoint2]] of flattened.edges()) {
      if (edgeId === otherId) {
        continue;
      }

      const otherPath = linesCache.lineInScene(
        flattened,
        otherId,
        otherPoint1,
        otherPoint2
      );
      if (path.intersects(otherPath)) {
        const intersection = path.getIntersections(otherPath)[0].point;
        if (
          intersection.equals(flattened.getPoint(point1)) ||
          intersection.equals(flattened.getPoint(point2))
        ) {
          continue;
        }

        const intersectionPoint = flattened.addPoint(intersection);

        flattened.addEdge(point1, intersectionPoint);
        flattened.addEdge(intersectionPoint, point2);
        flattened.addEdge(otherPoint1, intersectionPoint);
        flattened.addEdge(intersectionPoint, otherPoint2);

        flattened.removeEdge(edgeId);
        flattened.removeEdge(otherId);

        return true;
      }
    }
  }

  return false;
}

export function flattenScene(source: Readonly<Scene>): Scene {
  const flattened = new Scene();
  flattened.cloneFrom(source);

  for (let i = 0; i < 1000; i++) {
    console.log("flattening...");
    const updated = flattenOnce(flattened);
    if (!updated) {
      break;
    }
  }

  return flattened;
}
