/**
 * Trade Journal — Frictionless entry system with fast mode, emotion/setup tagging,
 * rule-followed toggle, AI suggestions, and rich filtering
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Calendar, TrendingUp, TrendingDown,
  Trash2, Save, X, Image, BarChart2, Zap,
  Target, Clock, Lightbulb, LayoutList, CalendarDays, Flame, Percent,
  CheckCircle2, XCircle, Tag, Filter, ChevronDown, Brain,
  ArrowRight, Camera,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PageTitle } from '@/components/ui/PageTitle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useTradesDB, type Trade } from '@/hooks/useTradesDB';
import { JournalCalendarHeatmap } from '@/components/journal/JournalCalendarHeatmap';

interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  pre_market_plan: string | null;
  post_market_review: string | null;
  summary: string | null;
  overall_mood: string | null;
  confidence: number | null;
  focus_level: number | null;
  goals: string | null;
  lessons: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

const MOOD_OPTIONS = ['Confident', 'Anxious', 'FOMO', 'Greedy', 'Patient', 'Frustrated', 'Calm', 'Impulsive', 'Disciplined'];
const EMOTION_TAGS = ['😤 Frustrated', '😰 Anxious', '🤑 Greedy', '😌 Calm', '🔥 Focused', '😶 Numb', '💪 Disciplined', '😡 Revenge'];
const SETUP_TAGS = ['Breakout', 'Pullback', 'Reversal', 'Range', 'Momentum', 'Gap Fill', 'News Play', 'Scalp', 'Swing'];
const MISTAKE_TAGS = ['Overtrading', 'No Stop Loss', 'FOMO Entry', 'Moved SL', 'Too Large Size', 'Against Trend', 'No Plan', 'Revenge Trade'];

type FilterMode = 'all' | 'wins' | 'losses' | 'emotion' | 'setup' | 'mistake';

export default function TradeJournal() {
  const { user } = useAuth();
  const { trades: allTrades } = useTradesDB();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [entryMode, setEntryMode] = useState<'fast' | 'full'>('fast');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchParams, setSearchParams] = useSearchParams();

  // Get trades for the selected entry's date
  const sameDayTrades = useMemo(() => {
    if (!selectedEntry) return [];
    return allTrades.filter(t => t.entry_time.slice(0, 10) === selectedEntry.date);
  }, [selectedEntry, allTrades]);

  const sameDaySummary = useMemo(() => {
    if (sameDayTrades.length === 0) return null;
    const netPnl = sameDayTrades.reduce((s, t) => s + t.net_pnl, 0);
    const wins = sameDayTrades.filter(t => t.net_pnl > 0).length;
    return { count: sameDayTrades.length, netPnl, winRate: sameDayTrades.length > 0 ? (wins / sameDayTrades.length) * 100 : 0 };
  }, [sameDayTrades]);

  // Streaks
  const journalStreak = useMemo(() => {
    const dates = new Set(entries.map(e => e.date));
    let streak = 0, d = new Date();
    while (dates.has(format(d, 'yyyy-MM-dd'))) { streak++; d = new Date(d.getTime() - 86400000); }
    return streak;
  }, [entries]);

  const bestStreak = useMemo(() => {
    if (entries.length === 0) return 0;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    let best = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      if (diff === 86400000) { current++; best = Math.max(best, current); }
      else { current = 1; }
    }
    return Math.max(best, current);
  }, [entries]);

  const consistency = useMemo(() => {
    const tradeDays = new Set(allTrades.filter(t => t.status === 'closed').map(t => t.entry_time.slice(0, 10)));
    if (tradeDays.size === 0) return null;
    const journalDays = new Set(entries.map(e => e.date));
    let both = 0;
    tradeDays.forEach(d => { if (journalDays.has(d)) both++; });
    return Math.round((both / tradeDays.size) * 100);
  }, [allTrades, entries]);

  // Calendar day click
  const handleDayClick = useCallback((date: string) => {
    const existing = entries.find(e => e.date === date);
    if (existing) setSelectedEntry(existing);
    else { setFormData(prev => ({ ...prev, date })); setIsCreateOpen(true); }
  }, [entries]);

  // Deep link from ?date=
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && entries.length > 0) {
      const existing = entries.find(e => e.date === dateParam);
      if (existing) setSelectedEntry(existing);
      else { setFormData(prev => ({ ...prev, date: dateParam })); setIsCreateOpen(true); }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, entries]);

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    pre_market_plan: '',
    post_market_review: '',
    summary: '',
    overall_mood: '',
    confidence: 3,
    focus_level: 3,
    goals: '',
    lessons: '',
    tags: '',
    // Extended
    emotion_tags: [] as string[],
    setup_tags: [] as string[],
    mistake_tags: [] as string[],
    rules_followed: true,
    review_later: false,
  });

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('date', { ascending: false });
      if (error) throw error;
      setEntries((data || []) as unknown as JournalEntry[]);
    } catch (err: any) {
      toast.error('Failed to load journal', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const createEntry = async () => {
    if (!user) return;
    try {
      // Merge all tags
      const allTags = [
        ...(formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        ...formData.emotion_tags,
        ...formData.setup_tags,
        ...formData.mistake_tags,
        ...(formData.rules_followed ? ['✅ Rules Followed'] : ['❌ Rules Broken']),
        ...(formData.review_later ? ['📋 Review Later'] : []),
      ];

      const { error } = await supabase.from('journal_entries').insert({
        user_id: user.id,
        date: formData.date,
        pre_market_plan: formData.pre_market_plan || null,
        post_market_review: formData.post_market_review || null,
        summary: formData.summary || null,
        overall_mood: formData.overall_mood || null,
        confidence: formData.confidence,
        focus_level: formData.focus_level,
        goals: formData.goals || null,
        lessons: formData.lessons || null,
        tags: allTags.length > 0 ? allTags : null,
      } as any);
      if (error) throw error;
      toast.success('Journal entry saved 🎯');
      setIsCreateOpen(false);
      resetForm();
      fetchEntries();
    } catch (err: any) {
      toast.error('Failed to save entry', { description: err.message });
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
      toast.success('Entry deleted');
      setSelectedEntry(null);
      fetchEntries();
    } catch (err: any) {
      toast.error('Failed to delete', { description: err.message });
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      pre_market_plan: '', post_market_review: '', summary: '',
      overall_mood: '', confidence: 3, focus_level: 3,
      goals: '', lessons: '', tags: '',
      emotion_tags: [], setup_tags: [], mistake_tags: [],
      rules_followed: true, review_later: false,
    });
  };

  // Filtering
  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.date.includes(q) || (e.summary || '').toLowerCase().includes(q) ||
        (e.pre_market_plan || '').toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterMode === 'emotion') {
      filtered = filtered.filter(e => (e.tags || []).some(t => EMOTION_TAGS.some(et => t.includes(et.slice(2)))));
    } else if (filterMode === 'setup') {
      filtered = filtered.filter(e => (e.tags || []).some(t => SETUP_TAGS.includes(t)));
    } else if (filterMode === 'mistake') {
      filtered = filtered.filter(e => (e.tags || []).some(t => MISTAKE_TAGS.includes(t) || t.includes('Rules Broken')));
    } else if (filterMode === 'wins' || filterMode === 'losses') {
      const tradeDayPnl: Record<string, number> = {};
      allTrades.filter(t => t.status === 'closed').forEach(t => {
        const d = t.entry_time.slice(0, 10);
        tradeDayPnl[d] = (tradeDayPnl[d] || 0) + t.net_pnl;
      });
      filtered = filtered.filter(e => filterMode === 'wins' ? (tradeDayPnl[e.date] || 0) > 0 : (tradeDayPnl[e.date] || 0) < 0);
    }
    return filtered;
  }, [entries, searchQuery, filterMode, allTrades]);

  // Tag toggle helper
  const toggleTag = (list: string[], tag: string, key: 'emotion_tags' | 'setup_tags' | 'mistake_tags') => {
    setFormData(p => ({
      ...p,
      [key]: list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Trade Journal" subtitle="Reflect · Tag · Improve" />
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm"><Zap className="h-4 w-4" /> Quick Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>New Journal Entry</span>
                  <div className="flex items-center gap-2">
                    <Button variant={entryMode === 'fast' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px]" onClick={() => setEntryMode('fast')}>
                      <Zap className="h-3 w-3 mr-1" /> Fast
                    </Button>
                    <Button variant={entryMode === 'full' ? 'default' : 'outline'} size="sm" className="h-7 text-[11px]" onClick={() => setEntryMode('full')}>
                      Full
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Date + Mood — always visible */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mood</Label>
                    <Select value={formData.overall_mood} onValueChange={v => setFormData(p => ({ ...p, overall_mood: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="How do you feel?" /></SelectTrigger>
                      <SelectContent>
                        {MOOD_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Summary — always visible */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Quick Summary</Label>
                  <Textarea value={formData.summary} onChange={e => setFormData(p => ({ ...p, summary: e.target.value }))} placeholder="TL;DR — what happened today?" rows={2} />
                </div>

                {/* Emotion Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Emotions</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOTION_TAGS.map(tag => (
                      <button key={tag} onClick={() => toggleTag(formData.emotion_tags, tag, 'emotion_tags')}
                        className={cn("px-2.5 py-1 rounded-full text-[11px] border transition-all",
                          formData.emotion_tags.includes(tag)
                            ? "bg-primary/15 border-primary/30 text-primary font-medium"
                            : "bg-muted/10 border-border/20 text-muted-foreground hover:border-border/40"
                        )}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidence + Focus */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Confidence</Label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} onClick={() => setFormData(p => ({ ...p, confidence: v }))}
                          className={cn("w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            formData.confidence === v
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                          )}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Focus</Label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} onClick={() => setFormData(p => ({ ...p, focus_level: v }))}
                          className={cn("w-8 h-8 rounded-lg text-sm font-bold transition-all",
                            formData.focus_level === v
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                          )}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Setup Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Setups Used</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SETUP_TAGS.map(tag => (
                      <button key={tag} onClick={() => toggleTag(formData.setup_tags, tag, 'setup_tags')}
                        className={cn("px-2.5 py-1 rounded-full text-[11px] border transition-all",
                          formData.setup_tags.includes(tag)
                            ? "bg-[hsl(var(--profit)/0.15)] border-[hsl(var(--profit)/0.3)] text-[hsl(var(--profit))] font-medium"
                            : "bg-muted/10 border-border/20 text-muted-foreground hover:border-border/40"
                        )}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mistake Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Mistakes (if any)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MISTAKE_TAGS.map(tag => (
                      <button key={tag} onClick={() => toggleTag(formData.mistake_tags, tag, 'mistake_tags')}
                        className={cn("px-2.5 py-1 rounded-full text-[11px] border transition-all",
                          formData.mistake_tags.includes(tag)
                            ? "bg-[hsl(var(--loss)/0.15)] border-[hsl(var(--loss)/0.3)] text-[hsl(var(--loss))] font-medium"
                            : "bg-muted/10 border-border/20 text-muted-foreground hover:border-border/40"
                        )}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rules Followed + Review Later */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/15">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.rules_followed} onCheckedChange={v => setFormData(p => ({ ...p, rules_followed: v }))} />
                      <Label className="text-xs cursor-pointer">Rules Followed</Label>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.review_later} onCheckedChange={v => setFormData(p => ({ ...p, review_later: v }))} />
                      <Label className="text-xs cursor-pointer">Review Later</Label>
                    </div>
                  </div>
                </div>

                {/* Full mode fields */}
                {entryMode === 'full' && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pre-Market Plan</Label>
                      <Textarea value={formData.pre_market_plan} onChange={e => setFormData(p => ({ ...p, pre_market_plan: e.target.value }))} placeholder="Key levels, setups to watch, bias..." rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Post-Market Review</Label>
                      <Textarea value={formData.post_market_review} onChange={e => setFormData(p => ({ ...p, post_market_review: e.target.value }))} placeholder="What worked, what didn't?" rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Lessons Learned</Label>
                      <Textarea value={formData.lessons} onChange={e => setFormData(p => ({ ...p, lessons: e.target.value }))} placeholder="Key takeaways..." rows={2} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Goals for Tomorrow</Label>
                      <Textarea value={formData.goals} onChange={e => setFormData(p => ({ ...p, goals: e.target.value }))} placeholder="What will you focus on?" rows={2} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Custom Tags (comma separated)</Label>
                      <Input value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="discipline, gap-day, earnings..." />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={createEntry}><Save className="h-4 w-4 mr-1.5" /> Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <div>
              <p className="text-lg font-bold font-mono">{entries.length}</p>
              <p className="text-[10px] text-muted-foreground">Entries</p>
            </div>
          </div>
        </div>
        <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[hsl(var(--warning))]" />
            <div>
              <p className="text-lg font-bold font-mono">
                {journalStreak > 0 ? `${journalStreak}d` : '—'}{journalStreak >= 7 ? ' 🔥' : ''}
              </p>
              <p className="text-[10px] text-muted-foreground">Streak{bestStreak > 0 ? ` · Best: ${bestStreak}d` : ''}</p>
            </div>
          </div>
        </div>
        <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <div>
              <p className="text-lg font-bold font-mono">{consistency !== null ? `${consistency}%` : '—'}</p>
              <p className="text-[10px] text-muted-foreground">Consistency</p>
            </div>
          </div>
        </div>
        <div className="card-glow rounded-xl border border-border/20 bg-card/60 p-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[hsl(var(--premium))]" />
            <div>
              <p className="text-lg font-bold font-mono">
                {entries.filter(e => (e.tags || []).some(t => t.includes('Review Later'))).length}
              </p>
              <p className="text-[10px] text-muted-foreground">To Review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Heatmap */}
      <JournalCalendarHeatmap trades={allTrades} journalEntries={entries as any} onDayClick={handleDayClick} />

      {/* Search + Filters + View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search journal..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-1">
            {(['all', 'wins', 'losses', 'emotion', 'setup', 'mistake'] as FilterMode[]).map(f => (
              <Button key={f} variant={filterMode === f ? 'default' : 'ghost'} size="sm"
                className={cn("h-7 text-[10px] px-2 capitalize", filterMode === f ? '' : 'text-muted-foreground')}
                onClick={() => setFilterMode(f)}>
                {f}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} size="sm" className="gap-1 text-xs h-7" onClick={() => setViewMode('calendar')}>
            <CalendarDays className="h-3 w-3" /> Calendar
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" className="gap-1 text-xs h-7" onClick={() => setViewMode('list')}>
            <LayoutList className="h-3 w-3" /> List
          </Button>
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-sm font-medium text-foreground/70">
              {filterMode !== 'all' ? `No entries matching "${filterMode}" filter` : 'No journal entries yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {filterMode !== 'all' ? 'Try a different filter or write a new entry' : 'Start journaling to track your trading psychology and patterns'}
            </p>
            <Button className="mt-4 gap-2" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Zap className="h-4 w-4" /> Write First Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredEntries.map(entry => {
            // Get day PnL
            const dayTrades = allTrades.filter(t => t.entry_time.slice(0, 10) === entry.date && t.status === 'closed');
            const dayPnl = dayTrades.reduce((s, t) => s + t.net_pnl, 0);
            const hasRulesBroken = (entry.tags || []).some(t => t.includes('Rules Broken'));
            const hasReviewLater = (entry.tags || []).some(t => t.includes('Review Later'));

            return (
              <div key={entry.id}
                className="card-glow rounded-xl border border-border/20 bg-card/60 p-4 cursor-pointer hover:border-primary/20 transition-all"
                onClick={() => setSelectedEntry(entry)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                    {dayTrades.length > 0 && (
                      <span className={cn("text-[10px] font-mono font-medium",
                        dayPnl >= 0 ? "text-[hsl(var(--profit))]" : "text-[hsl(var(--loss))]"
                      )}>
                        {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasReviewLater && <Badge variant="outline" className="text-[8px] bg-[hsl(var(--warning)/0.05)] border-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]">📋 Review</Badge>}
                    {entry.overall_mood && <Badge variant="secondary" className="text-[10px]">{entry.overall_mood}</Badge>}
                  </div>
                </div>

                {entry.summary && <p className="text-[12px] text-muted-foreground/70 line-clamp-2 mb-2">{entry.summary}</p>}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  {entry.confidence && <span>Conf: {entry.confidence}/5</span>}
                  {entry.focus_level && <span>Focus: {entry.focus_level}/5</span>}
                  {hasRulesBroken && <span className="text-[hsl(var(--loss))]">❌ Rules Broken</span>}
                  {!hasRulesBroken && (entry.tags || []).some(t => t.includes('Rules Followed')) && <span className="text-[hsl(var(--profit))]">✅ Rules OK</span>}
                </div>

                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.filter(t => !t.includes('Rules') && !t.includes('Review Later')).slice(0, 4).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">{tag}</Badge>
                    ))}
                    {entry.tags.filter(t => !t.includes('Rules') && !t.includes('Review Later')).length > 4 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{entry.tags.filter(t => !t.includes('Rules') && !t.includes('Review Later')).length - 4}</Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(new Date(selectedEntry.date), 'MMMM d, yyyy')}
                  {selectedEntry.overall_mood && <Badge variant="secondary">{selectedEntry.overall_mood}</Badge>}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {selectedEntry.summary && (
                  <div className="p-3 rounded-lg bg-muted/10 border border-border/10">
                    <p className="text-sm text-foreground/80">{selectedEntry.summary}</p>
                  </div>
                )}

                {selectedEntry.pre_market_plan && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-primary" /> Pre-Market Plan</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEntry.pre_market_plan}</p>
                  </div>
                )}
                {selectedEntry.post_market_review && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5"><BarChart2 className="h-3 w-3 text-primary" /> Post-Market Review</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEntry.post_market_review}</p>
                  </div>
                )}

                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</p><p className="font-mono font-bold text-lg">{selectedEntry.confidence || '—'}/5</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Focus</p><p className="font-mono font-bold text-lg">{selectedEntry.focus_level || '—'}/5</p></div>
                </div>

                {selectedEntry.goals && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5"><Target className="h-3 w-3 text-[hsl(var(--profit))]" /> Goals</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEntry.goals}</p>
                  </div>
                )}
                {selectedEntry.lessons && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5"><Lightbulb className="h-3 w-3 text-[hsl(var(--warning))]" /> Lessons</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedEntry.lessons}</p>
                  </div>
                )}

                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntry.tags.map(tag => (
                      <Badge key={tag} variant="outline" className={cn("text-[10px]",
                        tag.includes('Rules Broken') && "border-[hsl(var(--loss)/0.3)] text-[hsl(var(--loss))] bg-[hsl(var(--loss)/0.05)]",
                        tag.includes('Rules Followed') && "border-[hsl(var(--profit)/0.3)] text-[hsl(var(--profit))] bg-[hsl(var(--profit)/0.05)]",
                        tag.includes('Review Later') && "border-[hsl(var(--warning)/0.3)] text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.05)]",
                      )}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Same-Day Trades */}
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  Trades — {format(new Date(selectedEntry.date), 'MMM d')}
                </p>
                {sameDaySummary && (
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {sameDaySummary.count} trades · Net:{' '}
                    <span className={cn('font-mono font-medium', sameDaySummary.netPnl >= 0 ? 'text-[hsl(var(--profit))]' : 'text-[hsl(var(--loss))]')}>
                      {sameDaySummary.netPnl >= 0 ? '+' : ''}${sameDaySummary.netPnl.toFixed(0)}
                    </span>
                    {' '}· WR: {sameDaySummary.winRate.toFixed(0)}%
                  </p>
                )}
                {sameDayTrades.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 py-3">No trades on this day</p>
                ) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {sameDayTrades.map(trade => (
                      <div key={trade.id} className="flex items-center justify-between p-2 rounded-lg border border-border/10 bg-muted/10 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={trade.direction === 'long' ? 'default' : 'destructive'} className="text-[9px] px-1.5">{trade.direction.toUpperCase()}</Badge>
                          <span className="font-medium text-xs">{trade.symbol}</span>
                          {trade.setup_type && <Badge variant="outline" className="text-[8px]">{trade.setup_type}</Badge>}
                        </div>
                        <span className={cn('font-mono font-medium text-xs', trade.net_pnl >= 0 ? 'text-[hsl(var(--profit))]' : 'text-[hsl(var(--loss))]')}>
                          {trade.net_pnl >= 0 ? '+' : ''}${trade.net_pnl.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/analytics?date=${selectedEntry.date}`}>View Analytics <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteEntry(selectedEntry.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
