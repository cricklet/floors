import { findRegions } from "./regions";
import { Scene } from "./scene";

export class RoomsDefinition {
  private _rooms: Array<number>;
  private _listeners: Array<() => void>;

  constructor(rooms: Array<number>) {
    this._rooms = rooms;
    this._listeners = [];
  }

  rooms(): ReadonlyArray<number> {
    return this._rooms;
  }

  addListener(listener: () => void) {
    this._listeners.push(listener);
  }

  encode(): string {
    return this._rooms.join(" ");
  }

  decode(encoded: string) {
    const cleaned = encoded.replace(/[^\s\d.]+/g, "");
    const split = cleaned.split(/\s+/).filter((x) => x.length > 0);

    const rooms = split
      .map((x) => parseFloat(x))
      .filter((x) => !isNaN(x) && x > 0);
    this._rooms = rooms;

    this._listeners.forEach((listener) => listener());
  }
}

export function defaultRoomsDefinition(): RoomsDefinition {
  return new RoomsDefinition([1, 1, 1, 1]);
}

export function generateRooms(
  cycle: Array<paper.Point>,
  rooms: Array<number>
): Array<Array<paper.Point>> {
  const scene = new Scene();

  const cycleIds = cycle.map((point) => scene.addPoint(point));
  for (let i = 0; i < cycleIds.length; i++) {
    const point1 = cycleIds[i];
    const point2 = cycleIds[(i + 1) % cycleIds.length];
    scene.addEdge(point1, point2);
  }

  let regions;
  while (true) {
    regions = findRegions(scene);
    if (regions.size >= rooms.length) {
      break;
    }

    // Add a split

  }

  const result: Array<Array<paper.Point>> = [];
  for (const [regionId, region] of regions) {
    const points = region.map((pointId) => scene.getPoint(pointId));
    result.push(points);
  }

  return result;
}
