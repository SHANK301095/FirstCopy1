/**
 * Activity Log Viewer
 * Real-time system logs with filtering and search
 */

import { useState, useEffect } from 'react';
import {
  Search, RefreshCw, Filter, AlertTriangle, CheckCircle, Info,
  Clock, Loader2, Download, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  scope: string;
  level: string | null;
  message: string | null;
  meta_json: any;
  created_at: string | null;
  user_id: string | null;
}

export function ActivityLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (levelFilter !== 'all') query = query.eq('level', levelFilter);
      if (scopeFilter !== 'all') query = query.eq('scope', scopeFilter);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as LogEntry[]);
    } catch (err) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [levelFilter, scopeFilter]);

  const filteredLogs = search
    ? logs.filter(l => l.message?.toLowerCase().includes(search.toLowerCase()) || l.scope.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const scopes = [...new Set(logs.map(l => l.scope))];

  const levelStyles: Record<string, { icon: typeof Info; color: string; bg: string }> = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const exportLogs = () => {
    const csv = ['Timestamp,Level,Scope,Message', ...filteredLogs.map(l =>
      `"${l.created_at}","${l.level}","${l.scope}","${(l.message || '').replace(/"/g, '""')}"`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `logs-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported');
  };

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              System Logs
            </CardTitle>
            <CardDescription>{filteredLogs.length} entries</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportLogs} className="rounded-xl">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="rounded-xl">
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
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              {scopes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Log List */}
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No logs found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log) => {
                const style = levelStyles[log.level || 'info'] || levelStyles.info;
                const Icon = style.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', style.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', style.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.message || '—'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded">{log.scope}</Badge>
                        {log.level && <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 rounded', style.color)}>{log.level}</Badge>}
                        {log.created_at && (
                          <span className="text-[10px] text-muted-foreground" title={format(new Date(log.created_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        )}
                        {log.user_id && (
                          <span className="text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                            {log.user_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
