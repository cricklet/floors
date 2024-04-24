
import paper from "paper";
import { EdgeId, PointId, Scene, defaultScene } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions } from "./regions";
import { clearRendering, renderEdges, renderHandles, renderPoints, renderRegions } from "./render";
import { EditBehavior } from "./interactions";
import { setupPaper, setupTextArea } from "./dom";

const paper1 = setupPaper("canvas1");
const paper2 = setupPaper("canvas2");
const scene = defaultScene();

let flattened = new Scene();
let regions = new Map<string, Array<string>>();

function update() {
  flattened = flattenScene(scene);
  regions = findRegions(flattened);
}

function render() {
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
  render();
}, 1000 / 60);

scene.addListener(update);
update();

const editBehavior1 = new EditBehavior(paper1, scene);
const editBehavior2 = new EditBehavior(paper2, scene);
