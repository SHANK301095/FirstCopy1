import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Download, 
  Printer, 
  BarChart3, 
  Brain, 
  Shield, 
  Users, 
  Zap, 
  TrendingUp,
  Database,
  LineChart,
  Target,
  Layers,
  Globe,
  Smartphone,
  Lock,
  Sparkles,
  Search,
  Settings,
  FileText,
  Activity,
  PieChart,
  Cpu,
  GitBranch,
  AlertTriangle,
  Workflow,
  BookOpen
} from "lucide-react";

const FeatureGuide = () => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Trigger print dialog which allows saving as PDF
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Print Controls - Hidden in print */}
      <div className="print:hidden sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">MMC Feature Guide</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-5xl mx-auto p-8 print:p-0 print:max-w-none">
        <div className="print:p-12 space-y-8 print:space-y-6">
          
          {/* Header */}
          <header className="text-center pb-6 border-b-2 border-primary/20 print:border-primary">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center print:bg-primary">
                <TrendingUp className="w-7 h-7 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight print:text-black">MMC</h1>
            </div>
            <p className="text-2xl font-semibold text-primary mb-2">Money Making Machine</p>
            <p className="text-lg text-muted-foreground italic print:text-gray-600">
              Build your edge. Own your process.
            </p>
            <p className="text-sm text-muted-foreground mt-2 print:text-gray-500">
              Professional-Grade Trading Strategy Development & Backtesting Platform
            </p>
          </header>

          {/* Value Proposition */}
          <section className="bg-primary/5 rounded-xl p-6 print:bg-gray-50 print:border print:border-gray-200">
            <h2 className="text-xl font-bold mb-3 print:text-black">What is MMC?</h2>
            <p className="text-muted-foreground leading-relaxed print:text-gray-700">
              MMC is an advanced trading intelligence and backtesting platform designed for serious traders. 
              It combines professional-grade analytics, AI-powered insights, and seamless workflow automation 
              to help you develop, test, and optimize trading strategies with confidence. From data import 
              to live execution, MMC provides a complete toolkit for systematic trading.
            </p>
          </section>

          {/* Key Stats */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 print:gap-2">
            {[
              { value: "50+", label: "Pages & Features" },
              { value: "10+", label: "AI Workers" },
              { value: "150+", label: "Components" },
              { value: "4", label: "Optimization Algos" },
              { value: "∞", label: "Possibilities" },
            ].map((stat, i) => (
              <Card key={i} className="text-center p-3 print:border print:border-gray-300">
                <div className="text-2xl font-bold text-primary print:text-black">{stat.value}</div>
                <div className="text-xs text-muted-foreground print:text-gray-600">{stat.label}</div>
              </Card>
            ))}
          </section>

          {/* Core Workflow */}
          <section className="bg-muted/30 rounded-xl p-5 print:bg-gray-50 print:border print:border-gray-200">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 print:text-black">
              <Workflow className="w-5 h-5 text-primary print:text-black" />
              Core Workflow
            </h2>
            <div className="flex items-center justify-between text-center">
              {[
                { step: "1", label: "Import Data", desc: "CSV, MT5, Broker" },
                { step: "2", label: "Build Strategy", desc: "Code or Template" },
                { step: "3", label: "Backtest", desc: "Run Simulation" },
                { step: "4", label: "Analyze", desc: "Metrics & Charts" },
                { step: "5", label: "Optimize", desc: "Find Best Params" },
                { step: "6", label: "Execute", desc: "Paper or Live" },
              ].map((item, i) => (
                <div key={i} className="flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-sm font-bold print:bg-black print:text-white">
                    {item.step}
                  </div>
                  <div className="font-medium text-sm mt-2 print:text-black">{item.label}</div>
                  <div className="text-xs text-muted-foreground print:text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Core Features Grid */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 print:text-black">
              <Sparkles className="w-6 h-6 text-primary print:text-black" />
              Core Platform Features
            </h2>
            <div className="grid grid-cols-2 gap-4 print:gap-3">
              <FeatureCard
                icon={Database}
                title="Data Management"
                features={[
                  "CSV import with auto column detection",
                  "Dataset Quality Scanner (gaps, duplicates, timezone)",
                  "Coverage Heatmap visualization",
                  "Bulk actions, tagging & organization",
                  "Multi-symbol & multi-timeframe support",
                  "Dataset comparison & validation"
                ]}
              />
              <FeatureCard
                icon={Layers}
                title="Strategy Library"
                features={[
                  "Monaco Code Editor with syntax highlighting",
                  "Version Control with change history",
                  "Visual Diff Viewer (compare versions)",
                  "10+ pre-built strategy templates",
                  "Share & collaborate on strategies",
                  "Parameter definition with ranges"
                ]}
              />
              <FeatureCard
                icon={BarChart3}
                title="Backtesting Engine"
                features={[
                  "Browser-based execution (no setup)",
                  "Parameter presets (save/load configs)",
                  "Live progress charts during run",
                  "Background processing & batch queue",
                  "Auto-recovery from browser crash",
                  "Slippage & commission modeling"
                ]}
              />
              <FeatureCard
                icon={LineChart}
                title="Results & Analytics"
                features={[
                  "Trade Explorer with advanced filters",
                  "Interactive equity curve with zoom",
                  "Drawdown analysis & underwater chart",
                  "Monthly/yearly returns heatmap",
                  "Win/loss streak visualization",
                  "Trade notes & annotations"
                ]}
              />
            </div>
          </section>

          {/* Advanced Analytics */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 print:text-black">
              <Brain className="w-6 h-6 text-primary print:text-black" />
              Advanced Analytics Suite
            </h2>
            <div className="grid grid-cols-3 gap-4 print:gap-3">
              <MiniFeatureCard
                title="Monte Carlo Simulation"
                description="1000-10000 iterations for confidence bands, drawdown probabilities, and expected return ranges"
              />
              <MiniFeatureCard
                title="Walk-Forward Analysis"
                description="Rolling in-sample/out-of-sample validation with efficiency ratio to detect overfitting"
              />
              <MiniFeatureCard
                title="Regime Detection"
                description="Identify trending/ranging/volatile market phases with per-regime performance breakdown"
              />
              <MiniFeatureCard
                title="Professional Tearsheet"
                description="One-page PDF export with all key metrics, equity curve, and performance summary"
              />
              <MiniFeatureCard
                title="Performance Attribution"
                description="Break down returns by time, symbol, day-of-week, and other dimensions"
              />
              <MiniFeatureCard
                title="Stress Testing"
                description="Simulate performance during historical crisis periods (2008, 2020, etc.)"
              />
            </div>
          </section>

          {/* Optimization Tools */}
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 print:text-black">
              <Target className="w-6 h-6 text-primary print:text-black" />
              Optimization Algorithms
            </h2>
            <div className="grid grid-cols-4 gap-3 print:gap-2">
              {[
                { name: "Grid Search", desc: "Exhaustive parameter sweep for small spaces" },
                { name: "Genetic Algorithm", desc: "Evolution-based optimization for large spaces" },
                { name: "Particle Swarm (PSO)", desc: "Swarm intelligence for global optima" },
                { name: "Multi-Objective", desc: "Pareto-optimal solutions (Sharpe + DD)" },
              ].map((algo, i) => (
                <Card key={i} className="p-3 print:border print:border-gray-300">
                  <h4 className="font-semibold text-sm print:text-black">{algo.name}</h4>
                  <p className="text-xs text-muted-foreground print:text-gray-600">{algo.desc}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Card className="p-3 print:border print:border-gray-300">
                <h4 className="font-semibold text-sm print:text-black">Optimization Heatmap</h4>
                <p className="text-xs text-muted-foreground print:text-gray-600">2D parameter landscape visualization</p>
              </Card>
              <Card className="p-3 print:border print:border-gray-300">
                <h4 className="font-semibold text-sm print:text-black">Parameter Importance</h4>
                <p className="text-xs text-muted-foreground print:text-gray-600">Feature sensitivity ranking</p>
              </Card>
              <Card className="p-3 print:border print:border-gray-300">
                <h4 className="font-semibold text-sm print:text-black">Convergence Chart</h4>
                <p className="text-xs text-muted-foreground print:text-gray-600">Track optimization progress</p>
              </Card>
            </div>
          </section>

          {/* Two Column: AI & Portfolio */}
          <section className="grid grid-cols-2 gap-6 print:gap-4">
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 print:text-black">
                <Zap className="w-5 h-5 text-primary print:text-black" />
                AI & Automation
              </h2>
              <ul className="space-y-2 text-sm">
                {[
                  "Sentinel AI - Chat-based strategy assistant (explain, debug, suggest)",
                  "In-app Copilot for step-by-step guidance",
                  "Pattern Recognition engine (candlestick patterns)",
                  "Smart trade insights & automated suggestions",
                  "Quality checks & data validation AI",
                  "Natural language strategy exploration"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary print:text-black">•</span>
                    <span className="text-muted-foreground print:text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 print:text-black">
                <Shield className="w-5 h-5 text-primary print:text-black" />
                Portfolio & Risk
              </h2>
              <ul className="space-y-2 text-sm">
                {[
                  "Multi-strategy Portfolio Builder (2-20 strategies)",
                  "Correlation Matrix for diversification analysis",
                  "Portfolio Optimization (Max Sharpe, Min Variance, Risk Parity)",
                  "Position Sizing (Kelly, Fixed Fractional, Optimal f)",
                  "Risk Dashboard with VaR & Expected Shortfall",
                  "Drawdown alerts & risk limits"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary print:text-black">•</span>
                    <span className="text-muted-foreground print:text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Scanning & Execution */}
          <section className="grid grid-cols-2 gap-6 print:gap-4">
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 print:text-black">
                <Search className="w-5 h-5 text-primary print:text-black" />
                Scanning Engine
              </h2>
              <ul className="space-y-2 text-sm">
                {[
                  "Custom scan rules (entry/exit conditions)",
                  "Multi-symbol scanning across datasets",
                  "Real-time pattern matching & alerts",
                  "Configurable notification triggers",
                  "Scan history & saved scans"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary print:text-black">•</span>
                    <span className="text-muted-foreground print:text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2 print:text-black">
                <Activity className="w-5 h-5 text-primary print:text-black" />
                Execution Bridge
              </h2>
              <ul className="space-y-2 text-sm">
                {[
                  "Zerodha/Kite Connect integration (OAuth)",
                  "Live portfolio sync & holdings",
                  "Order panel (place from app)",
                  "Paper trading mode (simulated)",
                  "Execution logs & history"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary print:text-black">•</span>
                    <span className="text-muted-foreground print:text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Platform Features */}
          <section className="grid grid-cols-3 gap-4 print:gap-3">
            <Card className="p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary print:text-black" />
                <h3 className="font-semibold print:text-black">Team Collaboration</h3>
              </div>
              <p className="text-sm text-muted-foreground print:text-gray-600">
                Workspaces with role-based access (Owner, Admin, Editor, Viewer), activity feeds, 
                member invites, and strategy marketplace
              </p>
            </Card>
            <Card className="p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-primary print:text-black" />
                <h3 className="font-semibold print:text-black">Reports & Export</h3>
              </div>
              <p className="text-sm text-muted-foreground print:text-gray-600">
                Report Builder with templates, Professional Tearsheet PDF, CSV/Excel export, 
                and configurable export presets
              </p>
            </Card>
            <Card className="p-4 print:border print:border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-primary print:text-black" />
                <h3 className="font-semibold print:text-black">Enterprise Security</h3>
              </div>
              <p className="text-sm text-muted-foreground print:text-gray-600">
                Row-level security (RLS), encrypted tokens, 2FA support, audit logging, 
                and secure invite system
              </p>
            </Card>
          </section>

          {/* Key Metrics */}
          <section className="bg-muted/30 rounded-xl p-5 print:bg-gray-50 print:border print:border-gray-200">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 print:text-black">
              <PieChart className="w-5 h-5 text-primary print:text-black" />
              Key Metrics Tracked
            </h2>
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              {[
                { metric: "Sharpe Ratio", desc: "Risk-adjusted returns" },
                { metric: "Profit Factor", desc: "Gross profit / loss" },
                { metric: "Max Drawdown", desc: "Worst decline" },
                { metric: "Win Rate", desc: "% winning trades" },
                { metric: "Expectancy", desc: "Avg $ per trade" },
                { metric: "Recovery Factor", desc: "Profit / Max DD" },
                { metric: "Calmar Ratio", desc: "CAGR / Max DD" },
                { metric: "Sortino Ratio", desc: "Downside-adjusted" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="font-semibold print:text-black">{item.metric}</div>
                  <div className="text-xs text-muted-foreground print:text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Platform Support */}
          <section className="bg-muted/50 rounded-xl p-6 print:bg-gray-50 print:border print:border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 print:text-black">
              <Smartphone className="w-5 h-5 text-primary print:text-black" />
              Platform Support & Tech Stack
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 print:text-black">Platforms</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Web App", desc: "Any modern browser" },
                    { label: "PWA", desc: "Installable, offline-capable" },
                    { label: "Desktop", desc: "Electron (Win/Mac/Linux)" },
                    { label: "Mobile", desc: "Responsive + touch gestures" },
                  ].map((platform, i) => (
                    <div key={i}>
                      <div className="font-medium print:text-black">{platform.label}</div>
                      <div className="text-xs text-muted-foreground print:text-gray-600">{platform.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 print:text-black">Tech Stack</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Frontend", desc: "React + TypeScript + Vite" },
                    { label: "Styling", desc: "Tailwind CSS + shadcn/ui" },
                    { label: "Backend", desc: "Supabase (PostgreSQL)" },
                    { label: "Charts", desc: "Recharts + Monaco Editor" },
                  ].map((tech, i) => (
                    <div key={i}>
                      <div className="font-medium print:text-black">{tech.label}</div>
                      <div className="text-xs text-muted-foreground print:text-gray-600">{tech.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Utilities & Settings */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 print:text-black">
              <Settings className="w-5 h-5 text-primary print:text-black" />
              Utilities & Settings
            </h2>
            <div className="grid grid-cols-4 gap-3 text-sm">
              {[
                { label: "Keyboard Shortcuts", desc: "Ctrl+K palette, G-keys" },
                { label: "Backup & Restore", desc: "Export/import all data" },
                { label: "Logs Viewer", desc: "Debug & error logs" },
                { label: "System Check", desc: "Health diagnostics" },
                { label: "Theme Toggle", desc: "Light/Dark mode" },
                { label: "Notification Settings", desc: "Email/push/in-app" },
                { label: "Cloud Sync", desc: "Real-time data sync" },
                { label: "Command Palette", desc: "Quick navigation" },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-muted/30 rounded print:bg-gray-100">
                  <div className="font-medium print:text-black">{item.label}</div>
                  <div className="text-xs text-muted-foreground print:text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center pt-6 border-t border-border print:border-gray-300">
            <p className="text-lg font-semibold text-primary print:text-black mb-1">
              Build your edge. Own your process.
            </p>
            <p className="text-sm text-muted-foreground print:text-gray-600">
              © {new Date().getFullYear()} MMC - Money Making Machine. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-2 print:text-gray-500">
              Access the interactive guide at /feature-guide | In-app help: Ctrl+/ | Copilot: Always available
            </p>
          </footer>

        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  features 
}: { 
  icon: React.ElementType; 
  title: string; 
  features: string[];
}) => (
  <Card className="p-4 print:border print:border-gray-300">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-5 h-5 text-primary print:text-black" />
      <h3 className="font-semibold print:text-black">{title}</h3>
    </div>
    <ul className="space-y-1">
      {features.map((feature, i) => (
        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2 print:text-gray-700">
          <span className="w-1 h-1 rounded-full bg-primary print:bg-black flex-shrink-0" />
          {feature}
        </li>
      ))}
    </ul>
  </Card>
);

// Mini Feature Card
const MiniFeatureCard = ({ title, description }: { title: string; description: string }) => (
  <Card className="p-3 print:border print:border-gray-300">
    <h4 className="font-semibold text-sm mb-1 print:text-black">{title}</h4>
    <p className="text-xs text-muted-foreground print:text-gray-600">{description}</p>
  </Card>
);

export default FeatureGuide;
