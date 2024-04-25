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

// export function pickBest<T>(
//   runner: Runner<T>,
//   initializer: Initializer,
//   parameters: GeneticParameters
// ): Result<T> {
//   const random = seedrandom("seed");
//   const { populationSize, numGenerations, mutationRate, survivalRate } =
//     parameters;

//   let population: Array<Array<number>> = [];
//   for (let i = 0; i < populationSize; i++) {
//     population.push(initializer(i));
//   }

//   const results: Array<Result<T>> = population.map((parameters) => {
//     return runner(parameters);
//   });

//   // Highest score first
//   results.sort((a, b) => b.score - a.score);
//   for (const result of results) {
//     console.log(result.score);
//   }

//   return results[0];
// }

export function evolve<T extends HasScore>(
  runner: Runner<T>,
  population: Array<Array<number>>,
  parameters: GeneticParameters
): Array<EvolveResult<T>> {
  const random = seedrandom("seed");
  const { numGenerations, mutationRate, survivalRate, cullPopulation } = parameters;
  let populationSize = population.length;

  let allResults = [];

  for (let i = 0; i < numGenerations; i++) {
    const results: Array<EvolveResult<T>> = population.map((parameters) => {
      return {
        ...runner(parameters),
        parameters: parameters,
        generation: i + 1,
      };
    });

    for (const result of results) {
      allResults.push(result);
    }
    allResults.sort((a, b) => b.score - a.score);

    const survivors = allResults.slice(
      0,
      Math.ceil(survivalRate * populationSize)
    );


    console.log(`generation ${i + 1} w/ population size ${populationSize} and ${survivors.length} survivors`)

    populationSize *= cullPopulation;

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

  return allResults;
}
