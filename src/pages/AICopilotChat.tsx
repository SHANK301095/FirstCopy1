/**
 * AI Trade Copilot — Context-aware multi-mode intelligence
 * Modes: Ask, Review, Planning, Journal, Risk, Strategy
 * Enhanced with full app knowledge and contextual awareness
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Send, User, Loader2, Sparkles, BookOpen, Target,
  PenLine, Shield, BarChart3, Brain, Lightbulb, RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTradesDB } from '@/hooks/useTradesDB';
import { computeExtendedMetrics } from '@/lib/tradeMetrics';
import { PageTitle } from '@/components/ui/PageTitle';
import { PAGE_LABELS } from '@/lib/navigationConfig';
import { toast } from 'sonner';

// ── Types ──
type CopilotMode = 'ask' | 'review' | 'planning' | 'journal' | 'risk' | 'strategy';
type Msg = { role: 'user' | 'assistant'; content: string; mode?: CopilotMode };

interface MemoryCard {
  id: string;
  label: string;
  value: string;
  type: 'strength' | 'weakness' | 'insight';
}

// ── Mode Config ──
const MODES: { id: CopilotMode; label: string; icon: typeof Bot; desc: string; color: string }[] = [
  { id: 'ask', label: 'Ask', icon: Sparkles, desc: 'General trading questions & app navigation', color: 'bg-primary/10 text-primary border-primary/30' },
  { id: 'review', label: 'Review', icon: BookOpen, desc: 'Analyze recent performance with data', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  { id: 'planning', label: 'Planning', icon: Target, desc: 'Pre-market & session prep', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { id: 'journal', label: 'Journal', icon: PenLine, desc: 'Reflect on trades & patterns', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'risk', label: 'Risk', icon: Shield, desc: 'Risk assessment & position sizing', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { id: 'strategy', label: 'Strategy', icon: BarChart3, desc: 'Setup & strategy optimization', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
];

const MODE_PROMPTS: Record<CopilotMode, string> = {
  ask: `MODE: ASK — Answer general trading questions, help navigate the app, and explain features.
- If user asks "where is X" or "how to do X", give exact click path: Sidebar → Section → Page → Button
- For data questions, reference actual numbers from context
- For app questions, explain the feature and how to use it
- Be concise and actionable`,
  review: `MODE: REVIEW — Analyze the trader's recent performance deeply. Structure response as:
**Performance Snapshot**: Key numbers (win rate, expectancy, P/L)
**Pattern Detected**: Recurring behavior (good or bad)
**Verdict**: What to keep doing vs what to change
**Action Steps**: 1-3 specific, numbered actions
Cross-reference journal entries, emotions, and trade data when available.`,
  planning: `MODE: PLANNING — Help with pre-market planning. Include:
**Session Focus**: Which session to trade based on historical performance
**Setups to Watch**: Based on best-performing patterns from their data
**Risk Budget**: Recommended allocation based on recent drawdown
**Avoid**: Known weak patterns/symbols to skip today
Reference their actual best/worst sessions and setups from data.`,
  journal: `MODE: JOURNAL — Help reflect on trades and build self-awareness.
- Ask targeted questions about emotions during execution
- Check if rules were followed
- Identify lessons to carry forward
- Connect current observations to past patterns
- Suggest specific journal tags based on what they describe
Format as a structured reflection with actionable takeaways.`,
  risk: `MODE: RISK — Assess current risk posture with hard numbers.
**Current Exposure**: Exact risk used today (% of account)
**Safe Remaining**: How much more risk is available
**Position Size Advisory**: Recommended size for next trade
**Warning Signs**: Behavioral red flags (revenge trading, overtrading, tilt)
**Risk State**: SAFE / CAUTION / DANGER with explanation
⚠️ Always include risk disclaimer. Never recommend specific trades.`,
  strategy: `MODE: STRATEGY — Optimize setups and strategy using evidence.
**Top Setups**: Data-backed performers with win rate, expectancy, sample size
**Underperformers**: Setups to pause/remove with reasoning
**Optimization Suggestions**: Specific parameter tweaks backed by data
**Confidence Level**: Low (<20 trades) / Medium (20-50) / High (50+)
Reference their actual strategy tags, setup types, and results.`,
};

const SUGGESTED_PROMPTS: Record<CopilotMode, string[]> = {
  ask: [
    "What's my win rate this week?",
    "Where is the equity curve?",
    "How do I set up a backtest?",
    "How to connect MT5?",
    "Explain my discipline score",
    "How to track prop firm challenge?",
  ],
  review: [
    "Review my last 10 trades",
    "Weekly performance summary",
    "What mistakes am I repeating?",
    "Compare this week vs last week",
    "Am I revenge trading?",
    "Which setup is dragging me down?",
  ],
  planning: [
    "Plan my trading session for today",
    "What setups should I focus on?",
    "Set my risk limits for today",
    "Which session is best for me?",
    "Should I trade today or sit out?",
    "Pre-market checklist for today",
  ],
  journal: [
    "Help me reflect on today's trades",
    "What emotions affected my trading?",
    "Did I follow my rules this week?",
    "Key lessons from my recent trades",
    "Summarize my trading week",
    "What patterns are in my journal?",
  ],
  risk: [
    "Am I overleveraged right now?",
    "Safe position size for next trade?",
    "Check my daily loss limit",
    "Analyze my consecutive losses",
    "If I lose next trade, will I breach?",
    "What's my risk state right now?",
  ],
  strategy: [
    "Which setup has best expectancy?",
    "Should I keep trading breakouts?",
    "Best time of day for my style",
    "Compare my top 3 setups",
    "Which strategy needs more data?",
    "Optimize my risk-reward ratio",
  ],
};

// ── Memory Cards ──
function generateMemoryCards(trades: any[]): MemoryCard[] {
  if (!trades.length) return [];
  const closed = trades.filter(t => t.status === 'closed');
  if (!closed.length) return [];

  const cards: MemoryCard[] = [];
  const wins = closed.filter(t => (t.net_pnl || 0) > 0);
  const winRate = (wins.length / closed.length) * 100;

  // Total P/L
  const totalPnl = closed.reduce((s, t) => s + (t.net_pnl || 0), 0);
  cards.push({
    id: 'total-pnl',
    label: 'Total P/L',
    value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`,
    type: totalPnl >= 0 ? 'strength' : 'weakness'
  });

  // Win rate
  cards.push({
    id: 'win-rate',
    label: 'Win Rate',
    value: `${winRate.toFixed(0)}% (${closed.length} trades)`,
    type: winRate >= 50 ? 'strength' : 'weakness'
  });

  // Best symbol
  const symbolMap: Record<string, number> = {};
  closed.forEach(t => { symbolMap[t.symbol] = (symbolMap[t.symbol] || 0) + (t.net_pnl || 0); });
  const bestSymbol = Object.entries(symbolMap).sort((a, b) => b[1] - a[1])[0];
  if (bestSymbol) {
    cards.push({ id: 'best-symbol', label: 'Best Symbol', value: `${bestSymbol[0]} (+$${bestSymbol[1].toFixed(0)})`, type: 'strength' });
  }

  // Best setup
  const setupMap: Record<string, { wins: number; total: number; pnl: number }> = {};
  closed.forEach(t => {
    const setup = t.setup_type || t.strategy_tag || null;
    if (!setup) return;
    if (!setupMap[setup]) setupMap[setup] = { wins: 0, total: 0, pnl: 0 };
    setupMap[setup].total++;
    setupMap[setup].pnl += t.net_pnl || 0;
    if ((t.net_pnl || 0) > 0) setupMap[setup].wins++;
  });
  const bestSetup = Object.entries(setupMap).sort((a, b) => b[1].pnl - a[1].pnl)[0];
  if (bestSetup && bestSetup[1].total >= 3) {
    const wr = ((bestSetup[1].wins / bestSetup[1].total) * 100).toFixed(0);
    cards.push({ id: 'best-setup', label: 'Best Setup', value: `${bestSetup[0]} (${wr}% WR)`, type: 'strength' });
  }

  // Worst symbol
  const worstSymbol = Object.entries(symbolMap).sort((a, b) => a[1] - b[1])[0];
  if (worstSymbol && worstSymbol[1] < 0) {
    cards.push({ id: 'worst-symbol', label: 'Avoid', value: `${worstSymbol[0]} ($${worstSymbol[1].toFixed(0)})`, type: 'weakness' });
  }

  // Recent streak
  const recentPnls = closed.slice(0, 10).map(t => (t.net_pnl || 0) > 0);
  let streakCount = 1;
  for (let i = 1; i < recentPnls.length; i++) {
    if (recentPnls[i] === recentPnls[0]) streakCount++;
    else break;
  }
  if (streakCount >= 2) {
    cards.push({
      id: 'streak',
      label: recentPnls[0] ? 'Win Streak' : 'Loss Streak',
      value: `${streakCount} in a row ${recentPnls[0] ? '🔥' : '⚠️'}`,
      type: recentPnls[0] ? 'strength' : 'weakness'
    });
  }

  // Avg R-multiple
  const rMultiples = closed.filter(t => t.r_multiple != null).map(t => t.r_multiple!);
  if (rMultiples.length >= 5) {
    const avgR = rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length;
    cards.push({
      id: 'avg-r',
      label: 'Avg R-Multiple',
      value: `${avgR.toFixed(2)}R`,
      type: avgR >= 0.5 ? 'strength' : avgR >= 0 ? 'insight' : 'weakness'
    });
  }

  return cards.slice(0, 6);
}

// ── Main Component ──
export default function AICopilotPage() {
  const { trades, stats } = useTradesDB();
  const location = useLocation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CopilotMode>('ask');
  const scrollRef = useRef<HTMLDivElement>(null);

  const memoryCards = useMemo(() => generateMemoryCards(trades), [trades]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const closed = trades.filter(t => t.status === 'closed');
    const metrics = computeExtendedMetrics(closed);
    
    // Session analysis
    const sessionPerf: Record<string, { wins: number; total: number; pnl: number }> = {};
    closed.forEach(t => {
      const hour = t.entry_time ? new Date(t.entry_time).getUTCHours() : -1;
      let session = 'Unknown';
      if (hour >= 0 && hour < 8) session = 'Asian';
      else if (hour >= 8 && hour < 14) session = 'London';
      else if (hour >= 14 && hour < 21) session = 'New York';
      if (!sessionPerf[session]) sessionPerf[session] = { wins: 0, total: 0, pnl: 0 };
      sessionPerf[session].total++;
      sessionPerf[session].pnl += t.net_pnl || 0;
      if ((t.net_pnl || 0) > 0) sessionPerf[session].wins++;
    });

    // Setup analysis
    const setupPerf: Record<string, { wins: number; total: number; pnl: number; avgR: number }> = {};
    closed.forEach(t => {
      const setup = t.setup_type || t.strategy_tag || 'Untagged';
      if (!setupPerf[setup]) setupPerf[setup] = { wins: 0, total: 0, pnl: 0, avgR: 0 };
      setupPerf[setup].total++;
      setupPerf[setup].pnl += t.net_pnl || 0;
      if ((t.net_pnl || 0) > 0) setupPerf[setup].wins++;
    });

    // Recent losses analysis
    const recentTrades = closed.slice(0, 20);
    const recentLosses = recentTrades.filter(t => (t.net_pnl || 0) < 0);
    const avgLoss = recentLosses.length > 0 ? recentLosses.reduce((s, t) => s + (t.net_pnl || 0), 0) / recentLosses.length : 0;

    // Emotion/tag analysis
    const emotionTags: Record<string, number> = {};
    closed.forEach(t => {
      (t.emotions || []).forEach(em => { emotionTags[em] = (emotionTags[em] || 0) + 1; });
    });

    return {
      totalTrades: trades.length,
      closedTrades: closed.length,
      metrics,
      sessionPerformance: sessionPerf,
      setupPerformance: setupPerf,
      emotionBreakdown: emotionTags,
      recentAvgLoss: avgLoss,
      recentTrades: trades.slice(0, 20).map(t => ({
        symbol: t.symbol, direction: t.direction, pnl: t.net_pnl,
        entry_time: t.entry_time, strategy: t.strategy_tag, setup: t.setup_type,
        emotions: t.emotions, mindset: t.mindset_rating,
        grade: t.trade_grade,
      })),
      symbols: [...new Set(trades.map(t => t.symbol))],
      strategies: [...new Set(trades.map(t => t.strategy_tag).filter(Boolean))],
      setups: [...new Set(trades.map(t => t.setup_type).filter(Boolean))],
      memoryCards: memoryCards.map(c => `${c.label}: ${c.value}`),
    };
  };

  const sendMessage = async (directMsg?: string) => {
    const text = directMsg || input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: 'user', content: text, mode };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = buildContext();
      const modePrompt = MODE_PROMPTS[mode];
      const currentPage = PAGE_LABELS[location.pathname] || location.pathname;

      const { data, error } = await supabase.functions.invoke('ai-copilot-chat', {
        body: {
          messages: [...messages.slice(-10), userMsg].map(m => ({ role: m.role, content: m.content })),
          tradeContext: context,
          modePrompt,
          currentPage,
        },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply || 'No response', mode }]);
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      if (msg.includes('429') || msg.includes('Rate')) {
        toast.error('Rate limited — wait a moment and try again');
      } else if (msg.includes('402')) {
        toast.error('Credits exhausted — add funds in Settings → Workspace');
      } else {
        toast.error('AI error', { description: msg });
      }
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I hit an error. Please try again.', mode }]);
    } finally {
      setLoading(false);
    }
  };

  const currentMode = MODES.find(m => m.id === mode)!;
  const suggestions = SUGGESTED_PROMPTS[mode];

  return (
    <div className="space-y-4 animate-fade-in">
      <PageTitle title="AI Trade Copilot" subtitle="Context-aware intelligence across your trading data" />

      {/* Mode Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {MODES.map(m => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border",
                active ? m.color : "text-muted-foreground border-transparent hover:bg-muted/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Memory Cards */}
      {memoryCards.length > 0 && messages.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {memoryCards.map(card => (
            <div key={card.id} className={cn(
              "p-2.5 rounded-lg border text-center",
              card.type === 'strength' ? 'bg-emerald-500/5 border-emerald-500/20' :
              card.type === 'weakness' ? 'bg-destructive/5 border-destructive/20' :
              'bg-primary/5 border-primary/20'
            )}>
              <div className="text-[10px] text-muted-foreground">{card.label}</div>
              <div className="text-xs font-semibold mt-0.5">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Area */}
      <Card className="h-[calc(100dvh-320px)] md:h-[calc(100vh-300px)] flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className={cn("p-3 rounded-xl mb-3", currentMode.color.split(' ')[0])}>
                  {(() => { const Icon = currentMode.icon; return <Icon className="h-8 w-8" />; })()}
                </div>
                <p className="text-lg font-semibold mb-1">{currentMode.label} Mode</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">{currentMode.desc}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                  {suggestions.map(s => (
                    <Button key={s} variant="outline" size="sm" className="text-xs h-auto py-2 text-left justify-start" onClick={() => sendMessage(s)}>
                      <Lightbulb className="h-3 w-3 mr-1.5 shrink-0 text-primary" />{s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {m.role === 'assistant' && <Bot className="h-5 w-5 text-primary shrink-0 mt-1" />}
                    <div className={cn(
                      'max-w-[85%] p-3 rounded-lg text-sm',
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      {m.role === 'user' && m.mode && (
                        <Badge variant="outline" className="text-[9px] mb-1.5 opacity-70">{m.mode.toUpperCase()}</Badge>
                      )}
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>strong]:text-foreground">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    {m.role === 'user' && <User className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <Bot className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs text-muted-foreground">Thinking in {mode} mode...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={`Ask in ${currentMode.label} mode...`}
                className="flex-1"
                disabled={loading}
              />
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={() => setMessages([])} title="New chat">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
