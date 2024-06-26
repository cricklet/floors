import paper from "paper";
import seedrandom from "seedrandom";
import {
  findSplitTarget,
  createFlattenedScene,
  splitEdge,
  flattenScene,
} from "./flatten";
import {
  RegionId,
  enumerateIndexAndItem,
  findRegions,
  moduloAngle,
  sortedRegions,
} from "./regions";
import { EdgeId, PointId, Scene } from "./scene";
import { Runner } from "./evolve";

export class RoomsDefinition {
  private _roomsPerRegion: Array<Array<number>>;
  private _listeners: Array<() => void>;

  constructor(rooms: Array<Array<number>>) {
    this._roomsPerRegion = rooms;
    this._listeners = [];
  }

  roomWeights(i: number): ReadonlyArray<number> {
    if (i < this._roomsPerRegion.length) {
      const room = this._roomsPerRegion[i];
      return room.length > 0 ? room : [1];
    } else {
      return [1];
    }
  }

  numRooms(i: number): number {
    return this.roomWeights(i).length || 1;
  }

  addListener(listener: () => void) {
    this._listeners.push(listener);
  }

  encode(): string {
    return this._roomsPerRegion.map((rooms) => rooms.join(" ")).join("\n");
  }

  decode(encoded: string) {
    const cleaned = encoded.replace(/[^\s\d.]+/g, "");

    const roomsPerRegion = [];
    for (const line of cleaned.split("\n")) {
      if (line.trim() === "") {
        continue;
      }

      const rooms = line
        .split(" ")
        .map((x) => parseFloat(x))
        .filter((x) => !isNaN(x) && x > 0);

      roomsPerRegion.push(rooms);
    }

    this._roomsPerRegion = roomsPerRegion;
    this._listeners.forEach((listener) => listener());
  }
}

export function defaultRoomsDefinition(): RoomsDefinition {
  return new RoomsDefinition([[1, 1, 1, 1]]);
}

export function defaultManyRooms(): RoomsDefinition {
  return new RoomsDefinition([[1, 1, 1, 1], [2, 1], [1], [3, 1, 1]]);
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
  while (t < 0) {
    t += 1;
  }
  while (t > 1) {
    t -= 1;
  }

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

export type Winding = "clockwise" | "counterclockwise";
export function windingOfCycle(cycle: Array<paper.Point>): Winding {
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
    console.warn(`couldn't find edge to split at ${start} in cycle ${cycle}`);
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
    console.warn(
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

function avg(iter: Iterable<number>): number {
  let total = 0;
  let count = 0;
  for (const value of iter) {
    total += value;
    count += 1;
  }
  return total / count;
}

type RegionWithMetadata = {
  regionId: RegionId;
  pointIds: Array<PointId>;
  path: paper.Path;
  circumference: number;
  area: number;
};

function regionsWithMetadata(
  scene: Scene,
  regions: Map<RegionId, Array<PointId>>
): Array<RegionWithMetadata> {
  const results: Array<{
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
    results.push({ regionId, pointIds, path, circumference, area });
  }

  return results;
}

function angleDifference(angle1: number, angle2: number): number {
  angle1 = moduloAngle(0, angle1);
  angle2 = moduloAngle(0, angle2);

  let difference = Math.abs(angle1 - angle2);
  return Math.min(difference, 360 - difference);
}

export function scoreRooms(
  scene: Scene,
  regions: ReadonlyArray<RegionWithMetadata>,
  weights: ReadonlyArray<number>
): { score: number; scoreParts: ScoreParts } {
  const sortedRegions = regions.slice();
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
      let roomScore = 1 - Math.abs(area - weight) / Math.max(area, weight);
      roomScore = Math.pow(roomScore, 0.75); // Prioritize perfect areas a little less
      // console.log(
      //   `room area score: ${roomScore} for area ${area} and weight ${weight}`
      // );
      areaScores.push(roomScore);
    }
  }

  // Room 'roundness' score
  const squarenessScores = [];
  {
    for (const { circumference, area } of sortedRegions) {
      const ideal = 1 / 16;
      const roundness = area / (circumference * circumference);
      const roundnessScore =
        1 - Math.abs(roundness - ideal) / Math.max(roundness, ideal);

      squarenessScores.push(roundnessScore);
    }
  }

  // Avoid acute angles
  const nonAcuteScores = [];
  const ACUTE_THRESHOLD = 80;
  {
    for (const region of sortedRegions) {
      const points = region.pointIds.map((pointId) => scene.getPoint(pointId));

      let score = 1;
      for (let i = 0; i < points.length; i++) {
        const point1 = points[i];
        const point2 = points[(i + 1) % points.length];
        const point3 = points[(i + 2) % points.length];

        const angle1 = point1.subtract(point2).angle;
        const angle2 = point3.subtract(point2).angle;
        const difference = angleDifference(angle1, angle2);

        score *= Math.min(ACUTE_THRESHOLD, difference) / ACUTE_THRESHOLD;
      }

      nonAcuteScores.push(score);
    }
  }

  // Correct number of rooms
  let numRoomsScore = Math.pow(
    1 -
      Math.abs(expectedNumRooms - actualNumRooms) /
        Math.max(expectedNumRooms, actualNumRooms),
    4
  );

  const areaScore = avg(areaScores);
  const squarenessScore = mult(squarenessScores);
  const anglesScore = avg(nonAcuteScores);

  const overall = Math.ceil(
    (areaScore * (squarenessScore + anglesScore)) * numRoomsScore * 100
  );
  return {
    score: overall,
    scoreParts: {
      area: Math.ceil(areaScore * 100),
      roundness: Math.ceil(squarenessScore * 100),
      angles: Math.ceil(anglesScore * 100),
      rooms: Math.ceil(numRoomsScore * 100),
    },
  };
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

  for (const [i, t] of enumerateIndexAndItem(cutOffsets)) {
    makeCut(scene, cycleIds, cycle, winding, t, `${i}`);
  }

  return findRegions(scene);
}

export interface ScoreParts {
  area: number;
  roundness: number;
  angles: number;
  rooms: number;
}

export type PartitionResult = {
  scene: Scene;
  regions: Map<RegionId, Array<PointId>>;
  regionAreas: Map<RegionId, number>;
  score: number;
  scoreParts: ScoreParts;
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
    const regionsMeta = regionsWithMetadata(scene, regions);
    const { score, scoreParts } = scoreRooms(scene, regionsMeta, roomWeights);
    return {
      score,
      scoreParts,
      scene: scene.clone(),
      regions: regions,
      regionAreas: new Map(
        regionsMeta.map((region) => [region.regionId, region.area])
      ),
    };
  };
}

export function weightForRegionLookup(
  regions: Map<RegionId, Array<PointId>>,
  areas: Map<RegionId, number>,
  weights: ReadonlyArray<number>
): (regionId: RegionId) => number {
  const regionsAndAreas: Array<[RegionId, number]> = [...regions.keys()].map(
    (regionId) => [regionId, areas.get(regionId)!]
  );
  regionsAndAreas.sort((a, b) => b[1] - a[1]);
  const sortedWeights = weights.slice().sort((a, b) => b - a);

  const lookup: Map<RegionId, number> = new Map();
  for (const [[regionId, _], weight] of zip(regionsAndAreas, sortedWeights)) {
    lookup.set(regionId, weight);
  }

  return (regionId: RegionId) => lookup.get(regionId)!;
}
