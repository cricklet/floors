import paper from "paper";

export type PointId = string;
export type EdgeId = string;

// ChatGPT
function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// ChatGPT
function combineAndHash(originalString: string, existingHash: number) {
  // Convert existing hash to a base that can be easily combined
  const hash1 = simpleHash(originalString);
  const hash2 = existingHash; // Assuming existingHash is already a number

  // Combine hashes, example using XOR
  const combinedHash = hash1 ^ hash2;

  // Hash the combined result again
  return simpleHash(combinedHash.toString());
}

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

  graphHash() {
    let hash = 0;
    const edges = Array.from(this._edges.keys()).sort();
    for (const edgeId of edges) {
      hash = combineAndHash(edgeId, hash);
    }
    return hash;
  }

  cloneFrom(scene: Readonly<Scene>) {
    this._points = new Map(scene.points());
    this._edges = new Map(scene.edges());
  }

  addPoint(point: paper.Point, stableId?: PointId): PointId {
    this._generation++;

    for (const [id, existingPoint] of this._points) {
      if (existingPoint.getDistance(point) < 1) {
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
    this._generation++;
    this._points.set(pointId, point);
  }

  addEdge(point1: PointId, point2: PointId) {
    this._generation++;

    if (point1 === point2) {
      return;
    }

    const id = [point1, point2].sort().join("");
    this._edges.set(id, [point1, point2]);
  }

  removeEdge(edgeId: EdgeId) {
    this._generation++;

    this._edges.delete(edgeId);
  }

  points(): ReadonlyMap<PointId, paper.Point> {
    return this._points;
  }

  edges(): ReadonlyMap<EdgeId, [PointId, PointId]> {
    return this._edges;
  }

  encode(): string {
    let result = "";
    result += `points\n`;
    for (const [pointId, point] of this._points) {
      result += `${pointId},${point.x},${point.y}\n`;
    }
    result += `edges\n`;
    for (const [edgeId, [point1, point2]] of this._edges) {
      result += `${edgeId},${point1},${point2}\n`;
    }
    return result;
  }

  decode(data: string) {
    this._generation++;

    this._edges.clear();
    this._points.clear();

    let mode = "points";
    for (const line of data.split("\n")) {
      if (line === "points") {
        mode = "points";
        continue;
      }
      if (line === "edges") {
        mode = "edges";
        continue;
      }

      if (line === "") {
        continue;
      }

      if (line.startsWith("//")) {
        continue;
      }

      if (mode === "points") {
        const [id, x, y] = line.split(",");
        this._points.set(id, new paper.Point(parseFloat(x), parseFloat(y)));
      } else if (mode === "edges") {
        const [id, p1, p2] = line.split(",");
        this._edges.set(id, [p1, p2]);
      }
    }
  }
}
