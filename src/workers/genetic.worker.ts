/**
 * Genetic Algorithm Optimizer Worker - Phase 8
 * Evolutionary optimization for strategy parameters
 */

interface GeneticRequest {
  type: 'start' | 'cancel';
  runId: string;
  datasetId: string;
  paramRanges: ParamRange[];
  objective: 'sharpe' | 'netProfit' | 'minDrawdown' | 'profitFactor';
  config: GeneticConfig;
}

interface ParamRange {
  name: string;
  start: number;
  end: number;
  step: number;
}

interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  eliteCount: number;
  tournamentSize: number;
}

interface Individual {
  genes: Record<string, number>;
  fitness: number;
}

interface GeneticProgress {
  type: 'progress';
  runId: string;
  generation: number;
  totalGenerations: number;
  bestFitness: number;
  avgFitness: number;
  bestParams: Record<string, number>;
}

interface GeneticComplete {
  type: 'complete';
  runId: string;
  bestIndividual: Individual;
  population: Individual[];
  convergenceHistory: { generation: number; best: number; avg: number }[];
}

let isCanceled = false;
let currentRunId: string | null = null;

// Generate random individual within param ranges
function createRandomIndividual(ranges: ParamRange[]): Record<string, number> {
  const genes: Record<string, number> = {};
  for (const range of ranges) {
    const steps = Math.floor((range.end - range.start) / range.step);
    const randomStep = Math.floor(Math.random() * (steps + 1));
    genes[range.name] = range.start + randomStep * range.step;
  }
  return genes;
}

// Crossover two parents
function crossover(parent1: Record<string, number>, parent2: Record<string, number>, rate: number): [Record<string, number>, Record<string, number>] {
  if (Math.random() > rate) {
    return [{ ...parent1 }, { ...parent2 }];
  }
  
  const child1: Record<string, number> = {};
  const child2: Record<string, number> = {};
  
  for (const key of Object.keys(parent1)) {
    if (Math.random() < 0.5) {
      child1[key] = parent1[key];
      child2[key] = parent2[key];
    } else {
      child1[key] = parent2[key];
      child2[key] = parent1[key];
    }
  }
  
  return [child1, child2];
}

// Mutate individual
function mutate(individual: Record<string, number>, ranges: ParamRange[], rate: number): Record<string, number> {
  const mutated = { ...individual };
  
  for (const range of ranges) {
    if (Math.random() < rate) {
      const steps = Math.floor((range.end - range.start) / range.step);
      const randomStep = Math.floor(Math.random() * (steps + 1));
      mutated[range.name] = range.start + randomStep * range.step;
    }
  }
  
  return mutated;
}

// Tournament selection
function tournamentSelect(population: Individual[], tournamentSize: number): Individual {
  let best: Individual | null = null;
  
  for (let i = 0; i < tournamentSize; i++) {
    const idx = Math.floor(Math.random() * population.length);
    const candidate = population[idx];
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  
  return best!;
}

/**
 * Fitness evaluation
 * When a real dataset is connected, this should call the backtest engine.
 * Currently uses a heuristic landscape that is LABELED as demo mode.
 * The parent page clearly indicates "[Demo - No Dataset]" when no dataset is wired.
 */
let evaluationMode: 'demo' | 'real' = 'demo';

async function evaluateFitness(genes: Record<string, number>, objective: string): Promise<number> {
  // Heuristic fitness landscape (non-random, deterministic based on params)
  // This creates a smooth, multi-modal landscape for realistic optimizer behavior
  const values = Object.values(genes);
  const n = values.length;
  
  // Rastrigin-like function (standard optimization benchmark) inverted for maximization
  let fitness = 0;
  for (let i = 0; i < n; i++) {
    const normalized = values[i] / 100; // rough normalization
    fitness += normalized * normalized - 0.1 * Math.cos(2 * Math.PI * normalized);
  }
  fitness = 10 * n - fitness; // invert for maximization
  
  // Apply objective-specific scaling
  switch (objective) {
    case 'sharpe': return fitness / (n * 5);         // ~0–2 range
    case 'netProfit': return fitness * 500;            // ~0–50000 range
    case 'minDrawdown': return -(fitness / (n * 2));   // negative = less drawdown
    case 'profitFactor': return 1 + fitness / (n * 8); // ~1–2.5 range
    default: return fitness;
  }
}

async function runGeneticOptimizer(request: GeneticRequest) {
  const { runId, paramRanges, objective, config } = request;
  currentRunId = runId;
  isCanceled = false;
  
  const convergenceHistory: { generation: number; best: number; avg: number }[] = [];
  
  try {
    // Initialize population
    let population: Individual[] = [];
    
    for (let i = 0; i < config.populationSize; i++) {
      const genes = createRandomIndividual(paramRanges);
      const fitness = await evaluateFitness(genes, objective);
      population.push({ genes, fitness });
    }
    
    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);
    
    // Evolution loop
    for (let gen = 0; gen < config.generations; gen++) {
      if (isCanceled) {
        self.postMessage({ type: 'error', runId, error: 'Optimization canceled' });
        return;
      }
      
      const newPopulation: Individual[] = [];
      
      // Elitism - keep best individuals
      for (let i = 0; i < config.eliteCount; i++) {
        newPopulation.push(population[i]);
      }
      
      // Generate rest of population
      while (newPopulation.length < config.populationSize) {
        const parent1 = tournamentSelect(population, config.tournamentSize);
        const parent2 = tournamentSelect(population, config.tournamentSize);
        
        const [child1Genes, child2Genes] = crossover(parent1.genes, parent2.genes, config.crossoverRate);
        
        const mutated1 = mutate(child1Genes, paramRanges, config.mutationRate);
        const mutated2 = mutate(child2Genes, paramRanges, config.mutationRate);
        
        const fitness1 = await evaluateFitness(mutated1, objective);
        const fitness2 = await evaluateFitness(mutated2, objective);
        
        newPopulation.push({ genes: mutated1, fitness: fitness1 });
        if (newPopulation.length < config.populationSize) {
          newPopulation.push({ genes: mutated2, fitness: fitness2 });
        }
      }
      
      population = newPopulation.sort((a, b) => b.fitness - a.fitness);
      
      const avgFitness = population.reduce((sum, ind) => sum + ind.fitness, 0) / population.length;
      
      convergenceHistory.push({
        generation: gen,
        best: population[0].fitness,
        avg: avgFitness,
      });
      
      // Post progress
      self.postMessage({
        type: 'progress',
        runId,
        generation: gen + 1,
        totalGenerations: config.generations,
        bestFitness: population[0].fitness,
        avgFitness,
        bestParams: population[0].genes,
      } as GeneticProgress);
    }
    
    // Complete
    self.postMessage({
      type: 'complete',
      runId,
      bestIndividual: population[0],
      population: population.slice(0, 20),
      convergenceHistory,
      mode: evaluationMode,
    } as GeneticComplete & { mode: string });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

self.onmessage = async (event: MessageEvent<GeneticRequest>) => {
  const request = event.data;
  
  switch (request.type) {
    case 'start':
      await runGeneticOptimizer(request);
      break;
    case 'cancel':
      if (currentRunId === request.runId) {
        isCanceled = true;
      }
      break;
  }
};
