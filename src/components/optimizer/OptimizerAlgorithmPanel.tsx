/**
 * Optimizer Algorithm Panel
 * Phase 2: Genetic, PSO, Walk-Forward algorithm selection
 */

import { useState } from 'react';
import { 
  Dna, Wind, GitBranch, Target, Settings, 
  ChevronDown, ChevronUp, Play, Pause
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type AlgorithmType = 'grid' | 'genetic' | 'pso' | 'walkforward';

interface GeneticConfig {
  populationSize: number;
  generations: number;
  crossoverRate: number;
  mutationRate: number;
  eliteCount: number;
  tournamentSize: number;
}

interface PSOConfig {
  swarmSize: number;
  maxIterations: number;
  inertia: number;
  cognitive: number;
  social: number;
}

interface WalkForwardConfig {
  inSampleRatio: number;
  numFolds: number;
  anchorStart: boolean;
  minTradesPerFold: number;
}

const DEFAULT_GENETIC: GeneticConfig = {
  populationSize: 100,
  generations: 50,
  crossoverRate: 0.8,
  mutationRate: 0.1,
  eliteCount: 5,
  tournamentSize: 3,
};

const DEFAULT_PSO: PSOConfig = {
  swarmSize: 50,
  maxIterations: 100,
  inertia: 0.7,
  cognitive: 1.5,
  social: 1.5,
};

const DEFAULT_WF: WalkForwardConfig = {
  inSampleRatio: 0.7,
  numFolds: 5,
  anchorStart: false,
  minTradesPerFold: 30,
};

interface OptimizerAlgorithmPanelProps {
  onAlgorithmChange?: (type: AlgorithmType, config: unknown) => void;
  isRunning?: boolean;
  progress?: number;
  className?: string;
}

export function OptimizerAlgorithmPanel({ 
  onAlgorithmChange, 
  isRunning = false,
  progress = 0,
  className 
}: OptimizerAlgorithmPanelProps) {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('grid');
  const [geneticConfig, setGeneticConfig] = useState<GeneticConfig>(DEFAULT_GENETIC);
  const [psoConfig, setPSOConfig] = useState<PSOConfig>(DEFAULT_PSO);
  const [wfConfig, setWFConfig] = useState<WalkForwardConfig>(DEFAULT_WF);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAlgorithmChange = (type: AlgorithmType) => {
    setAlgorithm(type);
    const config = type === 'genetic' ? geneticConfig 
                 : type === 'pso' ? psoConfig 
                 : type === 'walkforward' ? wfConfig 
                 : null;
    onAlgorithmChange?.(type, config);
  };

  const algorithms = [
    { id: 'grid', name: 'Grid Search', icon: Target, description: 'Exhaustive parameter sweep' },
    { id: 'genetic', name: 'Genetic Algorithm', icon: Dna, description: 'Evolutionary optimization' },
    { id: 'pso', name: 'Particle Swarm', icon: Wind, description: 'Swarm intelligence' },
    { id: 'walkforward', name: 'Walk-Forward', icon: GitBranch, description: 'Time-series validation' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Optimization Algorithm
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Algorithm Selection */}
        <div className="grid grid-cols-2 gap-2">
          {algorithms.map((algo) => (
            <Button
              key={algo.id}
              variant={algorithm === algo.id ? 'default' : 'outline'}
              className={cn(
                'h-auto py-3 flex-col gap-1',
                algorithm === algo.id && 'ring-2 ring-primary/50'
              )}
              onClick={() => handleAlgorithmChange(algo.id as AlgorithmType)}
              disabled={isRunning}
            >
              <algo.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{algo.name}</span>
            </Button>
          ))}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Optimization Progress</span>
              <span className="font-mono">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Algorithm-specific configs */}
        <Tabs value={algorithm} className="mt-4">
          <TabsContent value="genetic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Population Size</Label>
                <Slider
                  value={[geneticConfig.populationSize]}
                  onValueChange={([v]) => setGeneticConfig(c => ({ ...c, populationSize: v }))}
                  min={20}
                  max={500}
                  step={10}
                />
                <span className="text-xs text-muted-foreground font-mono">{geneticConfig.populationSize}</span>
              </div>
              <div className="space-y-2">
                <Label>Generations</Label>
                <Slider
                  value={[geneticConfig.generations]}
                  onValueChange={([v]) => setGeneticConfig(c => ({ ...c, generations: v }))}
                  min={10}
                  max={200}
                  step={5}
                />
                <span className="text-xs text-muted-foreground font-mono">{geneticConfig.generations}</span>
              </div>
            </div>

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  Advanced GA Settings
                  {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Crossover Rate</Label>
                    <Slider
                      value={[geneticConfig.crossoverRate * 100]}
                      onValueChange={([v]) => setGeneticConfig(c => ({ ...c, crossoverRate: v / 100 }))}
                      min={50}
                      max={100}
                    />
                    <span className="text-xs text-muted-foreground font-mono">{(geneticConfig.crossoverRate * 100).toFixed(0)}%</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Mutation Rate</Label>
                    <Slider
                      value={[geneticConfig.mutationRate * 100]}
                      onValueChange={([v]) => setGeneticConfig(c => ({ ...c, mutationRate: v / 100 }))}
                      min={1}
                      max={50}
                    />
                    <span className="text-xs text-muted-foreground font-mono">{(geneticConfig.mutationRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="pso" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Swarm Size</Label>
                <Slider
                  value={[psoConfig.swarmSize]}
                  onValueChange={([v]) => setPSOConfig(c => ({ ...c, swarmSize: v }))}
                  min={10}
                  max={200}
                  step={5}
                />
                <span className="text-xs text-muted-foreground font-mono">{psoConfig.swarmSize}</span>
              </div>
              <div className="space-y-2">
                <Label>Max Iterations</Label>
                <Slider
                  value={[psoConfig.maxIterations]}
                  onValueChange={([v]) => setPSOConfig(c => ({ ...c, maxIterations: v }))}
                  min={20}
                  max={500}
                  step={10}
                />
                <span className="text-xs text-muted-foreground font-mono">{psoConfig.maxIterations}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Inertia (ω)</Label>
                <Slider
                  value={[psoConfig.inertia * 100]}
                  onValueChange={([v]) => setPSOConfig(c => ({ ...c, inertia: v / 100 }))}
                  min={10}
                  max={100}
                />
                <span className="text-xs text-muted-foreground font-mono">{psoConfig.inertia.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Label>Cognitive (c1)</Label>
                <Slider
                  value={[psoConfig.cognitive * 100]}
                  onValueChange={([v]) => setPSOConfig(c => ({ ...c, cognitive: v / 100 }))}
                  min={50}
                  max={300}
                />
                <span className="text-xs text-muted-foreground font-mono">{psoConfig.cognitive.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Label>Social (c2)</Label>
                <Slider
                  value={[psoConfig.social * 100]}
                  onValueChange={([v]) => setPSOConfig(c => ({ ...c, social: v / 100 }))}
                  min={50}
                  max={300}
                />
                <span className="text-xs text-muted-foreground font-mono">{psoConfig.social.toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="walkforward" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>In-Sample Ratio</Label>
                <Slider
                  value={[wfConfig.inSampleRatio * 100]}
                  onValueChange={([v]) => setWFConfig(c => ({ ...c, inSampleRatio: v / 100 }))}
                  min={50}
                  max={90}
                />
                <span className="text-xs text-muted-foreground font-mono">{(wfConfig.inSampleRatio * 100).toFixed(0)}% IS / {((1 - wfConfig.inSampleRatio) * 100).toFixed(0)}% OOS</span>
              </div>
              <div className="space-y-2">
                <Label>Number of Folds</Label>
                <Slider
                  value={[wfConfig.numFolds]}
                  onValueChange={([v]) => setWFConfig(c => ({ ...c, numFolds: v }))}
                  min={2}
                  max={20}
                />
                <span className="text-xs text-muted-foreground font-mono">{wfConfig.numFolds} folds</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Anchored Walk-Forward</Label>
                <p className="text-xs text-muted-foreground">Start all folds from the beginning</p>
              </div>
              <Switch
                checked={wfConfig.anchorStart}
                onCheckedChange={(v) => setWFConfig(c => ({ ...c, anchorStart: v }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="grid">
            <div className="text-center py-4 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Grid search tests all parameter combinations</p>
              <p className="text-xs mt-1">Configure parameter ranges in the main panel</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <Badge variant="outline" className="text-xs">
            Algorithm: {algorithms.find(a => a.id === algorithm)?.name}
          </Badge>
          {algorithm === 'genetic' && (
            <Badge variant="secondary" className="text-xs">
              Pop: {geneticConfig.populationSize} × {geneticConfig.generations} gen
            </Badge>
          )}
          {algorithm === 'pso' && (
            <Badge variant="secondary" className="text-xs">
              Swarm: {psoConfig.swarmSize} × {psoConfig.maxIterations} iter
            </Badge>
          )}
          {algorithm === 'walkforward' && (
            <Badge variant="secondary" className="text-xs">
              {wfConfig.numFolds} folds, {(wfConfig.inSampleRatio * 100).toFixed(0)}% IS
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
