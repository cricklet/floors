
import paper from "paper";
import { EdgeId, PointId, Scene, defaultScene, singlePolygon } from "./scene";
import { createFlattenedScene } from "./flatten";
import { enumerateIndexAndItem, findRegions, sortedRegions } from "./regions";
import { RenderManyScenes, clearRendering, renderEdges, renderHandles, renderPoints, renderRegions } from "./render";
import { EditBehavior } from "./edit";
import { setupPaper, setupEncodedTextArea, setupRoomsTextArea, debounce } from "./dom";
import { setup } from "paper/dist/paper-core";
import { PartitionResult, createRoomPartitioner, defaultManyRooms, defaultRoomsDefinition, generateRandomCuts, generateRooms, scoreRooms, weightForRegionLookup } from "./rooms";
import { EvolveResult, evolve } from "./evolve";

const STARTING_POPULATION = 100;
const EVOLVE_PARAMS = {
  numGenerations: 30,
  startingMutationRate: 0.1,
  survivalRate: 0.2,
  cullPopulation: 0.95,
  mutationAnnealing: 0.9,
};

function setupEvolve() {

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

  let bestResult: EvolveResult<PartitionResult> | undefined = undefined;

  let allResults: Array<EvolveResult<PartitionResult>> = [];

  const manyRenderer = new RenderManyScenes(manyEl);

  let evolver: ReturnType<typeof evolve<PartitionResult>> | undefined = undefined;

  function startUpdate() {
    flattened = createFlattenedScene(scene);
    regions = findRegions(flattened);

    bestResult = undefined;

    const cycle = sortedRegions(regions)[0];
    const roomWeights = roomsDefintion.roomWeights(0);

    const runner = createRoomPartitioner(flattened.subset(cycle), cycle, roomWeights);
    const startingPopulation = generateRandomCuts(STARTING_POPULATION, roomsDefintion.numRooms(0), 'asdf');
    allResults = [];

    if (evolver) {
      evolver.return();
    }

    evolver =
      evolve<PartitionResult>(allResults, runner, startingPopulation, EVOLVE_PARAMS);
  }

  let _evolveGeneration = 0;
  let _lastRenderedEvolveGeneration = -1;
  function continueEvolving() {
    if (!evolver) {
      return;
    }

    _evolveGeneration++;

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

    bestResult = allResults[0];
  }

  let _generation = -1;
  function render() {
    if (_generation !== scene.generation()) {
      _generation = scene.generation();
      startUpdate();
    }

    continueEvolving();

    if (_lastRenderedEvolveGeneration !== _evolveGeneration) {
      const fewerResults = allResults.slice(0, 30);
      manyRenderer.render(
        fewerResults.map((result) => result.scene),
        fewerResults.map((result) => `${result.score.toFixed(0)} (gen: ${result.generation})\narea ${result.scoreParts.area.toFixed(0)}\nsquare ${result.scoreParts.roundness.toFixed(0)}\nangles ${result.scoreParts.angles.toFixed(0)}]`)
      );
      _lastRenderedEvolveGeneration = _evolveGeneration;
    }

    clearRendering(paper1);

    if (bestResult) {
      const bestScene = bestResult.scene;
      const bestRegions = bestResult.regions;
      const areas = bestResult.regionAreas;

      const lookup = weightForRegionLookup(bestRegions, areas, roomsDefintion.roomWeights(0));

      renderRegions(paper1, bestRegions, bestScene, {
        regionNamer: (regionId) => `${lookup(regionId)}`
      });
      renderEdges(paper1, bestScene, {
        edgeWidth: 1,
        showEdgeLengths: true,
      });
      renderEdges(paper1, scene, {
        hideLabels: true,
      });
    } else {
      renderEdges(paper1, scene);
    }
    renderPoints(paper1, scene, {
      hideLabels: true,
    });
    renderHandles(paper1, editBehavior1.renderHints());
  }

  setInterval(() => {
    render();
  }, 1000 / 60);

  roomsDefintion.addListener(startUpdate);
  startUpdate();

  const editBehavior1 = new EditBehavior(paper1, scene);
}

function setupRooms() {

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

  function startUpdating() {
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
      const startingPopulation = generateRandomCuts(STARTING_POPULATION, roomsDefintion.numRooms(i), 'asdf');

      const allResults: Array<EvolveResult<PartitionResult>> = [];
      const generator = evolve<PartitionResult>(allResults, runner, startingPopulation, EVOLVE_PARAMS);

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

  let _generation = -1;
  function render() {
    if (_generation !== scene.generation()) {
      startUpdating();
      _generation = scene.generation();
    }
    continueUpdating();

    clearRendering(paper1);

    if (evolvers.length === 0) {
      renderRegions(paper1, regions, flattened);
      renderEdges(paper1, flattened);
    } else {
      for (const [i, evolver] of enumerateIndexAndItem(evolvers)) {
        const bestScene = evolver.results[0].scene;
        const bestRegions = evolver.results[0].regions;
        const areas = evolver.results[0].regionAreas;

        const lookup = weightForRegionLookup(bestRegions, areas, roomsDefintion.roomWeights(i));

        renderRegions(paper1, bestRegions, bestScene, {
          regionNamer: (regionId) => `${lookup(regionId)}`
        });
        renderEdges(paper1, bestScene, {
          edgeWidth: 1,
          hideLabels: true,
        });
        renderEdges(paper1, flattened, {
          hideLabels: true,
        });
      }
    }

    renderPoints(paper1, flattened, {
      hideLabels: true,
    });
    renderHandles(paper1, editBehavior1.renderHints());
  }

  setInterval(() => {
    render();
  }, 1000 / 60);

  startUpdating();

  window.addEventListener("resize", () => {
    startUpdating();
  });

  roomsDefintion.addListener(startUpdating);

  const editBehavior1 = new EditBehavior(paper1, scene);
}

function setupGraph() {
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
    flattened = createFlattenedScene(scene);
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

const queryString = window.location.search;
if (queryString === '?evolve') {
  document.getElementById("evolve-link")!.className = "selected";
  setupEvolve();
} else if (queryString === '?graph') {
  document.getElementById("graph-link")!.className = "selected";
  setupGraph();
} else {
  document.getElementById("home-link")!.className = "selected";
  setupRooms();
}