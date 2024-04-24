import paper from "paper";
import seedrandom from "seedrandom";
import {
  findSplitTarget,
  createFlattenedScene,
  splitEdge,
  flattenScene,
} from "./flatten";
import { RegionId, enumerateIndexAndItem, findRegions } from "./regions";
import { EdgeId, PointId, Scene } from "./scene";
import { Runner } from "./genetic";

export class RoomsDefinition {
  private _rooms: Array<number>;
  private _listeners: Array<() => void>;

  constructor(rooms: Array<number>) {
    this._rooms = rooms;
    this._listeners = [];
  }

  roomWeights(): ReadonlyArray<number> {
    return this._rooms;
  }

  numRooms(): number {
    return this._rooms.length;
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

function pointAlongCycle(
  cycle: Array<paper.Point>,
  t: number
): {
  point: paper.Point;
  edge: [paper.Point, paper.Point];
} {
  const circumference = circumferenceOfCycle(cycle);
  const target = t * circumference;

  for (const [start, point1, end, point2] of iterateEdgesAndCumulativeDistance(
    cycle
  )) {
    if (target >= start && target <= end) {
      const progress = (target - start) / (end - start);
      return {
        point: point1.add(point2.subtract(point1).multiply(progress)),
        edge: [point1, point2],
      };
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

// https://gamedev.stackexchange.com/questions/109420/ray-segment-intersection
function rayIntersection(
  x: number,
  y: number,
  dx: number,
  dy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number } | undefined {
  var r, s, d;
  //Make sure the lines aren't parallel, can use an epsilon here instead
  // Division by zero in C# at run-time is infinity. In JS it's NaN
  if (dy / dx != (y2 - y1) / (x2 - x1)) {
    d = dx * (y2 - y1) - dy * (x2 - x1);
    if (d != 0) {
      r = ((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) / d;
      s = ((y - y1) * dx - (x - x1) * dy) / d;
      if (r >= 0 && s >= 0 && s <= 1) {
        return { x: x + r * dx, y: y + r * dy };
      }
    }
  }
  return undefined;
}

function raycast(
  scene: Scene,
  origin: paper.Point,
  direction: paper.Point,
  ignoreEdge: EdgeId
): [paper.Point, EdgeId] | undefined {
  let closest: [paper.Point, EdgeId] | undefined = undefined;
  let closestDistance = Infinity;

  for (const [edgeId, [pointId1, pointId2]] of scene.edges()) {
    if (edgeId === ignoreEdge) {
      continue;
    }

    const [point1, point2] = [
      scene.getPoint(pointId1),
      scene.getPoint(pointId2),
    ];

    const intersection = rayIntersection(
      origin.x,
      origin.y,
      direction.x,
      direction.y,
      point1.x,
      point1.y,
      point2.x,
      point2.y
    );

    if (intersection) {
      const intersectionPoint = new paper.Point(intersection.x, intersection.y);
      const distance = origin.getDistance(intersectionPoint);
      if (distance < closestDistance) {
        closest = [intersectionPoint, edgeId];
        closestDistance = distance;
      }
    }
  }

  return closest;
}

function cutDirectionForEdge(
  edge: [paper.Point, paper.Point],
  winding: Winding
): paper.Point | undefined {
  let [edgePoint1, edgePoint2] = edge;

  if (edgePoint1.getDistance(edgePoint2) < 0.01) {
    console.error(`edge is too short to split ${edgePoint1}, ${edgePoint2}`);
    return undefined;
  }

  const edgeDirection = edgePoint2.subtract(edgePoint1).normalize();
  const cutDirection =
    winding === "clockwise"
      ? edgeDirection.rotate(90, new paper.Point(0, 0))
      : edgeDirection.rotate(-90, new paper.Point(0, 0));

  return cutDirection;
}

function makeCut(
  scene: Scene,
  cycleIds: ReadonlyArray<PointId>,
  cycle: Array<paper.Point>,
  winding: Winding,
  t: number,
  cutPrefix: string = ""
): boolean {
  const { point: start, edge: startEdgePoints } = pointAlongCycle(cycle, t);
  const startSplit = findSplitTarget(scene, start, 0.1);
  if (!startSplit) {
    console.error(`couldn't find edge to split at ${start} in cycle ${cycle}`);
    return false;
  }

  const [_, startEdgeId] = startSplit;
  const cutDirection = cutDirectionForEdge(startEdgePoints, winding);
  if (!cutDirection) {
    console.error(`couldn't find cut direction for edge ${startEdgeId}`);
    return false;
  }

  const end = raycast(scene, start, cutDirection, startEdgeId);
  if (!end) {
    console.error(
      `couldn't find intersection for cut ${start} on ${startEdgeId} in direction ${cutDirection} for cycle ${cycleIds} with winding ${winding}`
    );
    return false;
  }

  const [endPoint, endEdgeId] = end;

  if (cutPrefix === "") {
    cutPrefix = `${t}`;
  }

  const startPointId = scene.addPoint(start, `${cutPrefix}-${startEdgeId}`);
  splitEdge(scene, startEdgeId, startPointId);

  const endPointId = scene.addPoint(endPoint, `${cutPrefix}-${endEdgeId}`);
  splitEdge(scene, endEdgeId, endPointId);

  scene.addEdge(startPointId, endPointId);

  // console.log(
  //   `cut edges ${startEdgeId} and ${endEdgeId} at ${start} and ${endPoint}`
  // );
  return true;
}

function* zip<T extends any[]>(
  ...iterables: { [I in keyof T]: Iterable<T[I]> }
): Iterable<T> {
  const iterators = iterables.map((it) => it[Symbol.iterator]());
  let done = false;

  while (!done) {
    const items = iterators.map((it) => it.next());
    done = items.some((item) => item.done);
    if (!done) {
      yield items.map((item) => item.value) as T;
    }
  }
}

function sum(iter: Iterable<number>): number {
  let total = 0;
  for (const value of iter) {
    total += value;
  }
  return total;
}

function mult(iter: Iterable<number>): number {
  let total = 1;
  for (const value of iter) {
    total *= value;
  }
  return total;
}

export function scoreRooms(
  scene: Scene,
  regions: Map<RegionId, Array<PointId>>,
  weights: ReadonlyArray<number>
): number {
  const sortedRegions: Array<{
    regionId: RegionId;
    pointIds: Array<PointId>;
    path: paper.Path;
    circumference: number;
    area: number;
  }> = [];

  for (const [regionId, pointIds] of regions) {
    const path = new paper.Path();
    for (const pointId of pointIds) {
      path.add(scene.getPoint(pointId));
    }
    path.closed = true;

    const area = Math.abs(path.area);
    const circumference = circumferenceOfCycle(
      pointIds.map((pointId) => scene.getPoint(pointId))
    );
    sortedRegions.push({ regionId, pointIds, path, circumference, area });
  }

  sortedRegions.sort((a, b) => a.area - b.area);
  const sortedWeights = weights.slice().sort((a, b) => a - b);

  const expectedNumRooms = sortedWeights.length;
  const actualNumRooms = sortedRegions.length;

  // Room area scores
  const areaScores = [];
  {
    const averageRoomArea =
      sum(sortedRegions.map((region) => region.area)) / expectedNumRooms;
    const averageRoomWeight = sum(sortedWeights) / expectedNumRooms;

    const normalizedRoomAreas = sortedRegions.map(
      (region) => region.area / averageRoomArea
    );
    const normalizedRoomWeights = sortedWeights.map(
      (weight) => weight / averageRoomWeight
    );

    for (const [area, weight] of zip(
      normalizedRoomAreas,
      normalizedRoomWeights
    )) {
      const roomScore = 1 - Math.abs(area - weight) / Math.max(area, weight);
      // console.log(
      //   `room area score: ${roomScore} for area ${area} and weight ${weight}`
      // );
      areaScores.push(roomScore);
    }
  }

  // Room 'roundness' score
  const roundnessScores = [];
  {
    for (const { circumference, area } of sortedRegions) {
      const ideal = 1 / 16;
      const roundness = area / (circumference * circumference);
      const roundnessScore =
        1 - Math.abs(roundness - ideal) / Math.max(roundness, ideal);

      roundnessScores.push(roundnessScore);
    }
  }

  // Correct number of rooms
  let numRoomsScore = Math.pow(
    1 -
      Math.abs(expectedNumRooms - actualNumRooms) /
        Math.max(expectedNumRooms, actualNumRooms),
    4
  );

  // console.log(`correct num rooms score: ${numRoomsScore}`);

  const overall = sum(areaScores) * sum(roundnessScores) * numRoomsScore;
  return overall;
}

export function generateRooms(
  scene: Scene,
  cycleIds: ReadonlyArray<PointId>,
  roomWeights: ReadonlyArray<number>,
  cutOffsets: ReadonlyArray<number>
): Map<RegionId, Array<PointId>> {
  if (roomWeights.length === 0) {
    return new Map();
  }

  const cycle = cycleIds.map((pointId) => scene.getPoint(pointId));
  const winding = windingOfCycle(cycle);

  let t = 0;
  for (const [i, dt] of enumerateIndexAndItem(cutOffsets)) {
    t += dt;
    if (t >= 1) {
      t -= 1;
    }
    makeCut(scene, cycleIds, cycle, winding, t, `${i}`);
  }

  return findRegions(scene);
}

export type PartitionResult = {
  scene: Scene;
  regions: Map<RegionId, Array<PointId>>;
};

export function generateRandomCuts(
  populationSize: number,
  numRooms: number,
  seed: string
): Array<Array<number>> {
  const random = seedrandom(`${seed}`);

  const result = [];
  for (let i = 0; i < populationSize; i++) {
    const offsets = [];
    for (let i = 1; i < numRooms; i++) {
      offsets.push(random());
    }
    result.push(offsets);
  }

  result[0] = [0.625, 0.25, 0.5];

  return result;
}

export function createRoomPartitioner(
  source: Readonly<Scene>,
  cycleIds: Array<PointId>,
  roomWeights: ReadonlyArray<number>
): Runner<PartitionResult> {
  return (parameters: Array<number>) => {
    const scene = source.clone();
  
    const regions = generateRooms(scene, cycleIds, roomWeights, parameters);
    const score = scoreRooms(scene, regions, roomWeights);
    return {
      score,
      result: {
        scene: scene.clone(),
        regions: regions,
      },
      parameters,
    };
  };
}
