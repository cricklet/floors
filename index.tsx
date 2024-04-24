
import paper from "paper";
import { EdgeId, PointId, Scene, defaultScene, singlePolygon } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions, sortedRegions } from "./regions";
import { clearRendering, renderEdges, renderHandles, renderPoints, renderRegions } from "./render";
import { EditBehavior } from "./interactions";
import { setupPaper, setupEncodedTextArea, setupRoomsTextArea } from "./dom";
import { setup } from "paper/dist/paper-core";
import { defaultRoomsDefinition, generateRooms } from "./rooms";

const queryString = window.location.search;
if (queryString === '?rooms') {
  const containerEl = document.getElementById("container") as HTMLDivElement;

  const encodedTextArea = document.createElement("textarea");
  encodedTextArea.style.flex = "0.2";
  containerEl.appendChild(encodedTextArea);

  const div1El = document.createElement("div");
  containerEl.appendChild(div1El);

  const div2El = document.createElement("div");
  containerEl.appendChild(div2El);

  const roomsTextArea = document.createElement("textarea");
  roomsTextArea.style.flex = "0.2";
  containerEl.appendChild(roomsTextArea);

  const paper1 = setupPaper(div1El);
  const paper2 = setupPaper(div2El);

  const roomsDefintion = defaultRoomsDefinition();
  const scene = singlePolygon();

  setupEncodedTextArea(encodedTextArea, scene);
  setupRoomsTextArea(roomsTextArea, roomsDefintion);

  let flattened = new Scene();
  let regions = new Map<string, Array<string>>();
  let rooms: Array<Array<paper.Point>> = [];

  let roomScene = new Scene();

  function update() {
    flattened = flattenScene(scene);
    regions = findRegions(flattened);

    const cycle = sortedRegions(regions)[0];
    roomScene = flattened.subset(cycle);
    rooms = generateRooms(roomScene, cycle, roomsDefintion.rooms());
  }

  function render() {
    clearRendering(paper1);
    renderRegions(paper1, regions, flattened);
    renderEdges(paper1, flattened);
    renderPoints(paper1, flattened);
    renderHandles(paper1, editBehavior1.renderHints());

    clearRendering(paper2);
    renderRegions(paper2, regions, roomScene);
    renderEdges(paper2, roomScene);
    renderPoints(paper2, roomScene);
  }

  setInterval(() => {
    render();
  }, 1000 / 60);

  scene.addListener(update);
  roomsDefintion.addListener(update);
  update();

  const editBehavior1 = new EditBehavior(paper1, scene);
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

else {
  const containerEl = document.getElementById("container") as HTMLDivElement;

  const encodedTextArea = document.createElement("textarea");
  encodedTextArea.style.flex = "0.2";
  containerEl.appendChild(encodedTextArea);

  const div1El = document.createElement("div");
  containerEl.appendChild(div1El);

  const div2El = document.createElement("div");
  containerEl.appendChild(div2El);

  const paper1 = setupPaper(div1El);
  const paper2 = setupPaper(div2El);

  const scene = defaultScene();
  setupEncodedTextArea(encodedTextArea, scene);

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
}
