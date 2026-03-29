// Particle Swarm Optimization Worker

interface Particle {
  position: number[];
  velocity: number[];
  fitness: number;
  bestPosition: number[];
  bestFitness: number;
}

interface PSOConfig {
  numParticles: number;
  maxIterations: number;
  inertiaWeight: number;
  cognitiveWeight: number;
  socialWeight: number;
}

interface ParamRange {
  name: string;
  min: number;
  max: number;
  step: number;
}

interface PSORequest {
  type: 'start' | 'cancel';
  params: ParamRange[];
  config: PSOConfig;
  objectiveMetric: string;
}

interface PSOProgress {
  type: 'progress';
  iteration: number;
  totalIterations: number;
  globalBest: number[];
  globalBestFitness: number;
  swarmDiversity: number;
  convergenceHistory: number[];
}

interface PSOComplete {
  type: 'complete';
  bestPosition: number[];
  bestFitness: number;
  convergenceHistory: number[];
  particleHistory: { iteration: number; particles: { x: number; y: number; fitness: number }[] }[];
}

let cancelled = false;

function initializeParticle(params: ParamRange[]): Particle {
  const position = params.map(p => {
    const steps = Math.floor((p.max - p.min) / p.step);
    return p.min + Math.floor(Math.random() * (steps + 1)) * p.step;
  });
  
  const velocity = params.map(p => {
    const range = p.max - p.min;
    return (Math.random() - 0.5) * range * 0.1;
  });
  
  return {
    position,
    velocity,
    fitness: -Infinity,
    bestPosition: [...position],
    bestFitness: -Infinity
  };
}

/**
 * Fitness evaluation — deterministic benchmark landscape (Rastrigin-style)
 * When real dataset is connected, this should call the backtest engine.
 * Currently uses a smooth, deterministic landscape labeled as demo mode.
 */
function evaluateFitness(position: number[], params: ParamRange[]): number {
  const n = position.length;
  let fitness = 0;

  for (let i = 0; i < n; i++) {
    const normalized = (position[i] - params[i].min) / (params[i].max - params[i].min);
    // Rastrigin-like deterministic benchmark (no random noise)
    fitness += normalized * normalized - 0.1 * Math.cos(2 * Math.PI * normalized);
  }

  // Invert for maximization — higher = better
  fitness = 10 * n - fitness;
  return fitness / (n * 5); // normalize to ~0–2 range
}

function calculateSwarmDiversity(particles: Particle[], params: ParamRange[]): number {
  if (particles.length < 2) return 0;
  
  const centroid = params.map((_, i) => 
    particles.reduce((sum, p) => sum + p.position[i], 0) / particles.length
  );
  
  const avgDistance = particles.reduce((sum, p) => {
    const distance = Math.sqrt(
      p.position.reduce((d, pos, i) => {
        const normalized = (pos - centroid[i]) / (params[i].max - params[i].min);
        return d + normalized * normalized;
      }, 0)
    );
    return sum + distance;
  }, 0) / particles.length;
  
  return avgDistance;
}

async function runPSO(params: ParamRange[], config: PSOConfig): Promise<void> {
  cancelled = false;
  
  // Initialize swarm
  const particles: Particle[] = [];
  for (let i = 0; i < config.numParticles; i++) {
    particles.push(initializeParticle(params));
  }
  
  // Evaluate initial fitness
  for (const particle of particles) {
    particle.fitness = evaluateFitness(particle.position, params);
    particle.bestFitness = particle.fitness;
    particle.bestPosition = [...particle.position];
  }
  
  // Find global best
  let globalBest = particles.reduce((best, p) => 
    p.bestFitness > best.bestFitness ? p : best
  );
  let globalBestPosition = [...globalBest.bestPosition];
  let globalBestFitness = globalBest.bestFitness;
  
  const convergenceHistory: number[] = [globalBestFitness];
  const particleHistory: { iteration: number; particles: { x: number; y: number; fitness: number }[] }[] = [];
  
  // Main PSO loop
  for (let iter = 0; iter < config.maxIterations; iter++) {
    if (cancelled) return;
    
    // Store particle positions for visualization (first 2 dimensions)
    if (params.length >= 2) {
      particleHistory.push({
        iteration: iter,
        particles: particles.map(p => ({
          x: (p.position[0] - params[0].min) / (params[0].max - params[0].min),
          y: (p.position[1] - params[1].min) / (params[1].max - params[1].min),
          fitness: p.fitness
        }))
      });
    }
    
    // Update each particle
    for (const particle of particles) {
      // Update velocity
      for (let d = 0; d < params.length; d++) {
        const r1 = Math.random();
        const r2 = Math.random();
        
        const cognitive = config.cognitiveWeight * r1 * (particle.bestPosition[d] - particle.position[d]);
        const social = config.socialWeight * r2 * (globalBestPosition[d] - particle.position[d]);
        
        particle.velocity[d] = config.inertiaWeight * particle.velocity[d] + cognitive + social;
        
        // Clamp velocity
        const maxVel = (params[d].max - params[d].min) * 0.2;
        particle.velocity[d] = Math.max(-maxVel, Math.min(maxVel, particle.velocity[d]));
      }
      
      // Update position
      for (let d = 0; d < params.length; d++) {
        particle.position[d] += particle.velocity[d];
        
        // Clamp to bounds and snap to step
        particle.position[d] = Math.max(params[d].min, Math.min(params[d].max, particle.position[d]));
        particle.position[d] = params[d].min + 
          Math.round((particle.position[d] - params[d].min) / params[d].step) * params[d].step;
      }
      
      // Evaluate fitness
      particle.fitness = evaluateFitness(particle.position, params);
      
      // Update personal best
      if (particle.fitness > particle.bestFitness) {
        particle.bestFitness = particle.fitness;
        particle.bestPosition = [...particle.position];
      }
      
      // Update global best
      if (particle.fitness > globalBestFitness) {
        globalBestFitness = particle.fitness;
        globalBestPosition = [...particle.position];
      }
    }
    
    convergenceHistory.push(globalBestFitness);
    
    // Report progress
    const progress: PSOProgress = {
      type: 'progress',
      iteration: iter + 1,
      totalIterations: config.maxIterations,
      globalBest: globalBestPosition,
      globalBestFitness,
      swarmDiversity: calculateSwarmDiversity(particles, params),
      convergenceHistory
    };
    
    self.postMessage(progress);
    
    // Small delay for UI updates
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Send completion
  const complete: PSOComplete = {
    type: 'complete',
    bestPosition: globalBestPosition,
    bestFitness: globalBestFitness,
    convergenceHistory,
    particleHistory
  };
  
  self.postMessage(complete);
}

self.onmessage = (e: MessageEvent<PSORequest>) => {
  const { type, params, config } = e.data;
  
  if (type === 'start') {
    runPSO(params, config);
  } else if (type === 'cancel') {
    cancelled = true;
  }
};
