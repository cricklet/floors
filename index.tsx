
import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions } from "./regions";
import { clearRendering, renderEdges, renderRegions } from "./render";

function createPaper(canvasId: string): paper.PaperScope {
  const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
  const divEl = canvasEl.parentElement as HTMLDivElement;

  const paperScope = new paper.PaperScope();
  paperScope.setup(canvasEl);

  paperScope.settings.handleSize = 8;
  paperScope.view.zoom = 3;
  paperScope.settings.insertItems = false;

  function updateSize() {
    console.log(`updateSize ${divEl.clientWidth} ${divEl.clientHeight} ${canvasId} ${canvasEl.width} ${canvasEl.height}`);
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

clearRendering(paper1);
renderEdges(paper1, scene);

clearRendering(paper2);
renderRegions(paper2, regions, flattened);
renderEdges(paper2, flattened);

// setInterval(() => {
//   clearRendering();
//   // renderEdges(scene);
//   renderRegions(regions, flattened);
//   renderEdges(flattened);
// }, 1000 / 60);

// class HoverPointHint {
//   hint: paper.Item | undefined;
//   constructor() {
//     this.hint = undefined;
//   }
//   update(point: paper.Point | undefined) {
//     if (this.hint) {
//       this.hint.remove();
//       this.hint = undefined;
//     }

//     // if (this.hint) {
//     //   this.hint.position = point;
//     //   return
//     // }

//     this.hint = new paper.Path.Circle({
//       center: point,
//       radius: 10,
//       fillColor: 'blue',
//     });
//   }
// }

// const hoverPointHint = new HoverPointHint();

// paperScope.view.onMouseMove = (event: paper.MouseEvent) => {
//   // clear selection
//   // look for segments of paths that are near the mouse point
//   paperScope.project.activeLayer.children.forEach((item: paper.Item) => {
//     if (item instanceof paper.Path && item.segments.length > 0) {
//       item.segments.forEach((segment: paper.Segment) => {
//         if (segment.point.getDistance(event.point) < 10) {
//           console.log(segment.point);
//           hoverPointHint.update(segment.point);
//         }
//       });
//     }
//   });

// };

// paperScope.view.onMouseDown = (event: paper.MouseEvent) => {
//   console.log('mouse down', event.point);
// };