
import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions } from "./regions";
import { clearRendering, renderEdges, renderPoints, renderRegions } from "./render";

function createPaper(canvasId: string): paper.PaperScope {
  const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
  const divEl = canvasEl.parentElement as HTMLDivElement;

  const paperScope = new paper.PaperScope();
  paperScope.setup(canvasEl);

  paperScope.settings.handleSize = 8;
  paperScope.view.zoom = 3;
  paperScope.settings.insertItems = false;

  function updateSize() {
    paperScope.view.viewSize = new paper.Size(divEl.clientWidth, divEl.clientHeight);
    paperScope.view.center = new paper.Point(0, 0);
  }

  window.addEventListener('resize', () => {
    updateSize();
  });
  updateSize();

  return paperScope;
}

const paper1 = createPaper("canvas1");
const paper2 = createPaper("canvas2");

const scene = new Scene();

/*
 a b c
 d e f
 g h i
*/

const a = scene.addPoint(new paper.Point(-50, -50), 'a');
const b = scene.addPoint(new paper.Point(0, -50), 'b');
const c = scene.addPoint(new paper.Point(50, -50), 'c');
const d = scene.addPoint(new paper.Point(-50, 0), 'd');
// const e = scene.addPoint(new paper.Point(0, 0));
const f = scene.addPoint(new paper.Point(50, 0), 'f');
const g = scene.addPoint(new paper.Point(-50, 50), 'g');
const h = scene.addPoint(new paper.Point(0, 50), 'h');
const i = scene.addPoint(new paper.Point(50, 50), 'i');

scene.addEdge(a, c);
scene.addEdge(c, i);
scene.addEdge(i, g);
scene.addEdge(g, a);
scene.addEdge(b, h);
scene.addEdge(d, f);

// scene.addEdge(a, c);
// scene.addEdge(b, h);
// scene.addEdge(d, f);

const flattened = flattenScene(scene);
const regions = findRegions(flattened);

let hoveredPoint: paper.Point | undefined = undefined;
let selectedPoint: PointId | undefined = undefined;

setInterval(() => {
  clearRendering(paper1);
  renderEdges(paper1, scene);
  renderPoints(paper1, scene, { hoveredPoint, selectedPointId: selectedPoint });

  clearRendering(paper2);
  renderRegions(paper2, regions, flattened);
  renderEdges(paper2, flattened);
}, 1000 / 60);

function findPoint(point: paper.Point): { pointId: PointId | undefined, point: paper.Point | undefined } {
  for (const [pointId, scenePoint] of scene.points()) {
    if (scenePoint.getDistance(point) < 6) {
      return {
        pointId,
        point: scenePoint,
      };
    }
  }

  return {
    pointId: undefined,
    point: undefined,
  };
}

paper1.view.onMouseMove = (event: paper.MouseEvent) => {
  hoveredPoint = undefined;

  const { point } = findPoint(event.point);
  if (point) {
    hoveredPoint = point;
  }
};

paper1.view.onMouseDown = (event: paper.MouseEvent) => {
  selectedPoint = undefined;

  const { pointId } = findPoint(event.point);
  if (pointId) {
    console.log(`selected point: ${pointId}`);
    selectedPoint = pointId;
  }
};
