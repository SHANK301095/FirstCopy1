/**
 * Dashboard Customization — Drag-free widget toggle for dashboard sections
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Settings2, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface DashboardWidget {
  id: string;
  label: string;
  enabled: boolean;
  category: 'core' | 'analytics' | 'ai' | 'risk';
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'kpis', label: 'KPI Cards', enabled: true, category: 'core' },
  { id: 'equity', label: 'Equity Curve', enabled: true, category: 'core' },
  { id: 'calendar', label: 'P&L Calendar', enabled: true, category: 'core' },
  { id: 'risk_budget', label: 'Risk Budget', enabled: true, category: 'risk' },
  { id: 'tilt', label: 'Tilt Detection', enabled: true, category: 'risk' },
  { id: 'drawdown', label: 'Drawdown Analyzer', enabled: true, category: 'analytics' },
  { id: 'session_heatmap', label: 'Session Heatmap', enabled: true, category: 'analytics' },
  { id: 'playbook', label: 'AI Playbook', enabled: true, category: 'ai' },
  { id: 'recent_trades', label: 'Recent Trades', enabled: true, category: 'core' },
  { id: 'achievements', label: 'Achievements', enabled: true, category: 'core' },
  { id: 'slippage', label: 'Slippage Tracker', enabled: false, category: 'analytics' },
  { id: 'portfolio_heat', label: 'Portfolio Heat Map', enabled: false, category: 'analytics' },
  { id: 'market_regime', label: 'Market Regime', enabled: false, category: 'ai' },
  { id: 'win_probability', label: 'Win Probability', enabled: false, category: 'analytics' },
  { id: 'trade_replay', label: 'AI Trade Replay', enabled: false, category: 'ai' },
  { id: 'mentor', label: 'Mentor Mode', enabled: false, category: 'core' },
  { id: 'templates', label: 'Trade Templates', enabled: false, category: 'core' },
  { id: 'tradingview', label: 'Live Chart', enabled: false, category: 'core' },
  { id: 'ai_insights', label: 'AI Insights Hub', enabled: false, category: 'ai' },
];

const STORAGE_KEY = 'mmc-dashboard-widgets';

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DashboardWidget[];
        // Merge with defaults to pick up new widgets
        return DEFAULT_WIDGETS.map(dw => {
          const existing = parsed.find(p => p.id === dw.id);
          return existing ? { ...dw, enabled: existing.enabled } : dw;
        });
      } catch { return DEFAULT_WIDGETS; }
    }
    return DEFAULT_WIDGETS;
  });

  const toggle = (id: string) => {
    setWidgets(prev => {
      const next = prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isEnabled = (id: string) => widgets.find(w => w.id === id)?.enabled ?? false;

  return { widgets, toggle, reset, isEnabled };
}

const categoryLabels: Record<string, string> = { core: 'Core', analytics: 'Analytics', ai: 'AI-Powered', risk: 'Risk' };

export function DashboardCustomizer({ widgets, toggle, reset }: { widgets: DashboardWidget[]; toggle: (id: string) => void; reset: () => void }) {
  const grouped = widgets.reduce((acc, w) => {
    if (!acc[w.category]) acc[w.category] = [];
    acc[w.category].push(w);
    return acc;
  }, {} as Record<string, DashboardWidget[]>);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-1.5" /> Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Dashboard Widgets</DialogTitle>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{categoryLabels[cat]}</p>
              <div className="space-y-1.5">
                {items.map(w => (
                  <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30">
                    <span className="text-sm">{w.label}</span>
                    <Switch checked={w.enabled} onCheckedChange={() => toggle(w.id)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
