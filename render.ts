import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { RegionId } from "./regions";

const EDGE_COLORS = [
  "#005f73",
  "#bb3e03",
  "#0a9396",
  "#aa5702",
  "#9b2226",
  "#ae2012",
  "#287271",
];

const FACE_COLORS = [
  "#2a9d8f55",
  "#8ab17d55",
  "#babb7455",
  "#e9c46a55",
  "#efb36655",
  "#f4a26155",
  "#ee895955",
  "#e76f5155",
];

function hashString(s: string): number {
  const hash = s.split("").reduce(function (a, b) {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return Math.abs(hash);
}

export function faceColorForRegion(regionId: RegionId): string {
  return FACE_COLORS[hashString(regionId) % FACE_COLORS.length];
}

export function edgeColorForEdge(edgeId: EdgeId): string {
  return EDGE_COLORS[hashString(edgeId) % EDGE_COLORS.length];
}

export function clearRendering(scope: paper.PaperScope) {
  scope.project.clear();
}

function orderPoints(
  point1: paper.Point,
  point2: paper.Point
): [paper.Point, paper.Point] {
  return point1.x < point2.x || (point1.x === point2.x && point1.y < point2.y)
    ? [point1, point2]
    : [point2, point1];
}

const POINT = ["#ccc", "#555"];
const HOVER = ["#f0f0f0", "#08a"];
const SELECTED = ["#f0f0f0", "#0be"];
const SELECTED_HOVERED = ["#ffffff", "#0cf"];
// const SELECTED = ["#0be", "#555"];
// const SELECTED_HOVERED = ["#0cf", "#777"];

export function renderPoints(
  scope: paper.PaperScope,
  scene: Scene,
  options: {
    hoveredPoint?: paper.Point;
    selectedPointId?: PointId;
  }
) {
  for (const [pointId, point] of scene.points()) {
    const [fill, stroke] = POINT;

    const circle = new paper.Path.Circle(point, 2);
    circle.fillColor = new paper.Color(fill);
    circle.strokeColor = new paper.Color(stroke);
    circle.strokeWidth = 1;
    scope.project.activeLayer.addChild(circle);

    const text = new paper.PointText(point.add(new paper.Point(3, -3)));
    text.fontSize = 6;
    text.content = `${pointId}`;
    scope.project.activeLayer.addChild(text);
  }

  if (options.hoveredPoint) {
    const [fill, stroke] = HOVER;

    const circle = new paper.Path.Circle(options.hoveredPoint, 2);
    circle.fillColor = new paper.Color(fill);
    circle.strokeColor = new paper.Color(stroke);
    circle.strokeWidth = 1;
    scope.project.activeLayer.addChild(circle);
  }

  if (options.selectedPointId) {
    const point = scene.getPoint(options.selectedPointId);
    const [fill, stroke] = options.hoveredPoint === point ? SELECTED_HOVERED : SELECTED;

    const circle = new paper.Path.Circle(point, 3);
    circle.fillColor = new paper.Color(fill);
    circle.strokeColor = new paper.Color(stroke);
    circle.strokeWidth = 1;
    scope.project.activeLayer.addChild(circle);
  }
}

export function renderEdges(scope: paper.PaperScope, scene: Scene) {
  for (const [edge, [point1Id, point2Id]] of scene.edges()) {
    const point1 = scene.getPoint(point1Id);
    const point2 = scene.getPoint(point2Id);

    const line = new paper.Path.Line(point1, point2);
    line.strokeColor = new paper.Color(edgeColorForEdge(edge));
    line.strokeWidth = 2;
    line.strokeCap = "round";
    scope.project.activeLayer.addChild(line);

    {
      const [a, b] = orderPoints(point1, point2);
      const vector = b.subtract(a);
      const center = a.add(vector.multiply(0.6));

      const vectorPerpendicular = vector
        .rotate(90, new paper.Point(0, 0))
        .normalize();
      const offset = vectorPerpendicular
        .multiply(4)
        .add(vector.normalize().multiply(10));

      const labelPoint = center.add(offset);

      const text = new paper.PointText(labelPoint);
      text.rotate(vector.angle, labelPoint);
      text.fontSize = 2;
      text.content = `${edge}`;
      text.justification = "center";
      scope.project.activeLayer.addChild(text);
    }
  }
}

export function renderRegions(
  scope: paper.PaperScope,
  regions: Map<RegionId, Array<PointId>>,
  scene: Scene
) {
  for (const [regionId, cycle] of regions) {
    const regionPath = new paper.Path();
    for (const pointId of cycle) {
      regionPath.add(scene.getPoint(pointId));
    }
    regionPath.closed = true;
    regionPath.fillColor = new paper.Color(faceColorForRegion(regionId));

    const text = new paper.PointText(regionPath.interiorPoint);
    text.fontSize = 4;
    text.content = `${regionId}`;
    text.justification = "center";

    scope.project.activeLayer.addChild(regionPath);
    scope.project.activeLayer.addChild(text);
  }
}
