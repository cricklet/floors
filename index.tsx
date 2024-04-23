/*
verticies: Map<VertexId, Point>
edges: Array<[VertexId, VertexId]>

how to compute faces?
*/

import * as paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions } from "./regions";
import { renderEdges } from "./render";

const canvasEl = document.getElementById('canvas') as HTMLCanvasElement;
const paperScope = new paper.PaperScope();
paperScope.setup(canvasEl);
paperScope.settings.handleSize = 8;
paperScope.view.zoom = 3;
paperScope.view.center = new paper.Point(0, 0);


/*
 a b c
 d e f
 g h i
*/

const scene = new Scene();

const a = scene.addPoint(new paper.Point(-50, -50));
const b = scene.addPoint(new paper.Point(0, -50));
const c = scene.addPoint(new paper.Point(50, -50));
const d = scene.addPoint(new paper.Point(-50, 0));
// const e = scene.addPoint(new paper.Point(0, 0));
const f = scene.addPoint(new paper.Point(50, 0));
const g = scene.addPoint(new paper.Point(-50, 50));
const h = scene.addPoint(new paper.Point(0, 50));
const i = scene.addPoint(new paper.Point(50, 50));

scene.addEdge(a, c);
scene.addEdge(c, i);
scene.addEdge(i, g);
scene.addEdge(g, a);
scene.addEdge(b, h);
scene.addEdge(d, f);

const flattened = flattenScene(scene);
const regions = findRegions(flattened);

renderEdges(flattened);
// renderEdges(scene);

// new paper.Path.Circle({
//   center: new paper.Point(100, 100),
//   radius: 50,
//   fillColor: 'orange',
// });

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

// resize canvas automatically
window.addEventListener('resize', () => {
  paperScope.view.viewSize = new paper.Size(window.innerWidth, window.innerHeight);
  paperScope.view.center = new paper.Point(0, 0);
});