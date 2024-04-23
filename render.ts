import paper from "paper";
import { PointId, Scene } from "./scene";
import { RegionId } from "./regions";

export const EDGE_COLORS = [
  "#005f73",
  "#bb3e03",
  "#0a9396",
  "#aa5702",
  "#9b2226",
  "#ae2012",
  "#287271",
];
export const FACE_COLORS = [
  "#2a9d8f55",
  "#8ab17d55",
  "#babb7455",
  "#e9c46a55",
  "#efb36655",
  "#f4a26155",
  "#ee895955",
  "#e76f5155",
];

export function clearRendering() {
  paper.project.clear();
}

export function renderEdges(scene: Scene) {
  for (const [edge, [point1, point2]] of scene.edges()) {
    const line = new paper.Path.Line(
      scene.getPoint(point1),
      scene.getPoint(point2)
    );
    line.strokeColor = new paper.Color(EDGE_COLORS[edge % EDGE_COLORS.length]);
    line.strokeWidth = 2;
    line.strokeCap = "round";

    const offset = new paper.Point(2, -2);

    const text1 = new paper.PointText(scene.getPoint(point1).add(offset));
    text1.content = `${point1}`;

    const text2 = new paper.PointText(scene.getPoint(point2).add(offset));
    text2.content = `${point2}`;
  }
}

export function renderRegions(
  regions: Map<RegionId, Array<PointId>>,
  scene: Scene
) {
  for (const [regionId, cycle] of regions) {
    const regionPath = new paper.Path();
    for (const pointId of cycle) {
      regionPath.add(scene.getPoint(pointId));
    }
    regionPath.closed = true;
    regionPath.fillColor = new paper.Color(
      FACE_COLORS[regionId % FACE_COLORS.length]
    );
  }
}
