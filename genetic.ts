import seedrandom from "seedrandom";

type HasScore = {
  score: number;
};

export type Runner<T extends HasScore> = (parameters: Array<number>) => T;

export type Initializer = (seed: number) => Array<number>;

export type GeneticParameters = {
  numGenerations: number;
  mutationRate: number;
  survivalRate: number;
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
  parameters: GeneticParameters,
) {
  const random = seedrandom("seed");
  const { numGenerations, mutationRate, survivalRate, cullPopulation } =
    parameters;
  let populationSize = population.length;

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

    const survivors = allResults.slice(
      0,
      Math.ceil(survivalRate * populationSize)
    );

    console.log(
      `generation ${i + 1} w/ population size ${populationSize} and ${
        survivors.length
      } survivors`
    );
    populationSize = Math.ceil(populationSize * cullPopulation);

    population = [];
    for (let i = 0; i < populationSize; i++) {
      const survivorIndex =
        i < survivors.length ? i : Math.floor(random() * survivors.length);

      const { parameters } = survivors[survivorIndex];

      const newParameters = parameters.map((parameter) => {
        const delta = (random() - 0.5) * mutationRate;
        return parameter + delta;
      });
      population.push(newParameters);
    }
  }
}
