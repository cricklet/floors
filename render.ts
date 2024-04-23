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
  return EDGE_COLORS[edgeId % EDGE_COLORS.length];
}

export function clearRendering(scope: paper.PaperScope) {
  scope.project.clear();
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
      const vector = point2.subtract(point1);
      const labelPoint = point1.add(vector.multiply(0.5));
      const text = new paper.PointText(labelPoint);
      text.fontSize = 5;
      text.content = `${edge}`;
      text.justification = "center";
      scope.project.activeLayer.addChild(text);
    }

    {
      const pointOffset = new paper.Point(2, -2);

      const text1 = new paper.PointText(point1.add(pointOffset));
      text1.fontSize = 5;
      text1.content = `${point1Id}`;

      const text2 = new paper.PointText(point2.add(pointOffset));
      text2.fontSize = 5;
      text2.content = `${point2Id}`;

      scope.project.activeLayer.addChild(text1);
      scope.project.activeLayer.addChild(text2);
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
    text.fontSize = 5;
    text.content = `${regionId}`;
    text.justification = "center";

    scope.project.activeLayer.addChild(regionPath);
    scope.project.activeLayer.addChild(text);
  }
}
