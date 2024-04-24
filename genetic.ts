import seedrandom from "seedrandom";
import { generateRooms, scoreRooms } from "./rooms";
import { PointId, Scene } from "./scene";
import { RegionId } from "./regions";

type Result = {
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
    const randomCuts = [];
    for (let j = 1; j < roomWeights.length; j++) {
      randomCuts.push(random());
    }
    inputs.push(randomCuts);
  }
  inputs[0] = [0.5 - 0.125, 0.25 - 0.125, 0.75 - 0.125];

  for (let i = 0; i < runs; i++) {
    const newScene = scene.clone();
    const regions = generateRooms(newScene, cycleIds, roomWeights, inputs[i]);
    results.push({
      score: scoreRooms(newScene, regions, roomWeights),
      scene: newScene,
      regions: regions,
    });
    break;
  }

  // results.sort((a, b) => b.score - a.score);

  return results;
}
