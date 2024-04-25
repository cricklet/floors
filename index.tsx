
import paper from "paper";
import { EdgeId, PointId, Scene, defaultScene, singlePolygon } from "./scene";
import { createFlattenedScene } from "./flatten";
import { findRegions, sortedRegions } from "./regions";
import { RenderManyScenes, clearRendering, renderEdges, renderHandles, renderPoints, renderRegions } from "./render";
import { EditBehavior } from "./interactions";
import { setupPaper, setupEncodedTextArea, setupRoomsTextArea, debounce } from "./dom";
import { setup } from "paper/dist/paper-core";
import { PartitionResult, createRoomPartitioner, defaultManyRooms, defaultRoomsDefinition, generateRandomCuts, generateRooms, scoreRooms } from "./rooms";
import { EvolveResult, evolve } from "./genetic";

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

  let bestScene: Scene | undefined = new Scene();
  let bestRegions = new Map<string, Array<string>>();

  let allResults: Array<EvolveResult<PartitionResult>> = [];

  const manyRenderer = new RenderManyScenes(manyEl);

  let evolver: ReturnType<typeof evolve<PartitionResult>> | undefined = undefined;

  function startUpdate() {
    flattened = createFlattenedScene(scene);
    regions = findRegions(flattened);

    bestScene = undefined;
    bestRegions = new Map<string, Array<string>>();

    const cycle = sortedRegions(regions)[0];
    const roomWeights = roomsDefintion.roomWeights(0);

    const runner = createRoomPartitioner(flattened.subset(cycle), cycle, roomWeights);
    const startingPopulation = generateRandomCuts(100, roomsDefintion.numRooms(0), 'asdf');
    allResults = [];

    if (evolver) {
      evolver.return();
    }

    evolver =
      evolve<PartitionResult>(allResults, runner, startingPopulation, {
        numGenerations: 20,
        mutationRate: 0.05,
        survivalRate: 0.2,
        cullPopulation: 0.95,
      });
  }

  function continueEvolving() {
    if (!evolver) {
      return;
    }

    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      if (Date.now() - startTime > 16) {
        break;
      }

      const { done } = evolver.next();
      if (done) {
        evolver = undefined;
        break;
      }
    }

    bestScene = allResults[0].scene;
    bestRegions = allResults[0].regions;
  }

  let _generation = -1;
  function render() {
    if (_generation !== scene.generation()) {
      _generation = scene.generation();
      startUpdate();
    }

    continueEvolving();

    const fewerResults = allResults.slice(0, 20);
    manyRenderer.render(
      fewerResults.map((result) => result.scene),
      fewerResults.map((result) => `${result.score.toFixed(0)} (${result.generation})`)
    );

    clearRendering(paper1);

    if (bestScene) {
      renderRegions(paper1, bestRegions, bestScene);
      renderEdges(paper1, bestScene);
    } else {
      renderEdges(paper1, scene);
    }
    renderPoints(paper1, scene);
    renderHandles(paper1, editBehavior1.renderHints());
  }

  setInterval(() => {
    render();
  }, 1000 / 60);

  roomsDefintion.addListener(startUpdate);
  startUpdate();

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

  const editEl = document.createElement("div");
  containerEl.appendChild(editEl);

  const roomsTextArea = document.createElement("textarea");
  roomsTextArea.style.flex = "0.2";
  containerEl.appendChild(roomsTextArea);

  const paper1 = setupPaper(editEl);

  const roomsDefintion = defaultManyRooms();
  const scene = defaultScene();

  setupEncodedTextArea(encodedTextArea, scene);
  setupRoomsTextArea(roomsTextArea, roomsDefintion);

  let flattened = new Scene();
  let regions = new Map<string, Array<string>>();

  let evolvers = new Array<{
    results: Array<EvolveResult<PartitionResult>>,
    generator: ReturnType<typeof evolve<PartitionResult>>
  }>();

  let _generation = -1;
  function startUpdating() {
    if (_generation === scene.generation()) {
      return;
    }

    _generation = scene.generation();

    flattened = createFlattenedScene(scene);
    regions = findRegions(flattened);

    const sorted = sortedRegions(regions);

    for (const evolver of evolvers) {
      evolver.generator.return();
    }

    evolvers = sorted.map((cycle, i) => {
      const roomWeights = roomsDefintion.roomWeights(i);
      const runner = createRoomPartitioner(flattened.subset(cycle), cycle, roomWeights);
      const startingPopulation = generateRandomCuts(100, roomsDefintion.numRooms(0), 'asdf');

      const allResults: Array<EvolveResult<PartitionResult>> = [];
      const generator = evolve<PartitionResult>(allResults, runner, startingPopulation, {
        numGenerations: 20,
        mutationRate: 0.05,
        survivalRate: 0.2,
        cullPopulation: 0.95,
      });

      return { results: allResults, generator };
    });
  }

  function continueUpdating() {
    const startTime = Date.now();

    for (let i = 0; i < 1000; i++) {
      if (Date.now() - startTime > 16) {
        break;
      }

      for (const evolver of evolvers) {
        const { done } = evolver.generator.next();
        if (done) {
          continue;
        }
      }
    }
  }

  function render() {
    startUpdating();
    continueUpdating();

    clearRendering(paper1);
    renderPoints(paper1, flattened);
    renderHandles(paper1, editBehavior1.renderHints());

    if (evolvers.length === 0) {
      renderRegions(paper1, regions, flattened);
      renderEdges(paper1, flattened);
    } else {
      for (const evolver of evolvers) {
        const bestScene = evolver.results[0].scene;
        const bestRegions = evolver.results[0].regions;

        renderRegions(paper1, bestRegions, bestScene);
        renderEdges(paper1, bestScene);
      }
    }
  }

  setInterval(() => {
    render();
  }, 1000 / 60);

  startUpdating();

  window.addEventListener("resize", () => {
    startUpdating();
  });

  const editBehavior1 = new EditBehavior(paper1, scene);
}
