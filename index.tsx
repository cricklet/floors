
import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions } from "./regions";
import { clearRendering, renderEdges, renderHandles, renderPoints, renderRegions } from "./render";
import { EditBehavior } from "./interactions";

const textArea = document.getElementById("state") as HTMLTextAreaElement;

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

let scene = new Scene();

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

scene.addEdge(a, b);
scene.addEdge(b, c);
scene.addEdge(c, f);
scene.addEdge(f, i);
scene.addEdge(i, h);
scene.addEdge(h, g);
scene.addEdge(g, d);
scene.addEdge(d, a);
scene.addEdge(b, h);
scene.addEdge(d, f);

// On paste, decode
textArea.addEventListener('paste', (event) => {
  event.preventDefault();
  const text = event.clipboardData?.getData('text') || '';

  scene.decode(text);
});

let flattened = new Scene();
let regions = new Map<string, Array<string>>();
let currentGeneration = -1;

function update() {
  if (currentGeneration !== scene.generation()) {
    currentGeneration = scene.generation();

    flattened = flattenScene(scene);
    regions = findRegions(flattened);

    textArea.value = scene.encode();
  }

  clearRendering(paper1);
  renderEdges(paper1, scene);
  renderPoints(paper1, scene);
  renderHandles(paper1, editBehavior1.renderHints());

  clearRendering(paper2);
  renderRegions(paper2, regions, flattened);
  renderEdges(paper2, flattened);
  renderPoints(paper2, flattened);
  renderHandles(paper2, editBehavior2.renderHints());
}

setInterval(() => {
  update();
}, 1000 / 60);

const editBehavior1 = new EditBehavior(paper1, scene);
const editBehavior2 = new EditBehavior(paper2, scene);
