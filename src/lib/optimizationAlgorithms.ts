/**
 * Advanced Optimization Algorithms
 * Phase D61-78: Grid Search, Genetic, PSO, Bayesian, Walk-Forward
 */

export interface ParamRange {
  name: string;
  min: number;
  max: number;
  step: number;
  type: 'integer' | 'float';
}

export interface OptimizationResult {
  params: Record<string, number>;
  fitness: number;
  metrics: {
    netProfit: number;
    sharpeRatio: number;
    maxDrawdown: number;
    profitFactor: number;
    winRate: number;
    totalTrades: number;
  };
}

export interface OptimizationProgress {
  generation: number;
  totalGenerations: number;
  evaluated: number;
  totalEvaluations: number;
  bestFitness: number;
  currentBest: OptimizationResult | null;
  eliteResults: OptimizationResult[];
  convergenceHistory: number[];
}

export type ObjectiveFunction = 'sharpe' | 'netProfit' | 'minDrawdown' | 'profitFactor' | 'calmar' | 'sortino' | 'custom';

export interface GeneticConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  eliteCount: number;
  tournamentSize: number;
  objective: ObjectiveFunction;
}

export interface PSOConfig {
  swarmSize: number;
  iterations: number;
  inertiaWeight: number;
  inertiaDecay?: number; // Phase 2: decay factor per iteration (e.g. 0.99)
  inertiaMin?: number;   // Phase 2: minimum inertia (e.g. 0.4)
  cognitiveCoeff: number;
  socialCoeff: number;
  objective: ObjectiveFunction;
}

export interface WalkForwardConfig {
  inSampleRatio: number;
  outOfSampleRatio: number;
  windows: number;
  anchorStart: boolean;
  reoptimizeEachWindow: boolean;
  objective: ObjectiveFunction;
}

// Grid Search Generator
export function* generateGridCombinations(
  ranges: ParamRange[]
): Generator<Record<string, number>> {
  if (ranges.length === 0) {
    yield {};
    return;
  }
  
  const [first, ...rest] = ranges;
  
  for (let value = first.min; value <= first.max; value += first.step) {
    const adjustedValue = first.type === 'integer' ? Math.round(value) : value;
    
    for (const restCombo of generateGridCombinations(rest)) {
      yield { [first.name]: adjustedValue, ...restCombo };
    }
  }
}

export function countGridCombinations(ranges: ParamRange[]): number {
  return ranges.reduce((acc, range) => {
    const steps = Math.ceil((range.max - range.min) / range.step) + 1;
    return acc * steps;
  }, 1);
}

// Genetic Algorithm Implementation
export class GeneticOptimizer {
  private config: GeneticConfig;
  private ranges: ParamRange[];
  private population: OptimizationResult[] = [];
  private generation = 0;
  private bestEver: OptimizationResult | null = null;
  private convergenceHistory: number[] = [];
  
  constructor(ranges: ParamRange[], config: GeneticConfig) {
    this.ranges = ranges;
    this.config = config;
  }
  
  initializePopulation(): Record<string, number>[] {
    const individuals: Record<string, number>[] = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      const individual: Record<string, number> = {};
      
      for (const range of this.ranges) {
        const value = range.min + Math.random() * (range.max - range.min);
        individual[range.name] = range.type === 'integer' ? Math.round(value) : value;
      }
      
      individuals.push(individual);
    }
    
    return individuals;
  }
  
  updatePopulation(results: OptimizationResult[]): void {
    this.population = results;
    this.generation++;
    
    // Track best
    const sorted = [...results].sort((a, b) => b.fitness - a.fitness);
    if (!this.bestEver || sorted[0].fitness > this.bestEver.fitness) {
      this.bestEver = sorted[0];
    }
    
    this.convergenceHistory.push(sorted[0].fitness);
  }
  
  evolve(): Record<string, number>[] {
    if (this.population.length === 0) {
      return this.initializePopulation();
    }
    
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    const newPopulation: Record<string, number>[] = [];
    
    // Elitism - keep best individuals
    for (let i = 0; i < this.config.eliteCount && i < sorted.length; i++) {
      newPopulation.push({ ...sorted[i].params });
    }
    
    // Fill rest with crossover and mutation
    while (newPopulation.length < this.config.populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelect(sorted);
      const parent2 = this.tournamentSelect(sorted);
      
      // Crossover
      let child: Record<string, number>;
      if (Math.random() < this.config.crossoverRate) {
        child = this.crossover(parent1.params, parent2.params);
      } else {
        child = { ...parent1.params };
      }
      
      // Mutation
      if (Math.random() < this.config.mutationRate) {
        child = this.mutate(child);
      }
      
      newPopulation.push(child);
    }
    
    return newPopulation;
  }
  
  private tournamentSelect(sorted: OptimizationResult[]): OptimizationResult {
    const tournament: OptimizationResult[] = [];
    
    for (let i = 0; i < this.config.tournamentSize; i++) {
      const idx = Math.floor(Math.random() * sorted.length);
      tournament.push(sorted[idx]);
    }
    
    return tournament.reduce((best, curr) => 
      curr.fitness > best.fitness ? curr : best
    );
  }
  
  private crossover(
    parent1: Record<string, number>,
    parent2: Record<string, number>
  ): Record<string, number> {
    const child: Record<string, number> = {};
    
    for (const range of this.ranges) {
      // Blend crossover
      const alpha = Math.random();
      const value = alpha * parent1[range.name] + (1 - alpha) * parent2[range.name];
      child[range.name] = range.type === 'integer' ? Math.round(value) : value;
    }
    
    return child;
  }
  
  private mutate(individual: Record<string, number>): Record<string, number> {
    const mutated = { ...individual };
    
    // Mutate random parameter
    const rangeIdx = Math.floor(Math.random() * this.ranges.length);
    const range = this.ranges[rangeIdx];
    
    // Gaussian mutation
    const std = (range.max - range.min) * 0.1;
    let newValue = mutated[range.name] + (Math.random() * 2 - 1) * std;
    newValue = Math.max(range.min, Math.min(range.max, newValue));
    
    mutated[range.name] = range.type === 'integer' ? Math.round(newValue) : newValue;
    
    return mutated;
  }
  
  getProgress(): OptimizationProgress {
    const elite = [...this.population]
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, 10);
    
    return {
      generation: this.generation,
      totalGenerations: this.config.generations,
      evaluated: this.generation * this.config.populationSize,
      totalEvaluations: this.config.generations * this.config.populationSize,
      bestFitness: this.bestEver?.fitness || 0,
      currentBest: this.bestEver,
      eliteResults: elite,
      convergenceHistory: this.convergenceHistory,
    };
  }
  
  isComplete(): boolean {
    return this.generation >= this.config.generations;
  }
}

// Particle Swarm Optimization
export class PSOOptimizer {
  private config: PSOConfig;
  private ranges: ParamRange[];
  private particles: {
    position: Record<string, number>;
    velocity: Record<string, number>;
    bestPosition: Record<string, number>;
    bestFitness: number;
  }[] = [];
  private globalBest: { position: Record<string, number>; fitness: number } | null = null;
  private iteration = 0;
  private convergenceHistory: number[] = [];
  
  constructor(ranges: ParamRange[], config: PSOConfig) {
    this.ranges = ranges;
    this.config = config;
  }
  
  initialize(): Record<string, number>[] {
    this.particles = [];
    
    for (let i = 0; i < this.config.swarmSize; i++) {
      const position: Record<string, number> = {};
      const velocity: Record<string, number> = {};
      
      for (const range of this.ranges) {
        position[range.name] = range.min + Math.random() * (range.max - range.min);
        velocity[range.name] = (Math.random() * 2 - 1) * (range.max - range.min) * 0.1;
        
        if (range.type === 'integer') {
          position[range.name] = Math.round(position[range.name]);
        }
      }
      
      this.particles.push({
        position,
        velocity,
        bestPosition: { ...position },
        bestFitness: -Infinity,
      });
    }
    
    return this.particles.map(p => ({ ...p.position }));
  }
  
  updateWithResults(results: OptimizationResult[]): void {
    for (let i = 0; i < results.length && i < this.particles.length; i++) {
      const particle = this.particles[i];
      const fitness = results[i].fitness;
      
      // Update personal best
      if (fitness > particle.bestFitness) {
        particle.bestFitness = fitness;
        particle.bestPosition = { ...particle.position };
      }
      
      // Update global best
      if (!this.globalBest || fitness > this.globalBest.fitness) {
        this.globalBest = { position: { ...particle.position }, fitness };
      }
    }
    
    this.iteration++;
    if (this.globalBest) {
      this.convergenceHistory.push(this.globalBest.fitness);
    }
  }
  
  step(): Record<string, number>[] {
    if (this.particles.length === 0) {
      return this.initialize();
    }
    
    // Phase 2: Apply inertia decay
    const decay = this.config.inertiaDecay ?? 1;
    const minInertia = this.config.inertiaMin ?? 0.4;
    const currentInertia = Math.max(minInertia, this.config.inertiaWeight * Math.pow(decay, this.iteration));

    for (const particle of this.particles) {
      for (const range of this.ranges) {
        // Update velocity
        const r1 = Math.random();
        const r2 = Math.random();
        
        const cognitive = this.config.cognitiveCoeff * r1 * 
          (particle.bestPosition[range.name] - particle.position[range.name]);
        
        const social = this.config.socialCoeff * r2 * 
          ((this.globalBest?.position[range.name] || particle.position[range.name]) - particle.position[range.name]);
        
        particle.velocity[range.name] = 
          currentInertia * particle.velocity[range.name] + cognitive + social;
        
        // Update position
        let newPos = particle.position[range.name] + particle.velocity[range.name];
        newPos = Math.max(range.min, Math.min(range.max, newPos));
        particle.position[range.name] = range.type === 'integer' ? Math.round(newPos) : newPos;
      }
    }
    
    return this.particles.map(p => ({ ...p.position }));
  }
  
  getProgress(): OptimizationProgress {
    return {
      generation: this.iteration,
      totalGenerations: this.config.iterations,
      evaluated: this.iteration * this.config.swarmSize,
      totalEvaluations: this.config.iterations * this.config.swarmSize,
      bestFitness: this.globalBest?.fitness || 0,
      currentBest: this.globalBest ? {
        params: this.globalBest.position,
        fitness: this.globalBest.fitness,
        metrics: { netProfit: 0, sharpeRatio: 0, maxDrawdown: 0, profitFactor: 0, winRate: 0, totalTrades: 0 },
      } : null,
      eliteResults: [],
      convergenceHistory: this.convergenceHistory,
    };
  }
  
  isComplete(): boolean {
    return this.iteration >= this.config.iterations;
  }
}

// Walk-Forward Analysis
export interface WalkForwardWindow {
  inSampleStart: number;
  inSampleEnd: number;
  outOfSampleStart: number;
  outOfSampleEnd: number;
  optimizedParams: Record<string, number>;
  inSampleMetrics: OptimizationResult['metrics'];
  outOfSampleMetrics: OptimizationResult['metrics'];
}

export function generateWalkForwardWindows(
  dataLength: number,
  config: WalkForwardConfig
): { inSampleRange: [number, number]; outOfSampleRange: [number, number] }[] {
  const windows: { inSampleRange: [number, number]; outOfSampleRange: [number, number] }[] = [];
  
  const totalRatio = config.inSampleRatio + config.outOfSampleRatio;
  const windowSize = Math.floor(dataLength / config.windows);
  
  for (let i = 0; i < config.windows; i++) {
    const windowStart = config.anchorStart ? 0 : i * windowSize;
    const windowEnd = (i + 1) * windowSize;
    
    const inSampleSize = Math.floor((windowEnd - windowStart) * (config.inSampleRatio / totalRatio));
    
    windows.push({
      inSampleRange: [windowStart, windowStart + inSampleSize],
      outOfSampleRange: [windowStart + inSampleSize, windowEnd],
    });
  }
  
  return windows;
}

// Fitness function factory
export function createFitnessFunction(objective: ObjectiveFunction): (metrics: OptimizationResult['metrics']) => number {
  switch (objective) {
    case 'sharpe':
      return (m) => m.sharpeRatio;
    case 'netProfit':
      return (m) => m.netProfit;
    case 'minDrawdown':
      return (m) => -m.maxDrawdown; // Negate so higher is better
    case 'profitFactor':
      return (m) => m.profitFactor;
    case 'calmar':
      return (m) => m.maxDrawdown > 0 ? m.netProfit / m.maxDrawdown : 0;
    case 'sortino':
      return (m) => m.sharpeRatio * 1.2; // Approximation
    default:
      return (m) => m.sharpeRatio;
  }
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Monte Carlo Block Bootstrap
// ═══════════════════════════════════════════════════════════

export interface MonteCarloConfig {
  simulations: number;
  blockSize: number;         // block bootstrap length
  confidenceLevels: number[]; // e.g. [0.05, 0.25, 0.50, 0.75, 0.95]
  ruinThreshold?: number;     // e.g. 0.5 = 50% drawdown = ruin
  seed?: number;              // deterministic seed
}

export interface MonteCarloResult {
  equityCurves: number[][];
  percentiles: Record<number, number[]>; // percentile -> equity curve
  ruinProbability: number;
  medianFinalEquity: number;
  meanFinalEquity: number;
  maxDrawdownDistribution: number[]; // array of max DD per sim
}

/**
 * Seeded PRNG (Mulberry32) for deterministic Monte Carlo
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function runMonteCarloBlockBootstrap(
  tradeReturns: number[],
  initialEquity: number,
  config: MonteCarloConfig
): MonteCarloResult {
  const rng = config.seed != null ? mulberry32(config.seed) : Math.random;
  const { simulations, blockSize, confidenceLevels, ruinThreshold = 0.5 } = config;
  const n = tradeReturns.length;
  if (n === 0) {
    return {
      equityCurves: [], percentiles: {}, ruinProbability: 0,
      medianFinalEquity: initialEquity, meanFinalEquity: initialEquity,
      maxDrawdownDistribution: [],
    };
  }

  const allFinals: number[] = [];
  const allMaxDD: number[] = [];
  const curveLen = n;
  // Store all curves for percentile calc
  const curvesMatrix: number[][] = [];
  let ruinCount = 0;

  for (let sim = 0; sim < simulations; sim++) {
    let equity = initialEquity;
    let peak = equity;
    let maxDD = 0;
    const curve: number[] = [equity];

    let idx = 0;
    while (idx < curveLen) {
      // pick random block start
      const blockStart = Math.floor(rng() * (n - blockSize + 1));
      for (let b = 0; b < blockSize && idx < curveLen; b++, idx++) {
        equity *= (1 + tradeReturns[(blockStart + b) % n]);
        if (equity > peak) peak = equity;
        const dd = (peak - equity) / peak;
        if (dd > maxDD) maxDD = dd;
        curve.push(equity);
      }
    }

    allFinals.push(equity);
    allMaxDD.push(maxDD);
    curvesMatrix.push(curve);
    if (maxDD >= ruinThreshold) ruinCount++;
  }

  // Compute percentile curves
  const percentiles: Record<number, number[]> = {};
  for (const pct of confidenceLevels) {
    const pctCurve: number[] = [];
    for (let t = 0; t <= curveLen; t++) {
      const vals = curvesMatrix.map(c => c[t] ?? c[c.length - 1]).sort((a, b) => a - b);
      const idx = Math.floor(pct * (vals.length - 1));
      pctCurve.push(vals[idx]);
    }
    percentiles[pct] = pctCurve;
  }

  const sorted = [...allFinals].sort((a, b) => a - b);

  return {
    equityCurves: curvesMatrix.slice(0, 20), // keep first 20 for charting
    percentiles,
    ruinProbability: ruinCount / simulations,
    medianFinalEquity: sorted[Math.floor(sorted.length / 2)],
    meanFinalEquity: allFinals.reduce((a, b) => a + b, 0) / simulations,
    maxDrawdownDistribution: allMaxDD,
  };
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Bayesian Optimizer (Gaussian Process approx)
// ═══════════════════════════════════════════════════════════

export interface BayesianConfig {
  iterations: number;
  initialSamples: number;
  explorationWeight: number; // UCB kappa
  objective: ObjectiveFunction;
}

export class BayesianOptimizer {
  private ranges: ParamRange[];
  private config: BayesianConfig;
  private observations: { params: Record<string, number>; fitness: number }[] = [];
  private iteration = 0;

  constructor(ranges: ParamRange[], config: BayesianConfig) {
    this.ranges = ranges;
    this.config = config;
  }

  /** Initial random exploration */
  getInitialSamples(): Record<string, number>[] {
    const samples: Record<string, number>[] = [];
    for (let i = 0; i < this.config.initialSamples; i++) {
      const p: Record<string, number> = {};
      for (const r of this.ranges) {
        const v = r.min + Math.random() * (r.max - r.min);
        p[r.name] = r.type === 'integer' ? Math.round(v) : v;
      }
      samples.push(p);
    }
    return samples;
  }

  addObservations(results: { params: Record<string, number>; fitness: number }[]): void {
    this.observations.push(...results);
    this.iteration++;
  }

  /** Suggest next point using UCB acquisition */
  suggestNext(): Record<string, number> {
    // Sample many random candidates, pick the one with highest UCB
    const candidates = 200;
    let bestUCB = -Infinity;
    let bestCandidate: Record<string, number> = {};

    for (let c = 0; c < candidates; c++) {
      const p: Record<string, number> = {};
      for (const r of this.ranges) {
        const v = r.min + Math.random() * (r.max - r.min);
        p[r.name] = r.type === 'integer' ? Math.round(v) : v;
      }

      // Approximate GP: nearest-neighbor mean + distance-based uncertainty
      const { mean, std } = this.predict(p);
      const ucb = mean + this.config.explorationWeight * std;

      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestCandidate = p;
      }
    }
    return bestCandidate;
  }

  private predict(p: Record<string, number>): { mean: number; std: number } {
    if (this.observations.length === 0) return { mean: 0, std: 1 };

    // K-nearest neighbors surrogate
    const k = Math.min(5, this.observations.length);
    const dists = this.observations.map(o => ({
      fitness: o.fitness,
      dist: this.ranges.reduce((sum, r) => {
        const range = r.max - r.min || 1;
        return sum + ((p[r.name] - o.params[r.name]) / range) ** 2;
      }, 0),
    }));
    dists.sort((a, b) => a.dist - b.dist);

    const neighbors = dists.slice(0, k);
    const mean = neighbors.reduce((s, n) => s + n.fitness, 0) / k;
    const variance = neighbors.reduce((s, n) => s + (n.fitness - mean) ** 2, 0) / k;
    // Add distance-based exploration bonus
    const avgDist = neighbors.reduce((s, n) => s + Math.sqrt(n.dist), 0) / k;

    return { mean, std: Math.sqrt(variance) + avgDist };
  }

  isComplete(): boolean {
    return this.iteration >= this.config.iterations;
  }

  getBest(): { params: Record<string, number>; fitness: number } | null {
    if (this.observations.length === 0) return null;
    return this.observations.reduce((best, o) => o.fitness > best.fitness ? o : best);
  }
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Walk-Forward Efficiency Ratio
// ═══════════════════════════════════════════════════════════

export interface WalkForwardEfficiency {
  efficiencyRatio: number;        // OOS performance / IS performance
  avgInSampleSharpe: number;
  avgOutOfSampleSharpe: number;
  windowResults: { isSharpe: number; oosSharpe: number; efficiency: number }[];
  overfittingScore: number;       // 0-100, higher = more overfit
}

export function computeWalkForwardEfficiency(
  windowResults: { isSharpe: number; oosSharpe: number }[]
): WalkForwardEfficiency {
  if (windowResults.length === 0) {
    return { efficiencyRatio: 0, avgInSampleSharpe: 0, avgOutOfSampleSharpe: 0, windowResults: [], overfittingScore: 100 };
  }

  const avgIS = windowResults.reduce((s, w) => s + w.isSharpe, 0) / windowResults.length;
  const avgOOS = windowResults.reduce((s, w) => s + w.oosSharpe, 0) / windowResults.length;
  const efficiencyRatio = avgIS > 0 ? avgOOS / avgIS : 0;

  const results = windowResults.map(w => ({
    ...w,
    efficiency: w.isSharpe > 0 ? w.oosSharpe / w.isSharpe : 0,
  }));

  // Overfitting score: 0 = no overfitting, 100 = extreme
  // Based on how much IS outperforms OOS
  const overfittingScore = Math.min(100, Math.max(0,
    (1 - efficiencyRatio) * 100
  ));

  return { efficiencyRatio, avgInSampleSharpe: avgIS, avgOutOfSampleSharpe: avgOOS, windowResults: results, overfittingScore };
}
