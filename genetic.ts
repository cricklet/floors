import seedrandom from "seedrandom";

export type Runner<T> = (parameters: Array<number>) => EvolveResult<T>;

export type Initializer = (seed: number) => Array<number>;

export type GeneticParameters = {
  numGenerations: number;
  mutationRate: number;
  survivalRate: number;
};

export type EvolveResult<T> = {
  parameters: Array<number>;
  score: number;
  result: T;
};

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

export function evolve<T>(
  runner: Runner<T>,
  population: Array<Array<number>>,
  parameters: GeneticParameters
): Array<EvolveResult<T>> {
  const random = seedrandom("seed");
  const { numGenerations, mutationRate, survivalRate } = parameters;
  let populationSize = population.length;

  let allResults = [];

  for (let i = 0; i < numGenerations; i++) {
    const results: Array<EvolveResult<T>> = population.map((parameters, i) => {
      console.log(`Running ${i}...`);
      return runner(parameters);
    });

    // Highest score first
    results.sort((a, b) => b.score - a.score);

    for (const result of results) {
      allResults.push(result);
    }

    console.log(populationSize, survivalRate * populationSize);
    const survivors = results.slice(
      0,
      Math.ceil(survivalRate * populationSize)
    );

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

  console.log(allResults);

  return allResults;
}
