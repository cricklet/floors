import seedrandom from "seedrandom";

export type Runner<T> = (parameters: Array<number>) => Result<T>;

export type Initializer = (seed: number) => Array<number>;

export type GeneticParameters = {
  populationSize: number;
  numGenerations: number;
  mutationRate: number;
  survivalRate: number;
};

type Result<T> = {
  parameters: Array<number>;
  score: number;
  result: T;
};

export function pickBest<T>(
  runner: Runner<T>,
  initializer: Initializer,
  parameters: GeneticParameters
): Result<T> {
  const random = seedrandom("seed");
  const { populationSize, numGenerations, mutationRate, survivalRate } =
    parameters;

  let population: Array<Array<number>> = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(initializer(i));
  }

  const results: Array<Result<T>> = population.map((parameters) => {
    return runner(parameters);
  });

  // Highest score first
  results.sort((a, b) => b.score - a.score);
  for (const result of results) {
    console.log(result.score);
  }

  return results[0];
}

// export function evolve<T>(
//   runner: Runner<T>,
//   initializer: Initializer,
//   parameters: GeneticParameters
// ): Array<Result<T>> {
//   const random = seedrandom("seed");
//   const { populationSize, numGenerations, mutationRate, survivalRate } =
//     parameters;

//   let population: Array<Array<number>> = [];
//   for (let i = 0; i < populationSize; i++) {
//     population.push(initializer(i));
//   }

//   let bestResults = [];

//   for (let i = 0; i < numGenerations; i++) {
//     const results: Array<Result<T>> = population.map((parameters) => {
//       return runner(parameters);
//     });

//     // Highest score first
//     results.sort((a, b) => b.score - a.score);
//     bestResults.push(results[0]);

//     const survivors = results.slice(
//       0,
//       Math.floor(survivalRate * populationSize)
//     );

//     population = [];
//     for (let i = 0; i < populationSize; i++) {
//       const survivorIndex =
//         i < survivors.length ? i : Math.floor(random() * survivors.length);

//       const { parameters } = survivors[survivorIndex];

//       const newParameters = parameters.map((parameter) => {
//         const delta = (random() - 0.5) * mutationRate;
//         return parameter + delta;
//       });
//       population.push(newParameters);
//     }
//   }

//   console.log(bestResults);

//   return bestResults;
// }
