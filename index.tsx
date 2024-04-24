
import paper from "paper";
import { EdgeId, PointId, Scene, defaultScene, singlePolygon } from "./scene";
import { flattenScene } from "./flatten";
import { findRegions, sortedRegions } from "./regions";
import { clearRendering, renderEdges, renderHandles, renderPoints, renderRegions } from "./render";
import { EditBehavior } from "./interactions";
import { setupPaper, setupEncodedTextArea, setupRoomsTextArea } from "./dom";
import { setup } from "paper/dist/paper-core";
import { createRoomPartitioner, defaultRoomsDefinition, generateRooms, randomCutGenerator, scoreRooms } from "./rooms";
import {  pickBest } from "./genetic";

const queryString = window.location.search;
if (queryString === '?rooms') {
  const containerEl = document.getElementById("container") as HTMLDivElement;

  const encodedTextArea = document.createElement("textarea");
  encodedTextArea.style.flex = "0.2";
  containerEl.appendChild(encodedTextArea);

  const editEl = document.createElement("div");
  containerEl.appendChild(editEl);

  const manyEl = document.createElement("div");
  manyEl.className = "many";
  containerEl.appendChild(manyEl);

  const roomsTextArea = document.createElement("textarea");
  roomsTextArea.style.flex = "0.2";
  containerEl.appendChild(roomsTextArea);

  const paper1 = setupPaper(editEl);

  const roomsDefintion = defaultRoomsDefinition();
  const scene = singlePolygon();

  setupEncodedTextArea(encodedTextArea, scene);
  setupRoomsTextArea(roomsTextArea, roomsDefintion);

  let flattened = new Scene();
  let regions = new Map<string, Array<string>>();

  let roomScene = new Scene();
  let roomRegions = new Map<string, Array<string>>();

  function update() {
    flattened = flattenScene(scene);
    regions = findRegions(flattened);

    const cycle = sortedRegions(regions)[0];

    const roomWeights = roomsDefintion.roomWeights();
    const runner = createRoomPartitioner(flattened.subset(cycle), cycle, roomWeights);
    const initializer = randomCutGenerator(roomWeights.length, 'zxcv');

    const results = pickBest(runner, initializer, {
      populationSize: 100,
      numGenerations: 10,
      mutationRate: 0.1,
      survivalRate: 0.2,
    });

    roomScene = results.result.scene;
    roomRegions = results.result.regions;

    // const cuts = randomCutOffsets(roomsDefintion.numRooms(), 'zxcv');
    // console.log(cuts);
    // roomRegions = generateRooms(roomScene, cycle, roomsDefintion.rooms(), cuts);

    // console.log(scoreRooms(roomScene, roomRegions, roomsDefintion.rooms()));
  }

  let _generation = -1;
  function render() {
    if (_generation !== scene.generation()) {
      _generation = scene.generation();
      update();
    }

    clearRendering(paper1);
    renderRegions(paper1, roomRegions, roomScene);
    renderEdges(paper1, roomScene);
    renderPoints(paper1, scene);
    renderHandles(paper1, editBehavior1.renderHints());
  }

  setInterval(() => {
    render();
  }, 1000 / 60);

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
