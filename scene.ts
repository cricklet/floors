import paper from "paper";

export type PointId = number;
export type EdgeId = number;

let _nextPointId = 0;
let _nextEdgeId = 0;

export class Scene {
  private _points: Map<PointId, paper.Point>;
  private _edges: Map<EdgeId, [PointId, PointId]>;

  constructor() {
    this._points = new Map();
    this._edges = new Map();
  }

  cloneFrom(scene: Readonly<Scene>) {
    this._points = new Map(scene.points());
    this._edges = new Map(scene.edges());
  }

  addPoint(point: paper.Point): number {
    for (const [id, existingPoint] of this._points) {
      if (existingPoint.equals(point)) {
        return id;
      }
    }

    const id = _nextPointId;
    this._points.set(id, point);
    _nextPointId++;
    return id;
  }

  getPoint(pointId: PointId): paper.Point {
    return this._points.get(pointId)!;
  }

  addEdge(point1: number, point2: number) {
    const id = _nextEdgeId;
    this._edges.set(id, [point1, point2]);
    _nextEdgeId++;
  }

  removeEdge(edgeId: EdgeId) {
    this._edges.delete(edgeId);
  }

  points(): ReadonlyMap<PointId, paper.Point> {
    return this._points;
  }

  edges(): ReadonlyMap<EdgeId, [PointId, PointId]> {
    return this._edges;
  }
}
