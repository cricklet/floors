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

function generateEdgeId(point1: PointId, point2: PointId): EdgeId {
  return [point1, point2].sort().join("");
}

let _nextPointId = 0;

export class Watcher {
  private _generation: number;
  private _listeners: Array<() => void>;

  constructor() {
    this._generation = 0;
    this._listeners = [];
  }

  generation() {
    return this._generation;
  }

  addListener(listener: () => void) {
    this._listeners.push(listener);
  }

  removeListener(listener: () => void) {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  notify() {
    this._generation++;
    for (const listener of this._listeners) {
      listener();
    }
  }
}

export class Scene {
  private _points: Map<PointId, paper.Point>;
  private _edges: Map<EdgeId, [PointId, PointId]>;
  private _watcher: Watcher;

  constructor() {
    this._points = new Map();
    this._edges = new Map();

    this._watcher = new Watcher();
  }

  generation() {
    return this._watcher.generation();
  }

  graphHash() {
    let hash = 0;
    const edges = Array.from(this._edges.keys()).sort();
    for (const edgeId of edges) {
      hash = combineAndHash(edgeId, hash);
    }
    return hash;
  }

  subset(cycle: Array<PointId>): Scene {
    const result = new Scene();
    for (const pointId of cycle) {
      result._points.set(pointId, this._points.get(pointId)!);
    }
    for (let i = 0; i < cycle.length; i++) {
      const point1 = cycle[i];
      const point2 = cycle[(i + 1) % cycle.length];
      const edgeId = generateEdgeId(point1, point2);
      result._edges.set(edgeId, [point1, point2]);
    }
    return result;
  }

  addListener(listener: () => void) {
    this._watcher.addListener(listener);
  }

  removeListener(listener: () => void) {
    this._watcher.removeListener(listener);
  }

  cloneFrom(scene: Readonly<Scene>) {
    this._points = new Map(scene.points());
    this._edges = new Map(scene.edges());
  }

  addPoint(point: paper.Point, stableId?: PointId): PointId {
    try {
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
    } finally {
      this._watcher.notify();
    }
  }

  getPoint(pointId: PointId): Readonly<paper.Point> {
    return this._points.get(pointId)!;
  }

  setPoint(pointId: PointId, point: paper.Point) {
    this._points.set(pointId, point);
    this._watcher.notify();
  }

  addEdge(point1: PointId, point2: PointId) {
    if (point1 === point2) {
      return;
    }

    const id = generateEdgeId(point1, point2);
    this._edges.set(id, [point1, point2]);

    this._watcher.notify();
  }

  removeEdge(edgeId: EdgeId) {
    this._edges.delete(edgeId);
    this._watcher.notify();
  }

  getEdge(edgeId: EdgeId): [PointId, PointId] {
    return this._edges.get(edgeId)!;
  }

  points(): ReadonlyMap<PointId, paper.Point> {
    return this._points;
  }

  edges(): ReadonlyMap<EdgeId, [PointId, PointId]> {
    return this._edges;
  }

  pointToPoints(): Map<PointId, Set<PointId>> {
    const graph = new Map<PointId, Set<PointId>>();
    for (const [_, [point1, point2]] of this._edges) {
      if (!graph.has(point1)) {
        graph.set(point1, new Set());
      }
      if (!graph.has(point2)) {
        graph.set(point2, new Set());
      }
      graph.get(point1)!.add(point2);
      graph.get(point2)!.add(point1);
    }
    return graph;
  }

  pointToSortedPoints(): Map<PointId, Array<PointId>> {
    const result = new Map<PointId, Array<PointId>>();
    const graph = this.pointToPoints();
    for (const [point, neighbors] of graph) {
      const sorted = Array.from(neighbors).sort();
      result.set(point, sorted);
    }
    return result;
  }

  pointToEdges(): Map<PointId, Set<EdgeId>> {
    const result = new Map<PointId, Set<EdgeId>>();
    for (const [edgeId, [point1, point2]] of this._edges) {
      if (!result.has(point1)) {
        result.set(point1, new Set());
      }
      if (!result.has(point2)) {
        result.set(point2, new Set());
      }
      result.get(point1)!.add(edgeId);
      result.get(point2)!.add(edgeId);
    }
    return result;
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

    this._watcher.notify();
  }
}

export function defaultScene(): Scene {
  let scene = new Scene();

  /*
   a b c
   d e f
   g h i
  */

  const a = scene.addPoint(new paper.Point(-50, -50), "a");
  const b = scene.addPoint(new paper.Point(0, -50), "b");
  const c = scene.addPoint(new paper.Point(50, -50), "c");
  const d = scene.addPoint(new paper.Point(-50, 0), "d");
  const f = scene.addPoint(new paper.Point(50, 0), "f");
  const g = scene.addPoint(new paper.Point(-50, 50), "g");
  const h = scene.addPoint(new paper.Point(0, 50), "h");
  const i = scene.addPoint(new paper.Point(50, 50), "i");

  scene.addEdge(a, b);
  scene.addEdge(b, c);
  scene.addEdge(c, f);
  scene.addEdge(f, i);
  scene.addEdge(i, h);
  scene.addEdge(h, g);
  scene.addEdge(g, d);
  scene.addEdge(d, a);
  scene.addEdge(b, h);
  scene.addEdge(d, f);

  return scene;
}

export function singlePolygon(): Scene {
  let scene = new Scene();

  /*
   a
  b c
  */

  const a = scene.addPoint(new paper.Point(0, -50), "a");
  const b = scene.addPoint(new paper.Point(-50, 50), "b");
  const c = scene.addPoint(new paper.Point(50, 50), "c");

  scene.addEdge(a, b);
  scene.addEdge(b, c);
  scene.addEdge(a, c);

  // /*
  //  a b c
  //  d   f
  //  g h i
  // */

  // const a = scene.addPoint(new paper.Point(-50, -50), "a");
  // const b = scene.addPoint(new paper.Point(0, -50), "b");
  // const c = scene.addPoint(new paper.Point(50, -50), "c");
  // const d = scene.addPoint(new paper.Point(-50, 0), "d");
  // const f = scene.addPoint(new paper.Point(50, 0), "f");
  // const g = scene.addPoint(new paper.Point(-50, 50), "g");
  // const h = scene.addPoint(new paper.Point(0, 50), "h");
  // const i = scene.addPoint(new paper.Point(50, 50), "i");

  // scene.addEdge(a, b);
  // scene.addEdge(b, c);
  // scene.addEdge(c, f);
  // scene.addEdge(f, i);
  // scene.addEdge(i, h);
  // scene.addEdge(h, g);
  // scene.addEdge(g, d);
  // scene.addEdge(d, a);

  return scene;
}
