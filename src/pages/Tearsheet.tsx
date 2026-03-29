/**
 * Tearsheet / Reports Page
 * Standardized performance tearsheet with export options
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, TrendingUp, Play,
  Loader2, Database, FileSpreadsheet, FileJson,
  FileCode, Library
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBacktestStore, type Trade } from '@/lib/backtestStore';
import { EquityChart } from '@/components/charts/EquityChart';
import { MonthlyHeatmap } from '@/components/charts/MonthlyHeatmap';
import { TradeExplorer } from '@/components/results/TradeExplorer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, AssetOption } from '@/components/selectors/UniversalAssetSelector';
import { generateProfessionalTearsheet } from '@/lib/professionalPdfExport';

interface TearsheetMetrics {
  // Core metrics
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  // Risk metrics
  maxDrawdownPercent: number;
  maxDrawdownAmount: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  // Advanced metrics
  cagr: number;
  expectancyR: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgHoldTime: number;
  // Data
  equityCurve: number[];
  drawdownCurve: number[];
  trades: Trade[];
  symbol: string;
  dateRange: string;
}

interface CloudResult {
  id: string;
  summary_json: Record<string, unknown>;
  created_at: string;
}

export default function Tearsheet() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { results: sessionResults } = useBacktestStore();
  const [cloudResults, setCloudResults] = useState<CloudResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<'session' | string>('session');
  const [loading, setLoading] = useState(true);
  const [selectedResultAsset, setSelectedResultAsset] = useState<AssetOption | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    loadCloudResults();
  }, [user]);

  const loadCloudResults = async () => {
    setLoading(true);
    if (user) {
      try {
        const { data, error } = await supabase
          .from('results')
          .select('id, created_at, summary_json')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data) {
          // Cast the data to CloudResult type
          const typedData: CloudResult[] = data.map(item => ({
            id: item.id,
            created_at: item.created_at || '',
            summary_json: (item.summary_json || {}) as Record<string, unknown>,
          }));
          setCloudResults(typedData);
        }
      } catch {
        // Cloud results load failed - continue with local data
      }
    }
    setLoading(false);
  };

  const getMetrics = (): TearsheetMetrics | null => {
    if (selectedSource === 'session' && sessionResults) {
      const avgWin = sessionResults.winningTrades > 0 
        ? sessionResults.grossProfit / sessionResults.winningTrades : 0;
      const avgLoss = sessionResults.losingTrades > 0 
        ? Math.abs(sessionResults.grossLoss) / sessionResults.losingTrades : 0;
      
      const sortedByPnl = [...(sessionResults.trades || [])].sort((a, b) => b.pnl - a.pnl);
      
      return {
        netProfit: sessionResults.netProfit,
        grossProfit: sessionResults.grossProfit,
        grossLoss: sessionResults.grossLoss,
        totalTrades: sessionResults.totalTrades,
        winningTrades: sessionResults.winningTrades,
        losingTrades: sessionResults.losingTrades,
        winRate: sessionResults.winRate,
        profitFactor: sessionResults.profitFactor,
        maxDrawdownPercent: sessionResults.maxDrawdownPercent,
        maxDrawdownAmount: sessionResults.maxDrawdownAmount,
        sharpeRatio: sessionResults.sharpeRatio,
        cagr: sessionResults.cagr,
        expectancyR: sessionResults.expectancyR,
        avgWin,
        avgLoss,
        largestWin: sortedByPnl[0]?.pnl || 0,
        largestLoss: sortedByPnl[sortedByPnl.length - 1]?.pnl || 0,
        avgHoldTime: 0,
        equityCurve: sessionResults.equityCurve,
        drawdownCurve: sessionResults.drawdownCurve,
        trades: sessionResults.trades || [],
        symbol: sessionResults.symbol,
        dateRange: sessionResults.dateRange,
      };
    }

    const cloudResult = cloudResults.find(r => r.id === selectedSource);
    if (cloudResult) {
      const s = cloudResult.summary_json;
      const trades = (s.trades as Trade[]) || [];
      const sortedByPnl = [...trades].sort((a, b) => b.pnl - a.pnl);
      
      return {
        netProfit: (s.netProfit as number) || 0,
        grossProfit: (s.grossProfit as number) || 0,
        grossLoss: (s.grossLoss as number) || 0,
        totalTrades: (s.totalTrades as number) || 0,
        winningTrades: (s.winningTrades as number) || 0,
        losingTrades: (s.losingTrades as number) || 0,
        winRate: (s.winRate as number) || 0,
        profitFactor: (s.profitFactor as number) || 0,
        maxDrawdownPercent: (s.maxDrawdownPercent as number) || 0,
        maxDrawdownAmount: (s.maxDrawdownAmount as number) || 0,
        sharpeRatio: (s.sharpeRatio as number) || 0,
        cagr: (s.cagr as number) || 0,
        expectancyR: (s.expectancyR as number) || 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: sortedByPnl[0]?.pnl || 0,
        largestLoss: sortedByPnl[sortedByPnl.length - 1]?.pnl || 0,
        avgHoldTime: 0,
        equityCurve: (s.equityCurve as number[]) || [],
        drawdownCurve: (s.drawdownCurve as number[]) || [],
        trades,
        symbol: (s.symbol as string) || 'Unknown',
        dateRange: (s.dateRange as string) || '',
      };
    }

    return null;
  };

  const metrics = getMetrics();

  // Prepare rolling metrics charts
  const rollingData = useMemo(() => {
    if (!metrics?.equityCurve || metrics.equityCurve.length < 20) return [];
    
    const data = [];
    const windowSize = 20;
    
    for (let i = windowSize; i < metrics.equityCurve.length; i++) {
      const window = metrics.equityCurve.slice(i - windowSize, i);
      const returns = window.slice(1).map((v, j) => (v - window[j]) / (window[j] || 1));
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      
      // Calculate rolling max drawdown
      let peak = window[0];
      let maxDd = 0;
      for (const val of window) {
        if (val > peak) peak = val;
        const dd = (peak - val) / peak;
        if (dd > maxDd) maxDd = dd;
      }
      
      data.push({
        point: i,
        rollingReturn: avgReturn * 100,
        rollingDD: maxDd * 100,
      });
    }
    
    return data;
  }, [metrics?.equityCurve]);

  // Prepare monthly returns for heatmap
  const monthlyReturns = useMemo(() => {
    if (!metrics?.trades || metrics.trades.length === 0) return {};
    
    const monthly: Record<string, number> = {};
    
    for (const trade of metrics.trades) {
      const date = new Date(trade.exitTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + (trade.pnlPercent || 0);
    }
    
    return monthly;
  }, [metrics?.trades]);

  const exportCSV = () => {
    if (!metrics) return;
    
    const lines = [
      'TEARSHEET SUMMARY',
      `Symbol,${metrics.symbol}`,
      `Date Range,${metrics.dateRange}`,
      '',
      'PERFORMANCE METRICS',
      `Net Profit,${metrics.netProfit}`,
      `Win Rate,${metrics.winRate}%`,
      `Profit Factor,${metrics.profitFactor}`,
      `Total Trades,${metrics.totalTrades}`,
      `Sharpe Ratio,${metrics.sharpeRatio}`,
      `Max Drawdown,${metrics.maxDrawdownPercent}%`,
      `CAGR,${metrics.cagr}%`,
      '',
      'TRADES',
      'Entry Time,Exit Time,Direction,Entry Price,Exit Price,P&L,P&L %',
    ];
    
    metrics.trades.forEach(t => {
      lines.push(`${t.entryTime},${t.exitTime},${t.direction},${t.entryPrice},${t.exitPrice},${t.pnl},${t.pnlPercent}`);
    });
    
    const csv = lines.join('\n');
    downloadFile(csv, `tearsheet-${metrics.symbol}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    toast({ title: 'Exported', description: 'Tearsheet exported as CSV' });
  };

  const exportJSON = () => {
    if (!metrics) return;
    const json = JSON.stringify(metrics, null, 2);
    downloadFile(json, `tearsheet-${metrics.symbol}-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    toast({ title: 'Exported', description: 'Tearsheet exported as JSON' });
  };

  const exportHTML = () => {
    if (!metrics) return;
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Strategy Tearsheet - ${metrics.symbol}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 40px 20px; background: #0f1117; color: #e4e4e7; }
    h1 { color: #22d3ee; margin-bottom: 8px; }
    .subtitle { color: #71717a; margin-bottom: 32px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #a1a1aa; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .metric-card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; }
    .metric-label { font-size: 12px; color: #71717a; margin-bottom: 4px; }
    .metric-value { font-size: 24px; font-weight: 700; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 12px; background: #18181b; color: #a1a1aa; font-weight: 500; }
    td { padding: 12px; border-bottom: 1px solid #27272a; }
    .generated { text-align: center; color: #52525b; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <h1>Strategy Tearsheet</h1>
  <p class="subtitle">${metrics.symbol} | ${metrics.dateRange} | ${metrics.totalTrades} trades</p>
  
  <div class="section">
    <div class="section-title">Performance Overview</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Net Profit</div>
        <div class="metric-value ${metrics.netProfit >= 0 ? 'positive' : 'negative'}">₹${metrics.netProfit.toLocaleString()}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Win Rate</div>
        <div class="metric-value">${metrics.winRate.toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Profit Factor</div>
        <div class="metric-value">${metrics.profitFactor.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sharpe Ratio</div>
        <div class="metric-value">${metrics.sharpeRatio.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Max Drawdown</div>
        <div class="metric-value negative">${metrics.maxDrawdownPercent.toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">CAGR</div>
        <div class="metric-value">${metrics.cagr.toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Winning Trades</div>
        <div class="metric-value positive">${metrics.winningTrades}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Losing Trades</div>
        <div class="metric-value negative">${metrics.losingTrades}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Recent Trades (Last 20)</div>
    <table>
      <tr><th>Entry</th><th>Exit</th><th>Direction</th><th>P&L</th></tr>
      ${metrics.trades.slice(0, 20).map(t => `
        <tr>
          <td>${new Date(t.entryTime).toLocaleString()}</td>
          <td>${new Date(t.exitTime).toLocaleString()}</td>
          <td>${t.direction.toUpperCase()}</td>
          <td class="${t.pnl >= 0 ? 'positive' : 'negative'}">₹${t.pnl.toFixed(0)}</td>
        </tr>
      `).join('')}
    </table>
  </div>
  
  <p class="generated">Generated by MMC Backtest Lab | ${new Date().toLocaleString()}</p>
</body>
</html>`;
    
    downloadFile(html, `tearsheet-${metrics.symbol}-${new Date().toISOString().split('T')[0]}.html`, 'text/html');
    toast({ title: 'Exported', description: 'Tearsheet exported as HTML' });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageTitle 
          title="Strategy Tearsheet" 
          subtitle="Comprehensive performance report with exports"
        />
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              <Database className="h-3 w-3 mr-1" />
              Source
            </Badge>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session" disabled={!sessionResults}>
                  Current Session {!sessionResults && '(empty)'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              <Library className="h-3 w-3 mr-1" />
              Library
            </Badge>
            <UniversalAssetSelector
              assetType="result"
              value={selectedResultAsset}
              onSelect={(asset) => {
                setSelectedResultAsset(asset);
                if (asset) setSelectedSource(asset.id);
              }}
              placeholder="Pick from library..."
              className="w-48"
            />
          </div>
          
          <Separator orientation="vertical" className="h-8" />
          
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!metrics}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} disabled={!metrics}>
            <FileJson className="h-4 w-4 mr-1" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportHTML} disabled={!metrics}>
            <FileCode className="h-4 w-4 mr-1" />
            HTML
          </Button>
          <Button 
            size="sm" 
            onClick={async () => {
              if (!metrics) return;
              setExportingPdf(true);
              toast({ title: 'Generating PDF...', description: 'Creating professional tearsheet' });
              try {
                await generateProfessionalTearsheet({
                  ...metrics,
                  traderName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Trader',
                  strategyName: metrics.symbol,
                });
                toast({ title: 'PDF Downloaded!', description: 'Professional tearsheet saved' });
              } catch (e) {
                toast({ title: 'PDF generation failed', description: String(e), variant: 'destructive' });
              } finally {
                setExportingPdf(false);
              }
            }} 
            disabled={!metrics || exportingPdf}
          >
            {exportingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            PDF Tearsheet
          </Button>
        </div>
      </div>

      {!metrics ? (
        <Card>
          <CardContent className="py-4">
            <EmptyState
              icon={FileText}
              title="No Results Available"
              description="Run a backtest first to generate a comprehensive performance tearsheet with detailed analytics and export options."
              primaryAction={{
                label: 'Run Backtest',
                onClick: () => navigate('/workflow'),
                icon: Play,
              }}
              secondaryAction={{
                label: 'View Saved Results',
                onClick: () => navigate('/saved-results'),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trades">Trade Explorer</TabsTrigger>
            <TabsTrigger value="rolling">Rolling Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Header Card */}
            <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2">{metrics.symbol}</Badge>
                    <h2 className="text-2xl font-bold">
                      Net Profit: <span className={metrics.netProfit >= 0 ? 'text-profit' : 'text-loss'}>
                        ₹{metrics.netProfit.toLocaleString()}
                      </span>
                    </h2>
                    <p className="text-muted-foreground">{metrics.dateRange} | {metrics.totalTrades} trades</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{metrics.winRate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{metrics.profitFactor.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Sharpe</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: 'Gross Profit', value: `₹${metrics.grossProfit.toLocaleString()}`, color: 'text-profit' },
                { label: 'Gross Loss', value: `₹${Math.abs(metrics.grossLoss).toLocaleString()}`, color: 'text-loss' },
                { label: 'Max Drawdown', value: `${metrics.maxDrawdownPercent.toFixed(1)}%`, color: 'text-loss' },
                { label: 'CAGR', value: `${metrics.cagr.toFixed(1)}%`, color: metrics.cagr >= 0 ? 'text-profit' : 'text-loss' },
                { label: 'Avg Win', value: `₹${metrics.avgWin.toFixed(0)}`, color: 'text-profit' },
                { label: 'Avg Loss', value: `₹${metrics.avgLoss.toFixed(0)}`, color: 'text-loss' },
                { label: 'Largest Win', value: `₹${metrics.largestWin.toFixed(0)}`, color: 'text-profit' },
                { label: 'Largest Loss', value: `₹${Math.abs(metrics.largestLoss).toFixed(0)}`, color: 'text-loss' },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn('text-xl font-bold', color)}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Equity Curve */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <EquityChart 
                    data={metrics.equityCurve} 
                    showCard={false}
                    height={200}
                  />
                </CardContent>
              </Card>

              {/* Monthly Returns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyHeatmap data={monthlyReturns} />
                </CardContent>
              </Card>
            </div>

            {/* Drawdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drawdown</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.drawdownCurve.map((v, i) => ({ point: i, dd: -v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="point" tick={false} />
                    <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                      contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="dd" 
                      stroke="hsl(var(--destructive))" 
                      fill="hsl(var(--destructive) / 0.3)" 
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <TradeExplorer trades={metrics.trades} />
          </TabsContent>

          <TabsContent value="rolling" className="space-y-6">
            {rollingData.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rolling Return (20-bar)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rollingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="point" tick={false} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rollingReturn" 
                          stroke="hsl(var(--primary))" 
                          dot={false}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rolling Max Drawdown (20-bar)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rollingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="point" tick={false} />
                        <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Max DD']}
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="rollingDD" 
                          stroke="hsl(var(--destructive))" 
                          fill="hsl(var(--destructive) / 0.3)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium">Not enough data</p>
                  <p className="text-muted-foreground">Need at least 20 data points for rolling metrics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
