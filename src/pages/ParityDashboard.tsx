/**
 * Parity Dashboard - MMC vs ProJournX feature checklist
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Sparkles, BarChart3, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { PageTitle } from '@/components/ui/PageTitle';
import { cn } from '@/lib/utils';

interface Feature {
  id: string;
  module: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  defaultDone: boolean;
}

const FEATURES: Feature[] = [
  // M1 - Dashboard & Foundation
  { id: 'calendar-heatmap', module: 'Dashboard', name: 'Calendar P&L Heatmap', priority: 'P0', defaultDone: true },
  { id: 'equity-curve', module: 'Dashboard', name: 'Equity Curve Chart', priority: 'P0', defaultDone: true },
  { id: 'kpi-cards', module: 'Dashboard', name: 'KPI Cards (8 metrics)', priority: 'P0', defaultDone: true },
  { id: 'recent-trades', module: 'Dashboard', name: 'Recent Trades List', priority: 'P0', defaultDone: true },
  { id: 'trade-import-csv', module: 'Trades', name: 'CSV Trade Import', priority: 'P0', defaultDone: true },
  { id: 'trade-logging', module: 'Trades', name: 'Manual Trade Logging', priority: 'P0', defaultDone: true },
  { id: 'demo-seed', module: 'Data', name: 'Demo Data Seeder (120 trades)', priority: 'P1', defaultDone: true },
  // M2 - AI & Playbook
  { id: 'ai-patterns', module: 'AI Playbook', name: 'Pattern Detection (Symbol/Session/Day/Setup)', priority: 'P0', defaultDone: true },
  { id: 'ai-insights', module: 'AI Playbook', name: 'AI Insights (streak, overtrading, PF)', priority: 'P0', defaultDone: true },
  { id: 'playbook-cards', module: 'AI Playbook', name: 'Playbook Cards UI', priority: 'P0', defaultDone: true },
  // M3 - Journal & Alerts
  { id: 'journal-db', module: 'Journal', name: 'Journal connected to DB', priority: 'P0', defaultDone: true },
  { id: 'journal-mood', module: 'Journal', name: 'Mood/Confidence/Focus tracking', priority: 'P1', defaultDone: true },
  { id: 'journal-premarket', module: 'Journal', name: 'Pre-market Plan & Post-market Review', priority: 'P1', defaultDone: true },
  { id: 'alerts-real', module: 'Alerts', name: 'Real Alerts Page (DB-backed)', priority: 'P1', defaultDone: true },
  { id: 'screenshots', module: 'Journal', name: 'Screenshot Uploads', priority: 'P2', defaultDone: false },
  // M4 - Reports & Prop Firm
  { id: 'reports-20', module: 'Reports', name: '22 Performance Metrics', priority: 'P0', defaultDone: true },
  { id: 'export-csv', module: 'Reports', name: 'CSV Export', priority: 'P0', defaultDone: true },
  { id: 'export-pdf', module: 'Reports', name: 'PDF Export (Print)', priority: 'P0', defaultDone: true },
  { id: 'period-filter', module: 'Reports', name: 'Period Comparison Filter', priority: 'P1', defaultDone: true },
  { id: 'prop-firm', module: 'Prop Firm', name: 'Multi-Challenge Tracker (4 max)', priority: 'P0', defaultDone: true },
  { id: 'prop-9firms', module: 'Prop Firm', name: '9 Firm Presets', priority: 'P1', defaultDone: true },
  { id: 'prop-dd-alerts', module: 'Prop Firm', name: 'Drawdown Warning Bars', priority: 'P1', defaultDone: true },
  { id: 'prop-calc', module: 'Prop Firm', name: 'Profit Split Calculator', priority: 'P2', defaultDone: true },
  // M5 - Notebook, Replay, Broker
  { id: 'notebook', module: 'Notebook', name: 'Trading Notebook (notes)', priority: 'P2', defaultDone: true },
  { id: 'broker-dir', module: 'Integrations', name: 'Broker Directory Page', priority: 'P2', defaultDone: true },
  { id: 'lot-calc', module: 'Risk Tools', name: 'Lot Size / Position Calculator', priority: 'P0', defaultDone: true },
  { id: 'risk-rr', module: 'Risk Tools', name: 'Risk:Reward Calculator', priority: 'P1', defaultDone: true },
  { id: 'behavioral', module: 'Diagnostics', name: 'Behavioral Diagnostics', priority: 'P1', defaultDone: true },
  { id: 'bar-replay', module: 'Backtesting', name: 'Bar Replay (candle-by-candle)', priority: 'P2', defaultDone: false },
  { id: 'mt5-sync', module: 'Integrations', name: 'MT5 Auto-Sync', priority: 'P2', defaultDone: false },
  { id: 'parity-dash', module: 'Meta', name: 'Parity Dashboard', priority: 'P1', defaultDone: true },
];

export default function ParityDashboard() {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('parity-overrides');
    if (saved) setOverrides(JSON.parse(saved));
  }, []);

  const toggle = (id: string) => {
    const feat = FEATURES.find(f => f.id === id)!;
    const current = overrides[id] ?? feat.defaultDone;
    const next = { ...overrides, [id]: !current };
    setOverrides(next);
    localStorage.setItem('parity-overrides', JSON.stringify(next));
  };

  const isDone = (f: Feature) => overrides[f.id] ?? f.defaultDone;
  const doneCount = FEATURES.filter(isDone).length;
  const pct = Math.round((doneCount / FEATURES.length) * 100);

  const modules = [...new Set(FEATURES.map(f => f.module))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle title="Parity Dashboard" subtitle="MMC vs ProJournX feature checklist" />
        <Badge variant={pct >= 80 ? 'default' : 'secondary'} className="text-sm w-fit">
          {pct}% Parity — {doneCount}/{FEATURES.length} features
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 mb-2">
            <Progress value={pct} className="flex-1 h-3" />
            <span className="text-sm font-mono font-bold">{pct}%</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {doneCount} done</span>
            <span className="flex items-center gap-1"><Circle className="h-3 w-3" /> {FEATURES.length - doneCount} remaining</span>
          </div>
        </CardContent>
      </Card>

      {modules.map(mod => {
        const modFeatures = FEATURES.filter(f => f.module === mod);
        const modDone = modFeatures.filter(isDone).length;
        return (
          <Card key={mod}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{mod}</span>
                <Badge variant={modDone === modFeatures.length ? 'default' : 'outline'} className="text-[10px]">
                  {modDone}/{modFeatures.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {modFeatures.map(f => (
                  <div key={f.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      {isDone(f) ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                      <span className={cn("text-sm", isDone(f) && 'text-muted-foreground line-through')}>{f.name}</span>
                      <Badge variant="outline" className={cn("text-[9px]",
                        f.priority === 'P0' && 'border-red-500/50 text-red-400',
                        f.priority === 'P1' && 'border-amber-500/50 text-amber-400',
                        f.priority === 'P2' && 'border-blue-500/50 text-blue-400'
                      )}>{f.priority}</Badge>
                    </div>
                    <Switch checked={isDone(f)} onCheckedChange={() => toggle(f.id)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
