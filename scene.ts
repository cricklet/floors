import paper from "paper";

export type PointId = string;
export type EdgeId = string;

let _nextPointId = 0;

export class Scene {
  private _points: Map<PointId, paper.Point>;
  private _edges: Map<EdgeId, [PointId, PointId]>;
  private _generation: number;

  constructor() {
    this._points = new Map();
    this._edges = new Map();
    this._generation = 0;
  }

  generation() {
    return this._generation;
  }

  cloneFrom(scene: Readonly<Scene>) {
    this._points = new Map(scene.points());
    this._edges = new Map(scene.edges());
  }

  addPoint(point: paper.Point, stableId?: PointId): PointId {
    this._generation ++;

    for (const [id, existingPoint] of this._points) {
      if (existingPoint.equals(point)) {
        return `${id}`;
      }
    }

    if (stableId) {
      this._points.set(stableId, point);
      return stableId;
    }

    const id = `${_nextPointId}`;
    this._points.set(id, point);
    _nextPointId++;
    return id;
  }

  getPoint(pointId: PointId): Readonly<paper.Point> {
    return this._points.get(pointId)!;
  }

  setPoint(pointId: PointId, point: paper.Point) {
    this._generation ++;
    this._points.set(pointId, point);
  }

  addEdge(point1: PointId, point2: PointId) {
    this._generation ++;
    if (point1 === point2) {
      return;
    }

    const id = [point1, point2].sort().join("");
    this._edges.set(id, [point1, point2]);
  }

  removeEdge(edgeId: EdgeId) {
    this._generation ++;
    this._edges.delete(edgeId);
  }

  points(): ReadonlyMap<PointId, paper.Point> {
    return this._points;
  }

  edges(): ReadonlyMap<EdgeId, [PointId, PointId]> {
    return this._edges;
  }
}
