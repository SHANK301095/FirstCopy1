/**
 * MT5 Hub — Strategy Converter, INI Config Generator, Live Backtest Dashboard
 * Unified command center for MetaTrader 5 integration
 */

import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Code2,
  FileText,
  Play,
  Pause,
  Square,
  RefreshCw,
  Download,
  Copy,
  Settings2,
  Cpu,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Rocket,
  Zap,
  Monitor,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { generateTesterINI, createRunId, getReportPath } from '@/desktop/mt5/runner';
import type { LiveBacktestState, BacktestStatus } from '@/desktop/components/LiveBacktestMonitor';

// ============= Types =============

interface StrategyFormState {
  code: string;
  name: string;
  description: string;
  params: StrategyParam[];
}

interface StrategyParam {
  name: string;
  type: 'int' | 'double' | 'string' | 'bool';
  defaultValue: string;
  min?: string;
  max?: string;
  step?: string;
}

interface INIConfigState {
  expert: string;
  expertParameters: string;
  symbol: string;
  period: string;
  fromDate: string;
  toDate: string;
  deposit: number;
  leverage: number;
  model: 'EveryTick' | 'OHLC1Minute' | 'OpenPrices' | 'MathCalculations';
  optimization: 'Disabled' | 'Complete' | 'Genetic' | 'AllSymbols';
  spread: number;
  visual: boolean;
}

// ============= Default States =============

const DEFAULT_INI: INIConfigState = {
  expert: '',
  expertParameters: '',
  symbol: 'EURUSD',
  period: 'H1',
  fromDate: '2024.01.01',
  toDate: '2024.12.31',
  deposit: 10000,
  leverage: 100,
  model: 'EveryTick',
  optimization: 'Disabled',
  spread: 0,
  visual: false,
};

const SAMPLE_MQL5 = `//+------------------------------------------------------------------+
//|                                        SimpleMA_EA.mq5           |
//|                                        MMC Strategy Hub          |
//+------------------------------------------------------------------+
input int    FastMA_Period = 10;    // Fast MA Period
input int    SlowMA_Period = 50;    // Slow MA Period
input double LotSize       = 0.1;  // Lot Size
input int    StopLoss      = 100;  // Stop Loss (points)
input int    TakeProfit    = 200;  // Take Profit (points)

//+------------------------------------------------------------------+
void OnTick()
{
   double fastMA = iMA(_Symbol, _Period, FastMA_Period, 0, MODE_SMA, PRICE_CLOSE);
   double slowMA = iMA(_Symbol, _Period, SlowMA_Period, 0, MODE_SMA, PRICE_CLOSE);
   
   // Buy signal
   if(fastMA > slowMA && PositionsTotal() == 0)
   {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      MqlTradeRequest request = {};
      request.action    = TRADE_ACTION_DEAL;
      request.symbol    = _Symbol;
      request.volume    = LotSize;
      request.type      = ORDER_TYPE_BUY;
      request.price     = ask;
      request.sl        = ask - StopLoss * _Point;
      request.tp        = ask + TakeProfit * _Point;
      request.deviation = 10;
      MqlTradeResult result = {};
      OrderSend(request, result);
   }
}`;

// ============= Helper: Parse MQL5 inputs =============

function parseMQL5Inputs(code: string): StrategyParam[] {
  const params: StrategyParam[] = [];
  const inputRegex = /input\s+(int|double|string|bool)\s+(\w+)\s*=\s*([^;]+);/g;
  let match;
  while ((match = inputRegex.exec(code)) !== null) {
    params.push({
      type: match[1] as StrategyParam['type'],
      name: match[2],
      defaultValue: match[3].trim(),
    });
  }
  return params;
}

// ============= Strategy Converter Panel =============

function StrategyConverterPanel() {
  const [form, setForm] = useState<StrategyFormState>({
    code: '',
    name: '',
    description: '',
    params: [],
  });
  const [parsed, setParsed] = useState(false);
  const isElectron = !!window.electronAPI;

  const handlePasteCode = useCallback((code: string) => {
    const params = parseMQL5Inputs(code);
    // Try to extract name from comment
    const nameMatch = code.match(/\|\s+(\w[\w\s_]+\.mq5)/);
    setForm(prev => ({
      ...prev,
      code,
      name: nameMatch ? nameMatch[1].replace('.mq5', '') : prev.name,
      params,
    }));
    setParsed(params.length > 0);
    if (params.length > 0) {
      toast.success(`${params.length} input parameters detected`);
    }
  }, []);

  const handleCompile = useCallback(async () => {
    if (!window.electronAPI) {
      toast.error('Compilation requires desktop mode. Install MMC Desktop app.');
      return;
    }
    try {
      toast.loading('Compiling EA...', { id: 'compile' });
      // Write .mq5 file, then compile
      const fileName = `${form.name || 'Strategy'}.mq5`;
      const filePath = `%APPDATA%/MMC/EA/${fileName}`;
      await window.electronAPI.writeFile(filePath, form.code);
      const result = await window.electronAPI.compileEA(filePath);
      toast.dismiss('compile');
      if (result) {
        toast.success('EA compiled successfully! Ready for backtest.');
      }
    } catch (err) {
      toast.dismiss('compile');
      toast.error('Compilation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [form]);

  const handleUseSample = () => {
    handlePasteCode(SAMPLE_MQL5);
  };

  const updateParam = (index: number, field: keyof StrategyParam, value: string) => {
    setForm(prev => ({
      ...prev,
      params: prev.params.map((p, i) => i === index ? { ...p, [field]: value } : p),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Strategy to MT5 Converter
          </h3>
          <p className="text-sm text-muted-foreground">
            Paste MQL5 code, auto-detect parameters, compile & launch
          </p>
        </div>
        <Badge variant={isElectron ? 'default' : 'outline'} className={!isElectron ? 'border-warning text-warning' : ''}>
          {isElectron ? '🟢 Desktop Connected' : '🟡 Web Mode'}
        </Badge>
      </div>

      {/* Code Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">MQL5 Source Code</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleUseSample}>
              <Zap className="h-3 w-3 mr-1" />
              Use Sample EA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.code}
            onChange={(e) => handlePasteCode(e.target.value)}
            placeholder="Paste your MQL5 Expert Advisor code here..."
            className="font-mono text-xs min-h-[280px] bg-background/50 resize-y"
          />
        </CardContent>
      </Card>

      {/* Detected Parameters */}
      {parsed && form.params.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Detected Parameters ({form.params.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {form.params.map((param, i) => (
                <div key={param.name} className="grid grid-cols-[200px_80px_1fr_1fr_1fr] gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {param.type}
                    </Badge>
                    <span className="text-sm font-mono truncate">{param.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Default</span>
                  <Input
                    value={param.defaultValue}
                    onChange={(e) => updateParam(i, 'defaultValue', e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  {(param.type === 'int' || param.type === 'double') && (
                    <>
                      <Input
                        placeholder="Min"
                        value={param.min || ''}
                        onChange={(e) => updateParam(i, 'min', e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      <Input
                        placeholder="Max"
                        value={param.max || ''}
                        onChange={(e) => updateParam(i, 'max', e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* EA Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">EA Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="SimpleMA_EA"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Description</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Moving average crossover strategy"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleCompile}
          disabled={!form.code.trim()}
          className="gap-2"
        >
          <Cpu className="h-4 w-4" />
          Compile EA
        </Button>
        <Button
          variant="outline"
          disabled={!form.code.trim()}
          onClick={() => {
            navigator.clipboard.writeText(form.code);
            toast.success('Code copied to clipboard');
          }}
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy Code
        </Button>
        {!isElectron && (
          <p className="text-xs text-muted-foreground self-center ml-2">
            ⚠️ Compilation requires MMC Desktop app with MT5 installed
          </p>
        )}
      </div>
    </div>
  );
}

// ============= INI Config Generator Panel =============

function INIConfigPanel() {
  const [config, setConfig] = useState<INIConfigState>(DEFAULT_INI);
  const [generatedINI, setGeneratedINI] = useState('');

  const handleGenerate = useCallback(() => {
    const reportPath = getReportPath(createRunId(config.expert || 'Strategy'), 'A');
    const testerConfig = {
      expert: config.expert,
      expertParameters: config.expertParameters,
      symbol: config.symbol,
      period: config.period,
      fromDate: config.fromDate,
      toDate: config.toDate,
      deposit: config.deposit,
      leverage: config.leverage,
      model: config.model,
      optimization: config.optimization,
      reportPath,
    };
    const ini = generateTesterINI(testerConfig, 'A');
    setGeneratedINI(ini);
    toast.success('INI config generated!');
  }, [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedINI);
    toast.success('INI copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedINI], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.expert || 'strategy'}_tester.ini`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('INI file downloaded');
  };

  const update = <K extends keyof INIConfigState>(key: K, value: INIConfigState[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          INI Config Generator
        </h3>
        <p className="text-sm text-muted-foreground">
          Build MT5 Strategy Tester config from your settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tester Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* EA Path */}
            <div className="space-y-1.5">
              <Label className="text-xs">Expert Advisor</Label>
              <Input
                value={config.expert}
                onChange={(e) => update('expert', e.target.value)}
                placeholder="Experts\\MyEA"
                className="font-mono text-sm"
              />
            </div>

            {/* Symbol & Period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Symbol</Label>
                <Select value={config.symbol} onValueChange={(v) => update('symbol', v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NIFTY50', 'BANKNIFTY', 'BTCUSD', 'US500'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timeframe</Label>
                <Select value={config.period} onValueChange={(v) => update('period', v)}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From Date</Label>
                <Input
                  value={config.fromDate}
                  onChange={(e) => update('fromDate', e.target.value)}
                  placeholder="2024.01.01"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To Date</Label>
                <Input
                  value={config.toDate}
                  onChange={(e) => update('toDate', e.target.value)}
                  placeholder="2024.12.31"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Deposit & Leverage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Deposit ($)</Label>
                <Input
                  type="number"
                  value={config.deposit}
                  onChange={(e) => update('deposit', Number(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Leverage</Label>
                <Select value={String(config.leverage)} onValueChange={(v) => update('leverage', Number(v))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[50, 100, 200, 500, 1000].map(l => (
                      <SelectItem key={l} value={String(l)}>1:{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label className="text-xs">Execution Model</Label>
              <Select value={config.model} onValueChange={(v) => update('model', v as INIConfigState['model'])}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EveryTick">Every Tick (Most accurate)</SelectItem>
                  <SelectItem value="OHLC1Minute">OHLC 1 Minute</SelectItem>
                  <SelectItem value="OpenPrices">Open Prices Only (Fastest)</SelectItem>
                  <SelectItem value="MathCalculations">Math Calculations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Optimization */}
            <div className="space-y-1.5">
              <Label className="text-xs">Optimization</Label>
              <Select value={config.optimization} onValueChange={(v) => update('optimization', v as INIConfigState['optimization'])}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disabled">Disabled</SelectItem>
                  <SelectItem value="Complete">Complete (Slow)</SelectItem>
                  <SelectItem value="Genetic">Genetic (Fast)</SelectItem>
                  <SelectItem value="AllSymbols">All Symbols</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visual Mode */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Visual Mode</Label>
              <Switch
                checked={config.visual}
                onCheckedChange={(v) => update('visual', v)}
              />
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2">
              <Rocket className="h-4 w-4" />
              Generate INI Config
            </Button>
          </CardContent>
        </Card>

        {/* Generated INI Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Generated INI</CardTitle>
              {generatedINI && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedINI ? (
              <pre className="bg-muted/30 border border-border/50 rounded-xl p-4 text-xs font-mono overflow-auto max-h-[500px] whitespace-pre-wrap text-foreground/80">
                {generatedINI}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground/50 gap-3">
                <FileText className="h-12 w-12" />
                <p className="text-sm">Configure settings and click "Generate INI Config"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Live Backtest Dashboard Panel =============

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatNum(num: number, dec = 2): string {
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(dec);
}

function LiveBacktestDashboard() {
  const isElectron = !!window.electronAPI;
  
  // Demo state (in desktop, this comes from useMT5Process hook)
  const [state, setState] = useState<LiveBacktestState>({
    runId: '',
    eaName: '',
    presetName: '',
    status: 'idle',
    progress: 0,
    startTime: 0,
    equity: [],
    drawdown: [],
    workerId: 'A',
  });
  const [elapsed, setElapsed] = useState(0);
  const [trades, setTrades] = useState<Array<{
    ticket: number;
    time: string;
    type: 'BUY' | 'SELL';
    symbol: string;
    lots: number;
    profit: number;
  }>>([]);

  // Listen for tester progress if in desktop mode
  useEffect(() => {
    if (!window.electronAPI?.onTesterProgress) return;
    const unsub = window.electronAPI.onTesterProgress((data) => {
      setState(prev => ({
        ...prev,
        status: data.progress >= 100 ? 'completed' : 'running',
        progress: data.progress,
        currentDate: data.currentDate,
        runId: data.runId,
      }));
    });
    return unsub;
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (state.status !== 'running') return;
    const iv = setInterval(() => setElapsed(Date.now() - state.startTime), 1000);
    return () => clearInterval(iv);
  }, [state.status, state.startTime]);

  // Demo simulation for web preview
  const startDemo = useCallback(() => {
    const startTime = Date.now();
    setState({
      runId: 'demo_' + Date.now(),
      eaName: 'SimpleMA_EA',
      presetName: 'Default',
      status: 'running',
      progress: 0,
      startTime,
      equity: [10000],
      drawdown: [0],
      currentEquity: 10000,
      currentDrawdown: 0,
      tradesCount: 0,
      profitFactor: 0,
      winRate: 0,
      workerId: 'A',
    });
    setTrades([]);
    setElapsed(0);

    let p = 0;
    let eq = 10000;
    let peak = 10000;
    const equityArr: number[] = [10000];
    const ddArr: number[] = [0];
    const tradeList: typeof trades = [];
    let tradeNo = 0;

    let stepIdx = 0;
    const iv = setInterval(() => {
      stepIdx++;
      // Deterministic progress: use step index for consistent progression
      p += (((stepIdx * 7 + 13) % 30) / 10) + 0.5;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setState(prev => ({ ...prev, status: 'completed', progress: 100 }));
        return;
      }

      // Deterministic equity changes based on step index (sin wave + hash)
      const hashVal = ((stepIdx * 2654435761) >>> 0) / 4294967296; // Knuth multiplicative hash [0,1)
      const delta = (hashVal - 0.42) * 200;
      eq = Math.max(eq + delta, 1000);
      if (eq > peak) peak = eq;
      const dd = ((peak - eq) / peak) * 100;
      equityArr.push(eq);
      ddArr.push(dd);

      // Deterministic trade generation every ~3 steps
      if (stepIdx % 3 === 0) {
        tradeNo++;
        tradeList.push({
          ticket: 100000 + tradeNo,
          time: new Date().toLocaleTimeString(),
          type: tradeNo % 2 === 0 ? 'BUY' : 'SELL',
          symbol: 'EURUSD',
          lots: 0.1,
          profit: delta,
        });
        setTrades([...tradeList]);
      }

      const dayOfMonth = Math.max(1, ((stepIdx * 17) % 28) + 1);
      setState(prev => ({
        ...prev,
        progress: p,
        equity: [...equityArr],
        drawdown: [...ddArr],
        currentEquity: eq,
        currentDrawdown: dd,
        tradesCount: tradeList.length,
        winRate: tradeList.length > 0
          ? (tradeList.filter(t => t.profit > 0).length / tradeList.length) * 100
          : 0,
        profitFactor: tradeList.length > 0
          ? Math.abs(tradeList.filter(t => t.profit > 0).reduce((s, t) => s + t.profit, 0)) /
            Math.max(1, Math.abs(tradeList.filter(t => t.profit < 0).reduce((s, t) => s + t.profit, 0)))
          : 0,
        currentDate: `2024.${String(Math.ceil(p / 8.3)).padStart(2, '0')}.${String(dayOfMonth).padStart(2, '0')}`,
      }));
    }, 300);

    return () => clearInterval(iv);
  }, []);

  const equityData = state.equity.map((v, i) => ({
    index: i,
    equity: v,
    dd: state.drawdown[i] || 0,
  }));

  const statusBadge: Record<BacktestStatus, { color: string; icon: React.ReactNode }> = {
    idle: { color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
    running: { color: 'bg-primary/20 text-primary', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    paused: { color: 'bg-warning/20 text-warning', icon: <Pause className="h-3 w-3" /> },
    completed: { color: 'bg-chart-2/20 text-chart-2', icon: <CheckCircle className="h-3 w-3" /> },
    error: { color: 'bg-destructive/20 text-destructive', icon: <XCircle className="h-3 w-3" /> },
    canceled: { color: 'bg-muted text-muted-foreground', icon: <Square className="h-3 w-3" /> },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Live Backtest Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time equity curve, trades, and progress monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn('flex items-center gap-1', statusBadge[state.status].color)}>
            {statusBadge[state.status].icon}
            {state.status.charAt(0).toUpperCase() + state.status.slice(1)}
          </Badge>
          {state.status === 'idle' && (
            <Button onClick={startDemo} size="sm" className="gap-1.5">
              <Play className="h-4 w-4" />
              {isElectron ? 'Start Backtest' : 'Run Demo'}
            </Button>
          )}
          {state.status === 'running' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, status: 'canceled' }))}
            >
              <Square className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          {(state.status === 'completed' || state.status === 'canceled' || state.status === 'error') && (
            <Button variant="outline" size="sm" onClick={startDemo}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Restart
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {state.status !== 'idle' && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="font-mono font-semibold text-lg">{state.progress.toFixed(1)}%</span>
                {state.eaName && (
                  <span className="text-muted-foreground">{state.eaName}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(elapsed)}
                </span>
                {state.currentDate && (
                  <span>Processing: {state.currentDate}</span>
                )}
              </div>
            </div>
            <Progress
              value={state.progress}
              variant={state.status === 'completed' ? 'success' : state.status === 'error' ? 'danger' : 'cyber'}
              className="h-2.5"
            />
          </CardContent>
        </Card>
      )}

      {/* Metrics + Equity + Trades Grid */}
      {state.status !== 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Live Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  label="Equity"
                  value={`$${formatNum(state.currentEquity ?? 10000)}`}
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  color={(state.currentEquity ?? 10000) >= 10000 ? 'text-chart-2' : 'text-destructive'}
                />
                <MetricBox
                  label="Drawdown"
                  value={`${formatNum(state.currentDrawdown ?? 0, 1)}%`}
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  color="text-destructive"
                />
                <MetricBox
                  label="Trades"
                  value={String(state.tradesCount ?? 0)}
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                />
                <MetricBox
                  label="Win Rate"
                  value={state.winRate !== undefined ? `${state.winRate.toFixed(1)}%` : '--'}
                  icon={<Activity className="h-3.5 w-3.5" />}
                  color={(state.winRate ?? 0) >= 50 ? 'text-chart-2' : 'text-destructive'}
                />
                <MetricBox
                  label="Profit Factor"
                  value={state.profitFactor !== undefined ? formatNum(state.profitFactor) : '--'}
                  icon={<Zap className="h-3.5 w-3.5" />}
                />
                <MetricBox
                  label="Worker"
                  value={`#${state.workerId}`}
                  icon={<Cpu className="h-3.5 w-3.5" />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Equity Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              {equityData.length > 1 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="index" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <RTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          return (
                            <div className="rounded-lg border bg-popover p-2 shadow-md text-xs">
                              <p>Equity: ${formatNum(payload[0].value as number)}</p>
                              {payload[1] && <p>DD: {formatNum(payload[1].value as number, 1)}%</p>}
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine y={10000} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="hsl(var(--primary))"
                        fill="url(#eqGradient)"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={0}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground/50 text-sm">
                  Waiting for data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trade List */}
      {trades.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Trade Log ({trades.length})</span>
              <Badge variant="outline" className="text-xs font-mono">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {[...trades].reverse().map((t) => (
                  <div
                    key={t.ticket}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-16">#{t.ticket}</span>
                      <span className="text-muted-foreground w-20">{t.time}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5',
                          t.type === 'BUY'
                            ? 'border-chart-2/50 text-chart-2'
                            : 'border-destructive/50 text-destructive'
                        )}
                      >
                        {t.type}
                      </Badge>
                      <span>{t.symbol}</span>
                      <span className="text-muted-foreground">{t.lots} lots</span>
                    </div>
                    <span className={cn(
                      'font-semibold',
                      t.profit >= 0 ? 'text-chart-2' : 'text-destructive'
                    )}>
                      {t.profit >= 0 ? '+' : ''}{formatNum(t.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Idle Empty State */}
      {state.status === 'idle' && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">No Active Backtest</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {isElectron
                  ? 'Configure your strategy and click "Start Backtest" to begin'
                  : 'Click "Run Demo" to see the live dashboard in action'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============= Small Metric Box =============

function MetricBox({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="space-y-1 p-2 rounded-lg bg-muted/20">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={cn('font-mono text-sm font-semibold', color)}>
        {value}
      </p>
    </div>
  );
}

// ============= Main MT5 Hub Page =============

export default function MT5Hub() {
  const [activeTab, setActiveTab] = useState('converter');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          MT5 Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Strategy converter, config generator, and live backtest monitoring
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="converter" className="gap-1.5">
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">Strategy</span> Converter
          </TabsTrigger>
          <TabsTrigger value="ini-config" className="gap-1.5">
            <FileText className="h-4 w-4" />
            INI <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
          <TabsTrigger value="live-monitor" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Live <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="converter">
          <StrategyConverterPanel />
        </TabsContent>

        <TabsContent value="ini-config">
          <INIConfigPanel />
        </TabsContent>

        <TabsContent value="live-monitor">
          <LiveBacktestDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
