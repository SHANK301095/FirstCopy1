/**
 * AI Insights Hub — Weekly Report, Position Sizing, Risk Alerts, Exit Advisor, Pattern Discovery
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, FileText, Calculator, ShieldAlert, DoorOpen, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trade } from '@/hooks/useTradesDB';
import type { TradeStats } from '@/hooks/useTradesDB';

const INSIGHT_TYPES = [
  { key: 'weekly_report', label: 'Weekly Report', icon: FileText, description: 'AI-generated weekly performance summary' },
  { key: 'position_sizing', label: 'Position Sizing', icon: Calculator, description: 'Kelly Criterion & optimal sizing' },
  { key: 'risk_alert', label: 'Risk Alerts', icon: ShieldAlert, description: 'Real-time risk assessment' },
  { key: 'exit_advisor', label: 'Exit Advisor', icon: DoorOpen, description: 'Smart exit recommendations' },
  { key: 'pattern_discovery', label: 'Pattern Discovery', icon: Search, description: 'Hidden edge detection' },
] as const;

function buildTradeContext(trades: Trade[], stats: TradeStats | null) {
  const closed = trades.filter(t => t.status === 'closed');
  const recent = closed.slice(0, 30);
  const open = trades.filter(t => t.status === 'open');

  return {
    stats,
    totalTrades: closed.length,
    recentTrades: recent.map(t => ({
      symbol: t.symbol,
      direction: t.direction,
      pnl: t.net_pnl,
      r_multiple: t.r_multiple,
      setup_type: t.setup_type,
      session_tag: t.session_tag,
      entry_time: t.entry_time,
      exit_time: t.exit_time,
      emotions: t.emotions,
      tags: t.tags,
    })),
    openPositions: open.map(t => ({
      symbol: t.symbol,
      direction: t.direction,
      entry_price: t.entry_price,
      stop_loss: t.stop_loss,
      take_profit: t.take_profit,
      entry_time: t.entry_time,
      quantity: t.quantity,
    })),
    symbolBreakdown: Object.entries(
      closed.reduce((acc, t) => {
        acc[t.symbol] = (acc[t.symbol] || 0) + (t.net_pnl || 0);
        return acc;
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1]),
  };
}

export function AIInsightsHub({ trades, stats }: { trades: Trade[]; stats: TradeStats | null }) {
  const [activeTab, setActiveTab] = useState('weekly_report');
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const generate = async (type: string) => {
    setLoading(type);
    try {
      const context = buildTradeContext(trades, stats);
      const { data, error } = await supabase.functions.invoke('ai-trade-insights', {
        body: { tradeContext: context, type },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === 'Rate limited') toast.error('Rate limited — please wait a moment');
        else if (data.error === 'Credits exhausted') toast.error('AI credits exhausted — add more in settings');
        else throw new Error(data.error);
        return;
      }
      setResults(prev => ({ ...prev, [type]: data.reply }));
      toast.success('AI insight generated');
    } catch (err: any) {
      toast.error('Failed to generate insight', { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Insights Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto">
            {INSIGHT_TYPES.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs py-1.5 px-1">
                <t.icon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {INSIGHT_TYPES.map(t => (
            <TabsContent key={t.key} value={t.key} className="mt-3">
              <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
              
              {!results[t.key] ? (
                <div className="text-center py-6">
                  <Button onClick={() => generate(t.key)} disabled={loading === t.key}>
                    {loading === t.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Generate {t.label}
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                    {results[t.key]}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
