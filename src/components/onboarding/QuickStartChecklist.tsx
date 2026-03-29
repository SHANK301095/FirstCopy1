/**
 * Quick Start Checklist - DB-backed completion checks
 */
import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket,
  TrendingUp, BookOpen, Zap, BarChart3, Bell, X, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChecklistItemDef {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { id: 'add-trade', title: 'Add your first trade', description: 'Log or import a trade', link: '/trades', icon: TrendingUp },
  { id: 'write-journal', title: 'Write a journal entry', description: 'Reflect on your trading day', link: '/journal', icon: BookOpen },
  { id: 'connect-import', title: 'Connect MT5 or import CSV', description: 'Sync your trading data', link: '/mt5-sync', icon: Zap },
  { id: 'run-backtest', title: 'Run your first backtest', description: 'Test a strategy on data', link: '/workflow', icon: BarChart3 },
  { id: 'set-alert', title: 'Set up a risk alert', description: 'Get notified on key events', link: '/alerts', icon: Bell },
];

interface QuickStartChecklistProps {
  className?: string;
}

export function QuickStartChecklist({ className }: QuickStartChecklistProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('mmc_checklist_dismissed') === 'true');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Check real DB for completion
  useEffect(() => {
    if (!user || dismissed) return;
    (async () => {
      setLoading(true);
      const completed = new Set<string>();
      const [trades, journal, mt5, results, alerts] = await Promise.all([
        supabase.from('trades').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('mt5_accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('results').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('trade_alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if ((trades.count ?? 0) > 0) completed.add('add-trade');
      if ((journal.count ?? 0) > 0) completed.add('write-journal');
      if ((mt5.count ?? 0) > 0 || (trades.count ?? 0) > 0) completed.add('connect-import');
      if ((results.count ?? 0) > 0) completed.add('run-backtest');
      if ((alerts.count ?? 0) > 0) completed.add('set-alert');

      setCompletedIds(completed);
      setLoading(false);
    })();
  }, [user, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem('mmc_checklist_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed || loading) return null;

  const completedCount = completedIds.size;
  const total = CHECKLIST_ITEMS.length;
  const progress = (completedCount / total) * 100;
  const allComplete = completedCount === total;

  if (allComplete) return null;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className={cn(
        "border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Quick Start</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount}/{total} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Sparkles className="h-3 w-3" /> +50 XP
            </Badge>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-3" />
      </div>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const isComplete = completedIds.has(item.id);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.link}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md transition-colors",
                  isComplete ? "bg-profit/10 text-muted-foreground" : "hover:bg-muted/50"
                )}
              >
                <div className={cn("p-1 rounded-md", isComplete ? "bg-profit/20" : "bg-muted")}>
                  <Icon className={cn("h-4 w-4", isComplete ? "text-profit" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", isComplete && "line-through")}>{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-profit shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
