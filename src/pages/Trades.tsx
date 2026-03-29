/**
 * Trades Page - Full trade management with CSV import, filters, real-time updates
 * Part of MMCai.app Projournx feature set
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Upload, Download, Filter, TrendingUp, TrendingDown,
  BarChart2, Target, Zap, Clock, Eye, Edit3, Trash2, X, Save,
  ArrowUpRight, ArrowDownRight, Calendar, FileText, RefreshCw, Camera,
  BookOpen, Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB, type TradeInsert, type Trade } from '@/hooks/useTradesDB';
import Papa from 'papaparse';
import { TradeScreenshots } from '@/components/trading/TradeScreenshots';
import { GradeBadge } from '@/components/trading/GradeBadge';
import { TagEditor } from '@/components/trading/TagEditor';
import { hapticFeedback } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const EMOTIONS = ['Confident', 'Anxious', 'FOMO', 'Greedy', 'Patient', 'Frustrated', 'Calm', 'Impulsive', 'Disciplined', 'Revenge'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend Following', 'Mean Reversion', 'Scalp', 'Swing', 'Range'];

export default function Trades() {
  const { trades, loading, stats, addTrade, addBulkTrades, updateTrade, deleteTrade } = useTradesDB();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [csvStep, setCsvStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [todayJournalExists, setTodayJournalExists] = useState(false);

  // Collect unique tags for filter
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    trades.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [trades]);

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  // Check if today's journal exists
  useEffect(() => {
    if (!user) return;
    supabase.from('journal_entries').select('id').eq('user_id', user.id).eq('date', todayKey).maybeSingle()
      .then(({ data }) => setTodayJournalExists(!!data));
  }, [user, todayKey]);

  const [form, setForm] = useState<Partial<TradeInsert>>({
    symbol: '', direction: 'long', entry_price: 0, exit_price: 0, quantity: 1,
    entry_time: new Date().toISOString().slice(0, 16), exit_time: new Date().toISOString().slice(0, 16),
    strategy_tag: '', timeframe: '15m', setup_type: '', notes: '', emotions: [], tags: [],
    mindset_rating: 3, quality_score: 3, fees: 0, status: 'closed',
  });

  const filtered = useMemo(() => {
    return trades.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.symbol.toLowerCase().includes(q) || (t.strategy_tag || '').toLowerCase().includes(q);
      const matchDir = dirFilter === 'all' || t.direction === dirFilter;
      const matchOutcome = outcomeFilter === 'all' ||
        (outcomeFilter === 'win' && t.net_pnl > 0) ||
        (outcomeFilter === 'loss' && t.net_pnl < 0);
      const matchGrade = gradeFilter === 'all' || (t.trade_grade || '').toUpperCase().startsWith(gradeFilter);
      const matchTag = tagFilter === 'all' || (t.tags || []).includes(tagFilter);
      return matchSearch && matchDir && matchOutcome && matchGrade && matchTag;
    });
  }, [trades, search, dirFilter, outcomeFilter, gradeFilter, tagFilter]);

  const handleAddTrade = async () => {
    if (!form.symbol || !form.entry_price) { toast.error('Symbol and entry price required'); hapticFeedback('error'); return; }
    const pnl = form.direction === 'long'
      ? ((form.exit_price || 0) - form.entry_price) * (form.quantity || 1)
      : (form.entry_price - (form.exit_price || 0)) * (form.quantity || 1);
    const fees = form.fees || 0;
    const netPnl = pnl - fees;

    await addTrade({
      ...form,
      symbol: form.symbol!.toUpperCase(),
      direction: form.direction as 'long' | 'short',
      entry_price: form.entry_price!,
      entry_time: form.entry_time || new Date().toISOString(),
      pnl,
      net_pnl: netPnl,
      fees,
      status: form.exit_price ? 'closed' : 'open',
      import_source: 'manual',
    } as TradeInsert);
    hapticFeedback('success');
    setShowAdd(false);
  };

  // CSV Import
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) { toast.error('No data found'); return; }
        setCsvData(result.data as Record<string, string>[]);
        const headers = Object.keys(result.data[0] as Record<string, string>);
        const autoMap: Record<string, string> = {};
        const fields = ['symbol', 'direction', 'entry_price', 'exit_price', 'quantity', 'entry_time', 'exit_time', 'pnl', 'fees', 'strategy_tag', 'notes'];
        fields.forEach(f => {
          const match = headers.find(h => h.toLowerCase().replace(/[_\s-]/g, '').includes(f.replace(/_/g, '')));
          if (match) autoMap[f] = match;
        });
        setCsvMapping(autoMap);
        setCsvStep('map');
      },
      error: () => toast.error('Failed to parse CSV'),
    });
  };

  const handleCSVImport = async () => {
    const mapped: TradeInsert[] = csvData.map(row => {
      const pnl = parseFloat(row[csvMapping.pnl] || '0');
      const fees = parseFloat(row[csvMapping.fees] || '0');
      return {
        symbol: (row[csvMapping.symbol] || 'UNKNOWN').toUpperCase(),
        direction: (row[csvMapping.direction] || 'long').toLowerCase().includes('short') ? 'short' as const : 'long' as const,
        entry_price: parseFloat(row[csvMapping.entry_price] || '0'),
        exit_price: parseFloat(row[csvMapping.exit_price] || '0') || null,
        quantity: parseFloat(row[csvMapping.quantity] || '1'),
        entry_time: row[csvMapping.entry_time] || new Date().toISOString(),
        exit_time: row[csvMapping.exit_time] || null,
        pnl,
        fees,
        net_pnl: pnl - fees,
        strategy_tag: row[csvMapping.strategy_tag] || null,
        notes: row[csvMapping.notes] || null,
        status: 'closed' as const,
        import_source: 'csv' as const,
      };
    }).filter(t => t.entry_price > 0);

    if (mapped.length === 0) { toast.error('No valid trades'); return; }
    const ok = await addBulkTrades(mapped);
    if (ok) { setShowCSV(false); setCsvStep('upload'); setCsvData([]); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Trade Tracker" subtitle="Log, import, and analyze every trade" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/journal?date=${todayKey}`)} className="relative">
            <BookOpen className="h-4 w-4 mr-1.5" /> Journal Today
            {todayJournalExists && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-profit border-2 border-background" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCSV(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Log Trade
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          {[
            { label: 'Total Trades', value: stats.totalTrades, icon: BarChart2 },
            { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: stats.winRate >= 50 ? 'text-profit' : 'text-loss' },
            { label: 'Net P&L', value: `₹${stats.totalPnL.toFixed(0)}`, icon: TrendingUp, color: stats.totalPnL >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), icon: Zap },
            { label: 'Expectancy', value: `₹${stats.expectancy.toFixed(0)}`, icon: ArrowUpRight, color: stats.expectancy >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Max DD', value: `₹${stats.maxDrawdown.toFixed(0)}`, icon: ArrowDownRight, color: 'text-loss' },
          ].map(kpi => (
            <Card key={kpi.label} className="p-3">
              <div className="flex items-center gap-2">
                <kpi.icon className={cn("h-4 w-4 text-muted-foreground", kpi.color)} />
                <div>
                  <p className={cn("text-lg font-bold font-mono", kpi.color)}>{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search symbol, strategy..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={dirFilter} onValueChange={setDirFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dirs</SelectItem>
            <SelectItem value="long">Long</SelectItem>
            <SelectItem value="short">Short</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="win">Winners</SelectItem>
            <SelectItem value="loss">Losers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="D">D</SelectItem>
            <SelectItem value="F">F</SelectItem>
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <Tag className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Badge variant="secondary" className="text-xs">{filtered.length} trades</Badge>
      </div>

      {/* Trades Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Dir</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Exit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">Loading trades...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="py-12">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-5 rounded-full bg-muted/50 mb-4">
                      <TrendingUp className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No trades yet</h3>
                    <p className="text-muted-foreground max-w-md mb-6">Import from MT5, upload a CSV, or add manually</p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => navigate('/mt5-sync')}>Connect MT5</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowCSV(true)}>Upload CSV</Button>
                      <Button size="sm" onClick={() => setShowAdd(true)}>Add Trade</Button>
                    </div>
                  </div>
                </TableCell></TableRow>
              ) : filtered.slice(0, 100).map(t => (
                <TableRow key={t.id} className="group cursor-pointer" onClick={() => setDetailTrade(t)}>
                  <TableCell className="text-xs font-mono">{format(new Date(t.entry_time), 'dd MMM yy')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{t.symbol}</span>
                      {(t.import_source === 'mt5' || t.import_source === 'mt5_auto') && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-chart-2/50 text-chart-2 bg-chart-2/10">
                          MT5 AUTO
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.direction === 'long' ? 'default' : 'destructive'} className="text-[10px]">
                      {t.direction.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.entry_price}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.exit_price || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.quantity}</TableCell>
                  <TableCell className={cn("text-right font-mono font-medium", t.net_pnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {t.net_pnl >= 0 ? '+' : ''}₹{t.net_pnl.toFixed(0)}
                  </TableCell>
                  <TableCell>
                    {t.trade_grade ? <GradeBadge grade={t.trade_grade} details={t.grade_details} /> : <span className="text-[10px] text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.strategy_tag || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                      {(t.tags || []).slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">{tag}</Badge>
                      ))}
                      {(t.tags || []).length > 2 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">+{(t.tags || []).length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.quality_score && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={cn("h-1.5 w-1.5 rounded-full", i <= t.quality_score! ? 'bg-primary' : 'bg-muted')} />
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteTrade(t.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </ScrollArea>
      </Card>

      {/* Add Trade Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log New Trade</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 grid-cols-3">
              <div className="space-y-1"><Label className="text-xs">Symbol</Label>
                <Input value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} placeholder="EURUSD, NIFTY..." />
              </div>
              <div className="space-y-1"><Label className="text-xs">Direction</Label>
                <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="long">Long</SelectItem><SelectItem value="short">Short</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Setup</Label>
                <Select value={form.setup_type || ''} onValueChange={v => setForm(p => ({ ...p, setup_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{SETUPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <div className="space-y-1"><Label className="text-xs">Entry Price</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={form.entry_price || ''} onChange={e => setForm(p => ({ ...p, entry_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Exit Price</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={form.exit_price || ''} onChange={e => setForm(p => ({ ...p, exit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Quantity</Label>
                <Input type="number" inputMode="numeric" value={form.quantity || 1} onChange={e => setForm(p => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Fees</Label>
                <Input type="number" inputMode="decimal" value={form.fees || 0} onChange={e => setForm(p => ({ ...p, fees: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">Entry Time</Label>
                <Input type="datetime-local" value={form.entry_time?.slice(0, 16)} onChange={e => setForm(p => ({ ...p, entry_time: e.target.value }))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Exit Time</Label>
                <Input type="datetime-local" value={form.exit_time?.slice(0, 16) || ''} onChange={e => setForm(p => ({ ...p, exit_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Emotions</Label>
              <div className="flex flex-wrap gap-1.5">{EMOTIONS.map(em => (
                <Badge key={em} variant={(form.emotions || []).includes(em) ? 'default' : 'outline'} className="cursor-pointer text-[10px]"
                  onClick={() => setForm(p => ({ ...p, emotions: (p.emotions || []).includes(em) ? (p.emotions || []).filter(e => e !== em) : [...(p.emotions || []), em] }))}>
                  {em}
                </Badge>
              ))}</div>
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">Mindset (1-5)</Label>
                <div className="flex gap-1">{[1,2,3,4,5].map(r => (
                  <Button key={r} size="sm" variant={form.mindset_rating === r ? 'default' : 'outline'} className="h-7 w-7 p-0"
                    onClick={() => setForm(p => ({ ...p, mindset_rating: r }))}>{r}</Button>
                ))}</div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Quality (1-5)</Label>
                <div className="flex gap-1">{[1,2,3,4,5].map(r => (
                  <Button key={r} size="sm" variant={form.quality_score === r ? 'default' : 'outline'} className="h-7 w-7 p-0"
                    onClick={() => setForm(p => ({ ...p, quality_score: r }))}>{r}</Button>
                ))}</div>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Trade analysis, lessons..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddTrade}><Save className="h-4 w-4 mr-1.5" />Log Trade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showCSV} onOpenChange={v => { setShowCSV(v); if (!v) { setCsvStep('upload'); setCsvData([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import Trades from CSV</DialogTitle></DialogHeader>
          {csvStep === 'upload' && (
            <div className="py-8 text-center space-y-4">
              <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto"><Upload className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-sm text-muted-foreground">Upload a CSV with your trade history</p>
              <Input type="file" accept=".csv" onChange={handleCSVFile} className="max-w-xs mx-auto" />
              <p className="text-[10px] text-muted-foreground">Expected: Symbol, Direction, Entry Price, Exit Price, Quantity, Entry Time</p>
            </div>
          )}
          {csvStep === 'map' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Map your CSV columns to trade fields. {csvData.length} rows detected.</p>
              <div className="grid gap-3 grid-cols-2">
                {['symbol', 'direction', 'entry_price', 'exit_price', 'quantity', 'entry_time', 'exit_time', 'pnl', 'fees', 'strategy_tag'].map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field.replace(/_/g, ' ')}</Label>
                    <Select value={csvMapping[field] || ''} onValueChange={v => setCsvMapping(p => ({ ...p, [field]: v }))}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select column..." /></SelectTrigger>
                      <SelectContent>{Object.keys(csvData[0] || {}).map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCsvStep('upload')}>Back</Button>
                <Button onClick={() => setCsvStep('preview')} disabled={!csvMapping.symbol || !csvMapping.entry_price}>Preview</Button>
              </DialogFooter>
            </div>
          )}
          {csvStep === 'preview' && (
            <div className="space-y-4 py-2">
              <p className="text-sm">Preview: {csvData.length} trades to import</p>
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="overflow-x-auto w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead><TableHead>Dir</TableHead><TableHead>Entry</TableHead><TableHead>Exit</TableHead><TableHead>P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 20).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{row[csvMapping.symbol]}</TableCell>
                        <TableCell className="text-xs">{row[csvMapping.direction] || 'long'}</TableCell>
                        <TableCell className="text-xs font-mono">{row[csvMapping.entry_price]}</TableCell>
                        <TableCell className="text-xs font-mono">{row[csvMapping.exit_price]}</TableCell>
                        <TableCell className="text-xs font-mono">{row[csvMapping.pnl] || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCsvStep('map')}>Back</Button>
                <Button onClick={handleCSVImport}><Download className="h-4 w-4 mr-1.5" />Import {csvData.length} Trades</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trade Detail Dialog with Screenshots */}
      <Dialog open={!!detailTrade} onOpenChange={() => setDetailTrade(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailTrade && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailTrade.symbol}
                  <Badge variant={detailTrade.direction === 'long' ? 'default' : 'destructive'} className="text-[10px]">
                    {detailTrade.direction.toUpperCase()}
                  </Badge>
                  {detailTrade.trade_grade && (
                    <GradeBadge grade={detailTrade.trade_grade} details={detailTrade.grade_details} size="default" />
                  )}
                  <span className={cn("font-mono text-sm", detailTrade.net_pnl >= 0 ? 'text-profit' : 'text-loss')}>
                    {detailTrade.net_pnl >= 0 ? '+' : ''}₹{detailTrade.net_pnl.toFixed(0)}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">Entry</span><p className="font-mono">{detailTrade.entry_price}</p></div>
                  <div><span className="text-xs text-muted-foreground">Exit</span><p className="font-mono">{detailTrade.exit_price || '—'}</p></div>
                  <div><span className="text-xs text-muted-foreground">Qty</span><p className="font-mono">{detailTrade.quantity}</p></div>
                  <div><span className="text-xs text-muted-foreground">R-Multiple</span><p className="font-mono">{detailTrade.r_multiple?.toFixed(2) || '—'}</p></div>
                  <div><span className="text-xs text-muted-foreground">Strategy</span><p>{detailTrade.strategy_tag || '—'}</p></div>
                  <div><span className="text-xs text-muted-foreground">Setup</span><p>{detailTrade.setup_type || '—'}</p></div>
                </div>
                
                {/* Tags - manual editor */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Tags</span>
                  <TagEditor
                    tags={detailTrade.tags || []}
                    onChange={async (newTags) => {
                      await updateTrade(detailTrade.id, { tags: newTags } as any);
                      setDetailTrade({ ...detailTrade, tags: newTags });
                    }}
                  />
                </div>

                {detailTrade.notes && (
                  <div>
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <p className="text-sm whitespace-pre-wrap">{detailTrade.notes}</p>
                  </div>
                )}
                {detailTrade.emotions && detailTrade.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {detailTrade.emotions.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}
                  </div>
                )}
                <TradeScreenshots tradeId={detailTrade.id} />
              </div>
              <Separator className="my-2" />
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => {
                  const tradeDate = detailTrade.entry_time.slice(0, 10);
                  setDetailTrade(null);
                  navigate(`/journal?date=${tradeDate}`);
                }}>
                  <BookOpen className="h-4 w-4 mr-1" /> 📓 View Journal for {format(new Date(detailTrade.entry_time), 'MMM d')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => { deleteTrade(detailTrade.id); setDetailTrade(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
