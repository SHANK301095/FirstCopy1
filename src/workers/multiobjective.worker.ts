/**
 * Multi-Objective Optimizer Worker - Phase 8
 * Pareto-optimal solutions using NSGA-II
 */

interface MultiObjectiveRequest {
  type: 'start' | 'cancel';
  runId: string;
  datasetId: string;
  paramRanges: ParamRange[];
  objectives: ObjectiveConfig[];
  config: {
    populationSize: number;
    generations: number;
    mutationRate: number;
    crossoverRate: number;
  };
}

interface ParamRange {
  name: string;
  start: number;
  end: number;
  step: number;
}

interface ObjectiveConfig {
  name: string;
  type: 'maximize' | 'minimize';
  weight: number;
}

interface Individual {
  genes: Record<string, number>;
  objectives: Record<string, number>;
  rank: number;
  crowdingDistance: number;
}

interface MultiObjectiveProgress {
  type: 'progress';
  runId: string;
  generation: number;
  totalGenerations: number;
  paretoFrontSize: number;
  bestObjectives: Record<string, number>;
}

interface MultiObjectiveComplete {
  type: 'complete';
  runId: string;
  paretoFront: Individual[];
  allIndividuals: Individual[];
}

let isCanceled = false;

// Check if a dominates b
function dominates(a: Individual, b: Individual, objectives: ObjectiveConfig[]): boolean {
  let dominated = false;
  let dominatesAll = true;
  
  for (const obj of objectives) {
    const aVal = a.objectives[obj.name];
    const bVal = b.objectives[obj.name];
    
    if (obj.type === 'maximize') {
      if (aVal < bVal) dominatesAll = false;
      if (aVal > bVal) dominated = true;
    } else {
      if (aVal > bVal) dominatesAll = false;
      if (aVal < bVal) dominated = true;
    }
  }
  
  return dominated && dominatesAll;
}

// Non-dominated sorting
function nonDominatedSort(population: Individual[], objectives: ObjectiveConfig[]): Individual[][] {
  const fronts: Individual[][] = [[]];
  const dominationCount: Map<Individual, number> = new Map();
  const dominatedSet: Map<Individual, Individual[]> = new Map();
  
  for (const p of population) {
    dominationCount.set(p, 0);
    dominatedSet.set(p, []);
    
    for (const q of population) {
      if (p === q) continue;
      
      if (dominates(p, q, objectives)) {
        dominatedSet.get(p)!.push(q);
      } else if (dominates(q, p, objectives)) {
        dominationCount.set(p, dominationCount.get(p)! + 1);
      }
    }
    
    if (dominationCount.get(p) === 0) {
      p.rank = 0;
      fronts[0].push(p);
    }
  }
  
  let i = 0;
  while (fronts[i].length > 0) {
    const nextFront: Individual[] = [];
    
    for (const p of fronts[i]) {
      for (const q of dominatedSet.get(p)!) {
        dominationCount.set(q, dominationCount.get(q)! - 1);
        if (dominationCount.get(q) === 0) {
          q.rank = i + 1;
          nextFront.push(q);
        }
      }
    }
    
    i++;
    fronts.push(nextFront);
  }
  
  return fronts.filter(f => f.length > 0);
}

// Calculate crowding distance
function calculateCrowdingDistance(front: Individual[], objectives: ObjectiveConfig[]): void {
  if (front.length === 0) return;
  
  for (const ind of front) {
    ind.crowdingDistance = 0;
  }
  
  for (const obj of objectives) {
    front.sort((a, b) => a.objectives[obj.name] - b.objectives[obj.name]);
    
    front[0].crowdingDistance = Infinity;
    front[front.length - 1].crowdingDistance = Infinity;
    
    const min = front[0].objectives[obj.name];
    const max = front[front.length - 1].objectives[obj.name];
    const range = max - min || 1;
    
    for (let i = 1; i < front.length - 1; i++) {
      front[i].crowdingDistance += 
        (front[i + 1].objectives[obj.name] - front[i - 1].objectives[obj.name]) / range;
    }
  }
}

// Create random individual
function createRandomIndividual(ranges: ParamRange[]): Record<string, number> {
  const genes: Record<string, number> = {};
  for (const range of ranges) {
    const steps = Math.floor((range.end - range.start) / range.step);
    const randomStep = Math.floor(Math.random() * (steps + 1));
    genes[range.name] = range.start + randomStep * range.step;
  }
  return genes;
}

// Evaluate multiple objectives
async function evaluateObjectives(genes: Record<string, number>, objectives: ObjectiveConfig[]): Promise<Record<string, number>> {
  await new Promise(r => setTimeout(r, 5));
  
  const result: Record<string, number> = {};
  const sum = Object.values(genes).reduce((a, b) => a + b, 0);
  
  for (const obj of objectives) {
    const noise = Math.random() * 0.1;
    switch (obj.name) {
      case 'sharpe':
        result[obj.name] = 0.5 + sum / 1000 + noise;
        break;
      case 'netProfit':
        result[obj.name] = 5000 + sum * 10 + noise * 1000;
        break;
      case 'drawdown':
        result[obj.name] = 5 + sum / 100 + noise * 5;
        break;
      case 'profitFactor':
        result[obj.name] = 1 + sum / 500 + noise;
        break;
      case 'trades':
        result[obj.name] = 50 + Math.random() * 200;
        break;
      default:
        result[obj.name] = Math.random();
    }
  }
  
  return result;
}

// Crossover
function crossover(p1: Record<string, number>, p2: Record<string, number>): Record<string, number> {
  const child: Record<string, number> = {};
  for (const key of Object.keys(p1)) {
    child[key] = Math.random() < 0.5 ? p1[key] : p2[key];
  }
  return child;
}

// Mutation
function mutate(genes: Record<string, number>, ranges: ParamRange[], rate: number): Record<string, number> {
  const mutated = { ...genes };
  for (const range of ranges) {
    if (Math.random() < rate) {
      const steps = Math.floor((range.end - range.start) / range.step);
      mutated[range.name] = range.start + Math.floor(Math.random() * (steps + 1)) * range.step;
    }
  }
  return mutated;
}

async function runMultiObjectiveOptimizer(request: MultiObjectiveRequest) {
  const { runId, paramRanges, objectives, config } = request;
  isCanceled = false;
  
  try {
    // Initialize population
    let population: Individual[] = [];
    
    for (let i = 0; i < config.populationSize; i++) {
      const genes = createRandomIndividual(paramRanges);
      const objectiveValues = await evaluateObjectives(genes, objectives);
      population.push({ genes, objectives: objectiveValues, rank: 0, crowdingDistance: 0 });
    }
    
    // Evolution
    for (let gen = 0; gen < config.generations; gen++) {
      if (isCanceled) {
        self.postMessage({ type: 'error', runId, error: 'Optimization canceled' });
        return;
      }
      
      // Create offspring
      const offspring: Individual[] = [];
      while (offspring.length < config.populationSize) {
        const p1 = population[Math.floor(Math.random() * population.length)];
        const p2 = population[Math.floor(Math.random() * population.length)];
        
        let childGenes = crossover(p1.genes, p2.genes);
        childGenes = mutate(childGenes, paramRanges, config.mutationRate);
        
        const objectiveValues = await evaluateObjectives(childGenes, objectives);
        offspring.push({ genes: childGenes, objectives: objectiveValues, rank: 0, crowdingDistance: 0 });
      }
      
      // Combine parent and offspring
      const combined = [...population, ...offspring];
      
      // Non-dominated sorting
      const fronts = nonDominatedSort(combined, objectives);
      
      // Select next generation
      population = [];
      for (const front of fronts) {
        calculateCrowdingDistance(front, objectives);
        
        if (population.length + front.length <= config.populationSize) {
          population.push(...front);
        } else {
          front.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
          const remaining = config.populationSize - population.length;
          population.push(...front.slice(0, remaining));
          break;
        }
      }
      
      const paretoFront = population.filter(p => p.rank === 0);
      
      self.postMessage({
        type: 'progress',
        runId,
        generation: gen + 1,
        totalGenerations: config.generations,
        paretoFrontSize: paretoFront.length,
        bestObjectives: paretoFront[0]?.objectives || {},
      } as MultiObjectiveProgress);
    }
    
    // Complete
    const paretoFront = population.filter(p => p.rank === 0);
    
    self.postMessage({
      type: 'complete',
      runId,
      paretoFront,
      allIndividuals: population,
    } as MultiObjectiveComplete);
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

self.onmessage = async (event: MessageEvent<MultiObjectiveRequest>) => {
  const request = event.data;
  
  switch (request.type) {
    case 'start':
      await runMultiObjectiveOptimizer(request);
      break;
    case 'cancel':
      isCanceled = true;
      break;
  }
};
