import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { RegionId, enumerateIndexAndItem } from "./regions";
import { PointRenderState, RenderHint } from "./interactions";

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
  if (Math.abs(point1.x - point2.x) < 0.1) {
    return point1.y < point2.y ? [point1, point2] : [point2, point1];
  } else {
    return point1.x < point2.x ? [point1, point2] : [point2, point1];
  }
}

type PointStyle = [string, string, number];
const DEFAULT: PointStyle = ["#ccc", "#555", 2];
const HOVER: PointStyle = ["#f0f0f0", "#08a", 2];
const SELECTED: PointStyle = ["#f0f0f0", "#0be", 3];
const SELECTED_HOVERED: PointStyle = ["#ffffff", "#0cf", 3];

export function renderHandles(
  scope: paper.PaperScope,
  hints: Array<RenderHint>
) {
  for (const hint of hints) {
    if (hint.kind === "point") {
      const { point, state } = hint;
      const [fill, stroke, size] =
        state === "hovered"
          ? HOVER
          : state === "selected"
          ? SELECTED
          : state === "selected-hovered"
          ? SELECTED_HOVERED
          : DEFAULT;

      const circle = new paper.Path.Circle(point, size);
      circle.fillColor = new paper.Color(fill);
      circle.strokeColor = new paper.Color(stroke);
      circle.strokeWidth = 1;
      scope.project.activeLayer.addChild(circle);
    } else if (hint.kind === "edge") {
      const { start, end } = hint;

      const line = new paper.Path.Line(start, end);
      line.strokeColor = new paper.Color("#08a");
      line.strokeWidth = 2;
      line.strokeCap = "round";
      scope.project.activeLayer.addChild(line);
    }
  }
}

export function renderPoints(scope: paper.PaperScope, scene: Scene) {
  for (const [pointId, point] of scene.points()) {
    const [fill, stroke, size] = DEFAULT;

    const circle = new paper.Path.Circle(point, size);
    circle.fillColor = new paper.Color(fill);
    circle.strokeColor = new paper.Color(stroke);
    circle.strokeWidth = 1;
    scope.project.activeLayer.addChild(circle);

    if (pointId.length < 6) {
      const text = new paper.PointText(point.add(new paper.Point(3, -3)));
      text.fontSize = 6;
      text.content = `${pointId}`;
      scope.project.activeLayer.addChild(text);
    }
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

    if (edge.length < 10) {
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
  for (const [i, [regionId, cycle]] of enumerateIndexAndItem(regions)) {
    const regionPath = new paper.Path();
    for (const pointId of cycle) {
      regionPath.add(scene.getPoint(pointId));
    }
    regionPath.closed = true;
    regionPath.fillColor = new paper.Color(faceColorForRegion(regionId));
    scope.project.activeLayer.addChild(regionPath);

    const label = regionId.length < 15 ? `${i}:${regionId}` : `${i}`;
    const text = new paper.PointText(regionPath.interiorPoint);
    text.fontSize = 4;
    text.content = label;
    text.justification = "center";
    scope.project.activeLayer.addChild(text);
  }
}

export class RenderManyScenes {
  private _containerEl: HTMLDivElement;

  private _scopes: Array<paper.PaperScope>;
  private _canvasEls: Array<HTMLCanvasElement>;

  constructor(containerEl: HTMLDivElement) {
    this._containerEl = containerEl;
    this._scopes = [];
    this._canvasEls = [];
  }

  _clear() {
    for (const paperScope of this._scopes) {
      paperScope.project.clear();

      // @ts-ignore -- this function exists, and is necessary to avoid memory leaks
      paperScope.remove();
    }

    this._containerEl.innerHTML = "";

    this._scopes = [];
    this._canvasEls = [];
  }

  render(scenes: Array<Scene>, labels: Array<string>) {
    this._clear();

    const width = Math.floor(this._containerEl.clientWidth);

    const gap = 8;

    const gridSize = Math.min(3, Math.ceil(Math.sqrt(scenes.length)));
    let cellWidth = Math.ceil(width - gap * (gridSize - 1)) / gridSize;
    let cellHeight = cellWidth;

    const gridZoom = cellWidth / 200;
    console.log("gridZoom", gridZoom, width, cellWidth);

    for (const [i, scene] of enumerateIndexAndItem(scenes)) {
      const divEl = document.createElement("div");
      divEl.style.width = `calc(100% / ${gridSize} - ${gap}px * ${
        gridSize - 1
      } / ${gridSize})`;
      divEl.style.height = `${cellHeight}px`;
      this._containerEl.appendChild(divEl);

      const labelEl = document.createElement("div");
      labelEl.className = "label";
      labelEl.textContent = labels[i];
      divEl.appendChild(labelEl);

      const canvasEl = document.createElement("canvas");
      canvasEl.width = cellWidth;
      canvasEl.height = cellHeight;
      divEl.appendChild(canvasEl);

      const scope = new paper.PaperScope();
      scope.setup(canvasEl);
      scope.view.viewSize = new paper.Size(cellWidth, cellHeight);
      scope.view.center = new paper.Point(0, 0);
      scope.view.zoom = gridZoom;

      this._scopes.push(scope);
      this._canvasEls.push(canvasEl);

      renderPoints(scope, scene);
      renderEdges(scope, scene);
    }
  }
}
