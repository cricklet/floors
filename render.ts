import * as paper from "paper";
import { Scene } from "./scene";

const COLORS = [
  "#005f73",
  "#bb3e03",
  "#0a9396",
  "#ee9b00",
  "#ca6702",
  "#9b2226",
  "#ae2012",
  "#287271",
  "#2a9d8f",
  "#8ab17d",
  "#babb74",
  "#e9c46a",
  "#efb366",
  "#f4a261",
  "#ee8959",
  "#e76f51",
];

function colorForId(id: number): string {
  return COLORS[id % COLORS.length];
}

export function renderEdges(scene: Scene) {
  for (const [edge, [point1, point2]] of scene.edges()) {
    const line = new paper.Path.Line(
      scene.getPoint(point1),
      scene.getPoint(point2)
    );
    line.strokeColor = new paper.Color(colorForId(edge));
    line.strokeWidth = 2;
    line.strokeCap = "round";

    const offset = new paper.Point(2, -2);

    const text1 = new paper.PointText(scene.getPoint(point1).add(offset));
    text1.content = `${point1}`;

    const text2 = new paper.PointText(scene.getPoint(point2).add(offset));
    text2.content = `${point2}`;
  }
}
