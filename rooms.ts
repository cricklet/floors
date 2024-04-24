import paper from "paper";
import { findSplitTarget } from "./flatten";
import { findRegions } from "./regions";
import { PointId, Scene } from "./scene";

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

function* iterateEdgesAndCumulativeDistance(
  cycle: Array<paper.Point>
): Iterable<[number, paper.Point, number, paper.Point]> {
  let current = 0;
  for (let i = 0; i < cycle.length; i++) {
    const point1 = cycle[i];
    const point2 = cycle[(i + 1) % cycle.length];
    const increment = point1.getDistance(point2);

    yield [current, point1, current + increment, point2];

    current += increment;
  }
}

function circumferenceOfCycle(cycle: Array<paper.Point>): number {
  let circumference = 0;
  for (let i = 0; i < cycle.length; i++) {
    const point1 = cycle[i];
    const point2 = cycle[(i + 1) % cycle.length];
    circumference += point1.getDistance(point2);
  }

  return circumference;
}

function pointAlongCycle(cycle: Array<paper.Point>, t: number): paper.Point {
  const circumference = circumferenceOfCycle(cycle);
  const target = t * circumference;

  for (const [start, point1, end, point2] of iterateEdgesAndCumulativeDistance(
    cycle
  )) {
    if (target >= start && target <= end) {
      const progress = (target - start) / (end - start);
      return point1.add(point2.subtract(point1).multiply(progress));
    }
  }

  throw new Error(`Invalid t: ${t}`);
}

type Winding = "clockwise" | "counterclockwise";
function windingOfCycle(cycle: Array<paper.Point>): Winding {
  let sum = 0;
  for (let i = 0; i < cycle.length; i++) {
    const point1 = cycle[i];
    const point2 = cycle[(i + 1) % cycle.length];
    sum += (point2.x - point1.x) * (point2.y + point1.y);
  }

  return sum > 0 ? "counterclockwise" : "clockwise";
}



function makeCut(
  scene: Scene,
  cycle: Array<paper.Point>,
  winding: Winding,
  t: number
): boolean {
  const cut = pointAlongCycle(cycle, t);
  const split = findSplitTarget(scene, cut, 0.1);
  if (!split) {
    console.error(`couldn't find edge to split at ${cut} in cycle ${cycle}`);
    return false;
  }

  const [_, edgeId] = split;
  const [edgePointId1, edgePointId2] = scene.getEdge(edgeId);
  const [edgePoint1, edgePoint2] = [
    scene.getPoint(edgePointId1),
    scene.getPoint(edgePointId2),
  ];

  if (edgePoint1.getDistance(edgePoint2) < 0.01) {
    console.error(
      `edge ${edgeId} is too short to split ${edgePoint1}, ${edgePoint2}`
    );
    return false;
  }

  const edgeDirection = edgePoint2.subtract(edgePoint1).normalize();
  const cutDirection =
    winding === "clockwise"
      ? edgeDirection.rotate(90, new paper.Point(0, 0))
      : edgeDirection.rotate(-90, new paper.Point(0, 0));

  console.log(cut, cutDirection);

  return true;
}

export function generateRooms(
  scene: Scene,
  cycleIds: Array<PointId>,
  rooms: ReadonlyArray<number>
): Array<Array<paper.Point>> {
  const cycle = cycleIds.map((pointId) => scene.getPoint(pointId));

  const winding = windingOfCycle(cycle);
  console.log(cycleIds, cycle, winding);

  makeCut(scene, cycle, winding, 0.2);

  const result: Array<Array<paper.Point>> = [];

  // let regions;
  // while (true) {
  //   regions = findRegions(scene);
  //   if (regions.size >= rooms.length) {
  //     break;
  //   }

  //   // Add a split
  // }

  // for (const [regionId, region] of regions) {
  //   const points = region.map((pointId) => scene.getPoint(pointId));
  //   result.push(points);
  // }

  return result;
}
