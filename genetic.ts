import seedrandom from "seedrandom";
import { generateRooms, scoreRooms } from "./rooms";
import { PointId, Scene } from "./scene";
import { RegionId } from "./regions";

export type Result = {
  score: number;
  scene: Scene;
  regions: Map<RegionId, Array<PointId>>;
};

export function generateRandomly(
  runs: number,
  scene: Readonly<Scene>,
  cycleIds: ReadonlyArray<PointId>,
  roomWeights: ReadonlyArray<number>
): Array<Result> {
  const random = seedrandom("seed");
  const results: Array<Result> = [];

  const inputs: Array<Array<number>> = [];
  for (let i = 0; i < runs; i++) {
    // Start in a random spot
    const randomCuts = [random()];

    // Then incrementally cut from there
    for (let j = 2; j < roomWeights.length; j++) {
      randomCuts.push(random() * 0.5);
    }
    inputs.push(randomCuts);
  }

  console.log(inputs);
  // inputs[0] = [0.5 - 0.125, 0.25 - 0.125, 0.75 - 0.125];

  for (let i = 0; i < runs; i++) {
    const newScene = scene.clone();
    const regions = generateRooms(newScene, cycleIds, roomWeights, inputs[i]);
    results.push({
      score: scoreRooms(newScene, regions, roomWeights),
      scene: newScene,
      regions: regions,
    });
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}
