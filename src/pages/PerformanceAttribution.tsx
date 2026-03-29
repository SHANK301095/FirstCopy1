/**
 * Performance Attribution Page
 * Phase 8: Factor analysis and attribution reporting
 */

import { useState } from 'react';
import { 
  PieChart, BarChart3, TrendingUp, TrendingDown, 
  Calendar, Clock, Filter, Download, Upload, FileUp 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBacktestStore } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';

interface AttributionFactor {
  name: string;
  contribution: number;
  trades: number;
  winRate: number;
  avgPnl: number;
  color: string;
}

interface TimeAttribution {
  period: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export default function PerformanceAttribution() {
  const { results } = useBacktestStore();
  const [activeTab, setActiveTab] = useState('direction');
  
  const [directionAttribution, setDirectionAttribution] = useState<AttributionFactor[]>([]);
  const [timeOfDayAttribution, setTimeOfDayAttribution] = useState<AttributionFactor[]>([]);
  const [dayOfWeekAttribution, setDayOfWeekAttribution] = useState<AttributionFactor[]>([]);
  const [monthlyAttribution, setMonthlyAttribution] = useState<TimeAttribution[]>([]);
  const [holdingPeriodAttribution, setHoldingPeriodAttribution] = useState<AttributionFactor[]>([]);

  // Calculate from actual trade data when available
  function calculateAttributions() {
    if (!results?.trades) return;
    
    const trades = results.trades;
    
    const longs = trades.filter(t => t.direction === 'long');
    const shorts = trades.filter(t => t.direction === 'short');
    
    const longPnl = longs.reduce((s, t) => s + t.pnl, 0);
    const shortPnl = shorts.reduce((s, t) => s + t.pnl, 0);
    const totalPnl = longPnl + shortPnl;
    
    setDirectionAttribution([
      { 
        name: 'Long Trades', 
        contribution: totalPnl !== 0 ? (longPnl / Math.abs(totalPnl)) * 100 : 50, 
        trades: longs.length, 
        winRate: longs.length > 0 ? (longs.filter(t => t.pnl > 0).length / longs.length) * 100 : 0,
        avgPnl: longs.length > 0 ? longPnl / longs.length : 0,
        color: 'hsl(var(--profit))' 
      },
      { 
        name: 'Short Trades', 
        contribution: totalPnl !== 0 ? (shortPnl / Math.abs(totalPnl)) * 100 : 50, 
        trades: shorts.length, 
        winRate: shorts.length > 0 ? (shorts.filter(t => t.pnl > 0).length / shorts.length) * 100 : 0,
        avgPnl: shorts.length > 0 ? shortPnl / shorts.length : 0,
        color: 'hsl(var(--loss))' 
      },
    ]);
  }

  const AttributionBar = ({ factors }: { factors: AttributionFactor[] }) => (
    <div className="space-y-3">
      <div className="h-8 flex rounded-lg overflow-hidden">
        {factors.map((f) => (
          <div
            key={f.name}
            className="h-full transition-all"
            style={{ 
              width: `${Math.abs(f.contribution)}%`,
              backgroundColor: f.color
            }}
            title={`${f.name}: ${f.contribution.toFixed(1)}%`}
          />
        ))}
      </div>
      
      <div className="grid gap-2 sm:grid-cols-2">
        {factors.map(f => (
          <div key={f.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: f.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">{f.name}</span>
                <span className={cn(
                  'font-mono text-sm',
                  f.contribution >= 0 ? 'text-profit' : 'text-loss'
                )}>{f.contribution.toFixed(1)}%</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>{f.trades} trades</span>
                <span>{f.winRate.toFixed(0)}% win</span>
                <span className={f.avgPnl >= 0 ? 'text-profit' : 'text-loss'}>
                  ₹{f.avgPnl.toFixed(0)} avg
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const EmptyState = ({ title, description }: { title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Upload className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{description}</p>
      <Button variant="outline">
        <FileUp className="h-4 w-4 mr-2" />
        Upload Trade Data
      </Button>
    </div>
  );

  const hasData = results?.trades && results.trades.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Attribution</h1>
          <p className="text-muted-foreground">Analyze what drives your strategy returns</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!hasData}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {!hasData ? (
        <Card>
          <CardContent>
            <EmptyState 
              title="No Trade Data" 
              description="Run a backtest or upload your trade history to see performance attribution analysis."
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="direction" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Direction
            </TabsTrigger>
            <TabsTrigger value="time" className="gap-2">
              <Clock className="h-4 w-4" />
              Time of Day
            </TabsTrigger>
            <TabsTrigger value="weekday" className="gap-2">
              <Calendar className="h-4 w-4" />
              Day of Week
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="holding" className="gap-2">
              <Filter className="h-4 w-4" />
              Holding Period
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direction" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Long vs Short Attribution</CardTitle>
                <CardDescription>Contribution of long and short trades to total P&L</CardDescription>
              </CardHeader>
              <CardContent>
                {directionAttribution.length > 0 ? (
                  <AttributionBar factors={directionAttribution} />
                ) : (
                  <EmptyState title="No Direction Data" description="Upload trade data with direction information." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Time of Day Attribution</CardTitle>
                <CardDescription>Performance by trading session</CardDescription>
              </CardHeader>
              <CardContent>
                {timeOfDayAttribution.length > 0 ? (
                  <AttributionBar factors={timeOfDayAttribution} />
                ) : (
                  <EmptyState title="No Time Data" description="Upload trade data with timestamp information." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekday" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Day of Week Attribution</CardTitle>
                <CardDescription>Performance by weekday</CardDescription>
              </CardHeader>
              <CardContent>
                {dayOfWeekAttribution.length > 0 ? (
                  <AttributionBar factors={dayOfWeekAttribution} />
                ) : (
                  <EmptyState title="No Weekday Data" description="Upload trade data with date information." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>P&L breakdown by calendar month</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyAttribution.length > 0 ? (
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {monthlyAttribution.map(m => (
                      <div 
                        key={m.period}
                        className={cn(
                          'p-3 rounded-lg text-center',
                          m.pnl >= 0 ? 'bg-profit/10' : 'bg-loss/10'
                        )}
                      >
                        <div className="text-sm font-medium">{m.period}</div>
                        <div className={cn(
                          'text-lg font-mono font-bold',
                          m.pnl >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {m.pnl >= 0 ? '+' : ''}{(m.pnl / 1000).toFixed(1)}k
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.trades} trades • {m.winRate.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No Monthly Data" description="Upload trade data to see monthly performance." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Holding Period Attribution</CardTitle>
                <CardDescription>Performance by trade duration</CardDescription>
              </CardHeader>
              <CardContent>
                {holdingPeriodAttribution.length > 0 ? (
                  <AttributionBar factors={holdingPeriodAttribution} />
                ) : (
                  <EmptyState title="No Holding Data" description="Upload trade data with entry/exit times." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Key Insights - only show when data exists */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Insights will appear here based on your trade data analysis.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
