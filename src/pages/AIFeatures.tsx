import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  GitCompare, 
  Wallet,
  Zap,
  Shield,
  Cpu,
  ArrowRight,
  Activity,
  Target,
  LineChart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const aiFeatures = [
  {
    title: 'Monte Carlo Simulation',
    description: 'Run thousands of random equity paths to stress-test your strategy and understand worst-case scenarios.',
    icon: Activity,
    path: '/advanced-analytics',
    benefits: ['Risk quantification', 'Drawdown probability', 'Confidence intervals'],
    color: 'from-purple-500 to-violet-600'
  },
  {
    title: 'Walk-Forward Analysis',
    description: 'Validate strategy robustness with out-of-sample testing across multiple time windows.',
    icon: TrendingUp,
    path: '/walk-forward',
    benefits: ['Overfitting detection', 'Parameter stability', 'Real-world simulation'],
    color: 'from-blue-500 to-cyan-600'
  },
  {
    title: 'Risk Dashboard',
    description: 'Comprehensive risk metrics including VaR, CVaR, Sharpe, Sortino, and Kelly Criterion.',
    icon: Shield,
    path: '/risk-dashboard',
    benefits: ['VaR/CVaR analysis', 'Risk-adjusted returns', 'Position sizing'],
    color: 'from-red-500 to-orange-600'
  },
  {
    title: 'Quick Compare',
    description: 'Side-by-side strategy comparison with detailed performance attribution analysis.',
    icon: GitCompare,
    path: '/quick-compare',
    benefits: ['Multi-strategy view', 'Performance delta', 'Winner identification'],
    color: 'from-green-500 to-emerald-600'
  },
  {
    title: 'Portfolio Builder',
    description: 'Optimize strategy allocation using correlation analysis and mean-variance optimization.',
    icon: Wallet,
    path: '/portfolio',
    benefits: ['Correlation matrix', 'Optimal weights', 'Diversification score'],
    color: 'from-amber-500 to-yellow-600'
  },
  {
    title: 'Performance Attribution',
    description: 'Decompose returns by time, market conditions, and strategy parameters.',
    icon: BarChart3,
    path: '/attribution',
    benefits: ['Factor analysis', 'Regime detection', 'Alpha sources'],
    color: 'from-pink-500 to-rose-600'
  }
];

const capabilities = [
  { icon: Cpu, title: 'GPU-Accelerated', desc: 'Lightning-fast computations' },
  { icon: Zap, title: 'Real-time Updates', desc: 'Live simulation results' },
  { icon: Target, title: 'Precision Analytics', desc: 'Institutional-grade metrics' },
  { icon: LineChart, title: 'Visual Insights', desc: 'Interactive charts & heatmaps' }
];

// Generate Monte Carlo simulation paths
function generateMonteCarloPaths(numPaths: number, numPoints: number) {
  const paths: number[][] = [];
  for (let p = 0; p < numPaths; p++) {
    const path = [100];
    for (let i = 1; i < numPoints; i++) {
      const drift = 0.002 + (Math.random() - 0.5) * 0.01;
      const volatility = (Math.random() - 0.5) * 8;
      path.push(Math.max(50, path[i - 1] * (1 + drift) + volatility));
    }
    paths.push(path);
  }
  return paths;
}

// Animated Monte Carlo visualization component
function MonteCarloVisualization() {
  const [progress, setProgress] = useState(0);
  const paths = useMemo(() => generateMonteCarloPaths(12, 50), []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => (p >= 49 ? 0 : p + 1));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const width = 280;
  const height = 160;
  const padding = 10;
  
  const allValues = paths.flat();
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  
  const scaleX = (i: number) => padding + (i / 49) * (width - 2 * padding);
  const scaleY = (v: number) => height - padding - ((v - minVal) / (maxVal - minVal)) * (height - 2 * padding);

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Background grid */}
      <defs>
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--ai-purple))" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="mainPath" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--ai-purple))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {[0, 1, 2, 3].map(i => (
        <line
          key={i}
          x1={padding}
          y1={padding + i * (height - 2 * padding) / 3}
          x2={width - padding}
          y2={padding + i * (height - 2 * padding) / 3}
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity="0.1"
          strokeDasharray="4,4"
        />
      ))}
      
      {/* Monte Carlo paths */}
      {paths.map((path, pathIdx) => {
        const visiblePoints = path.slice(0, progress + 1);
        const d = visiblePoints.map((v, i) => 
          `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`
        ).join(' ');
        
        return (
          <motion.path
            key={pathIdx}
            d={d}
            fill="none"
            stroke={pathIdx === 0 ? "url(#mainPath)" : "url(#pathGradient)"}
            strokeWidth={pathIdx === 0 ? 2.5 : 1}
            strokeOpacity={pathIdx === 0 ? 1 : 0.4}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        );
      })}
      
      {/* Current point marker on main path */}
      {progress > 0 && (
        <motion.circle
          cx={scaleX(progress)}
          cy={scaleY(paths[0][progress])}
          r={4}
          fill="hsl(var(--ai-purple))"
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
      
      {/* Labels */}
      <text x={padding} y={height - 2} fontSize="8" fill="hsl(var(--muted-foreground))">T0</text>
      <text x={width - padding - 10} y={height - 2} fontSize="8" fill="hsl(var(--muted-foreground))">T+N</text>
    </svg>
  );
}

// Animated bar chart for risk metrics
function RiskMetricsVisualization() {
  const [values, setValues] = useState([65, 78, 45, 82]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setValues(prev => prev.map(v => Math.max(20, Math.min(95, v + (Math.random() - 0.5) * 15))));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const metrics = ['Sharpe', 'Sortino', 'VaR', 'Win%'];
  const colors = ['from-purple-500 to-violet-600', 'from-blue-500 to-cyan-600', 'from-red-500 to-orange-600', 'from-green-500 to-emerald-600'];

  return (
    <div className="flex items-end gap-3 h-32">
      {values.map((val, idx) => (
        <div key={metrics[idx]} className="flex flex-col items-center gap-1">
          <motion.div
            className={`w-10 rounded-t-md bg-gradient-to-t ${colors[idx]}`}
            initial={{ height: 0 }}
            animate={{ height: `${val}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            style={{ maxHeight: '100px' }}
          />
          <span className="text-[9px] text-muted-foreground font-medium">{metrics[idx]}</span>
        </div>
      ))}
    </div>
  );
}

// Animated correlation heatmap
function CorrelationHeatmap() {
  const [cells, setCells] = useState<number[][]>([
    [1, 0.7, 0.3, -0.2],
    [0.7, 1, 0.5, 0.1],
    [0.3, 0.5, 1, 0.6],
    [-0.2, 0.1, 0.6, 1]
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCells(prev => prev.map((row, i) => 
        row.map((v, j) => i === j ? 1 : Math.max(-1, Math.min(1, v + (Math.random() - 0.5) * 0.2)))
      ));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const getColor = (val: number) => {
    if (val > 0.5) return 'bg-green-500';
    if (val > 0) return 'bg-green-400/60';
    if (val > -0.5) return 'bg-red-400/60';
    return 'bg-red-500';
  };

  return (
    <div className="grid grid-cols-4 gap-1 w-24">
      {cells.flat().map((val, idx) => (
        <motion.div
          key={idx}
          className={`w-5 h-5 rounded-sm ${getColor(val)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 + Math.abs(val) * 0.7 }}
          transition={{ duration: 0.5 }}
        />
      ))}
    </div>
  );
}

export default function AIFeatures() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-8">
      {/* Hero Section with Animated Visualizations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ai-purple/20 via-background to-ai-purple/10 border border-ai-purple/30 p-8 md:p-12"
      >
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-ai-purple/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start gap-8">
          {/* Left: Text content */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-ai-purple/30 shadow-[0_0_30px_hsl(var(--ai-purple)/0.5)]">
                <Brain className="h-8 w-8 text-ai-purple" />
              </div>
              <Badge className="bg-ai-purple/20 text-ai-purple border-ai-purple/30 text-sm px-3 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                PRO Features
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-ai-purple via-primary to-ai-purple bg-clip-text text-transparent">
              AI-Powered Analytics
            </h1>
            
            <p className="text-muted-foreground text-lg max-w-xl">
              Unlock institutional-grade analysis tools powered by advanced algorithms. 
              From Monte Carlo simulations to portfolio optimization — make data-driven decisions with confidence.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {capabilities.map((cap, idx) => (
                <motion.div
                  key={cap.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * idx }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-sm"
                >
                  <cap.icon className="h-4 w-4 text-ai-purple" />
                  <span className="font-medium">{cap.title}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Animated Visualizations */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Monte Carlo Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="relative bg-background/60 backdrop-blur-sm rounded-xl border border-ai-purple/20 p-4 shadow-[0_0_30px_hsl(var(--ai-purple)/0.15)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-ai-purple" />
                <span className="text-xs font-medium text-muted-foreground">Monte Carlo Simulation</span>
                <Badge variant="secondary" className="text-[8px] px-1.5 py-0 bg-ai-purple/20 text-ai-purple border-0 ml-auto">
                  LIVE
                </Badge>
              </div>
              <MonteCarloVisualization />
            </motion.div>

            {/* Bottom row: Risk Metrics + Correlation */}
            <div className="flex gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-background/60 backdrop-blur-sm rounded-xl border border-ai-purple/20 p-4 shadow-[0_0_20px_hsl(var(--ai-purple)/0.1)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-ai-purple" />
                  <span className="text-[10px] font-medium text-muted-foreground">Risk Metrics</span>
                </div>
                <RiskMetricsVisualization />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-background/60 backdrop-blur-sm rounded-xl border border-ai-purple/20 p-4 shadow-[0_0_20px_hsl(var(--ai-purple)/0.1)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <GitCompare className="h-3.5 w-3.5 text-ai-purple" />
                  <span className="text-[10px] font-medium text-muted-foreground">Correlation</span>
                </div>
                <CorrelationHeatmap />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiFeatures.map((feature, idx) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
          >
            <Card 
              className="group h-full cursor-pointer hover:shadow-[0_0_30px_hsl(var(--ai-purple)/0.2)] transition-all duration-300 hover:border-ai-purple/40 bg-gradient-to-br from-card to-card/80"
              onClick={() => navigate(feature.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${feature.color} shadow-lg`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg group-hover:text-ai-purple transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {feature.benefits.map((benefit) => (
                    <Badge 
                      key={benefit} 
                      variant="secondary" 
                      className="text-xs bg-muted/50 hover:bg-muted"
                    >
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center text-center space-y-4 py-8"
      >
        <h2 className="text-2xl font-bold">Ready to Level Up Your Analysis?</h2>
        <p className="text-muted-foreground max-w-lg">
          Start with Monte Carlo simulation to stress-test your strategy, then explore other AI-powered tools.
        </p>
        <Button 
          size="lg" 
          onClick={() => navigate('/advanced-analytics')}
          className="bg-gradient-to-r from-ai-purple to-primary hover:opacity-90 shadow-[0_0_20px_hsl(var(--ai-purple)/0.3)]"
        >
          <Brain className="h-5 w-5 mr-2" />
          Start Monte Carlo Analysis
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
