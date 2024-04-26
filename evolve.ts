import seedrandom from "seedrandom";

type HasScore = {
  score: number;
};

export type Runner<T extends HasScore> = (parameters: Array<number>) => T;

export type Initializer = (seed: number) => Array<number>;

export type GeneticParameters = {
  numGenerations: number;
  startingMutationRate: number;
  survivalRate: number;
  mutationAnnealing: number;
  cullPopulation: number;
};

export type EvolveResult<T> = {
  parameters: Array<number>;
  score: number;
  generation: number;
} & T;

export function* evolve<T extends HasScore>(
  allResults: Array<EvolveResult<T>>,
  runner: Runner<T>,
  population: Array<Array<number>>,
  parameters: GeneticParameters
) {
  const random = seedrandom("seed");
  const {
    numGenerations,
    startingMutationRate,
    survivalRate,
    cullPopulation,
    mutationAnnealing,
  } = parameters;
  const startingPopuplationSize = population.length;

  let currentPopulationSize = startingPopuplationSize;
  let currentMutationRate = startingMutationRate;

  for (let i = 0; i < numGenerations; i++) {
    for (const parameters of population) {
      allResults.push({
        ...runner(parameters),
        parameters: parameters,
        generation: i + 1,
      });

      yield;
    }
    allResults.sort((a, b) => b.score - a.score);
    allResults.length = startingPopuplationSize; // lol

    const survivors = allResults.slice(
      0,
      Math.ceil(survivalRate * currentPopulationSize)
    );

    console.log(
      `generation ${i + 1} w/ population size ${currentPopulationSize} and ${
        survivors.length
      } survivors and mutation rate ${currentMutationRate}`
    );
    currentPopulationSize = Math.ceil(currentPopulationSize * cullPopulation);
    currentMutationRate = currentMutationRate * mutationAnnealing;

    population = [];
    for (let i = 0; i < currentPopulationSize; i++) {
      const survivorIndex =
        i < survivors.length ? i : Math.floor(random() * survivors.length);

      const { parameters } = survivors[survivorIndex];

      const newParameters = parameters.map((parameter) => {
        const delta = (random() - 0.5) * currentMutationRate;
        return parameter + delta;
      });
      population.push(newParameters);
    }
  }
}
