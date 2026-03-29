/**
 * Audit Log Viewer
 * Immutable admin action log with filters, search, and CSV export
 */

import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Search, RefreshCw, Download, Filter, Clock,
  Loader2, User, ArrowRight, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: any;
  after_data: any;
  reason: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  role_change: 'bg-amber-500/10 text-amber-600',
  user_ban: 'bg-red-500/10 text-red-600',
  config_change: 'bg-blue-500/10 text-blue-600',
  feature_flag_toggle: 'bg-purple-500/10 text-purple-600',
  kill_switch: 'bg-red-500/10 text-red-600',
  data_delete: 'bg-red-500/10 text-red-600',
  data_export: 'bg-emerald-500/10 text-emerald-600',
  premium_grant: 'bg-amber-500/10 text-amber-600',
  premium_revoke: 'bg-red-500/10 text-red-600',
  announcement: 'bg-blue-500/10 text-blue-600',
};

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data || []) as AuditEntry[]);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEntries(); }, [actionFilter, entityFilter]);

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.action.toLowerCase().includes(q) ||
      e.entity_type.toLowerCase().includes(q) ||
      e.entity_id?.toLowerCase().includes(q) ||
      e.reason?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const actions = [...new Set(entries.map(e => e.action))];
  const entities = [...new Set(entries.map(e => e.entity_type))];

  const exportCSV = () => {
    const csv = [
      'Timestamp,Admin ID,Action,Entity Type,Entity ID,Reason',
      ...filtered.map(e =>
        `"${e.created_at}","${e.admin_id}","${e.action}","${e.entity_type}","${e.entity_id || ''}","${(e.reason || '').replace(/"/g, '""')}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  const renderDiff = (before: any, after: any) => {
    if (!before && !after) return null;
    return (
      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
        {before && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="font-semibold text-red-500 mb-1.5">Before</p>
            <pre className="text-muted-foreground whitespace-pre-wrap break-all font-mono text-[11px]">
              {JSON.stringify(before, null, 2)}
            </pre>
          </div>
        )}
        {after && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <p className="font-semibold text-emerald-500 mb-1.5">After</p>
            <pre className="text-muted-foreground whitespace-pre-wrap break-all font-mono text-[11px]">
              {JSON.stringify(after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Audit Trail
            </CardTitle>
            <CardDescription>{filtered.length} entries • Immutable log of all admin actions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={loadEntries} disabled={loading} className="rounded-xl">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search audit logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Entries */}
        <ScrollArea className="h-[550px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No audit entries found</p>
              <p className="text-xs mt-1">Admin actions will be logged here automatically</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const colorClass = ACTION_COLORS[entry.action] || 'bg-muted text-muted-foreground';

                return (
                  <Collapsible key={entry.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors text-left group">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', colorClass.split(' ')[0])}>
                          <FileText className={cn('h-3.5 w-3.5', colorClass.split(' ')[1])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn('text-[10px] h-5 px-2 rounded-md', colorClass)}>
                              {entry.action.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">on</span>
                            <Badge variant="secondary" className="text-[10px] h-5 px-2 rounded-md">
                              {entry.entity_type}
                            </Badge>
                            {entry.entity_id && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {entry.entity_id.length > 12 ? entry.entity_id.slice(0, 8) + '...' : entry.entity_id}
                              </span>
                            )}
                          </div>
                          {entry.reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              Reason: {entry.reason}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {entry.admin_id.slice(0, 8)}...
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {(entry.before_data || entry.after_data) && (
                          isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-14 pb-3">
                        {renderDiff(entry.before_data, entry.after_data)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
