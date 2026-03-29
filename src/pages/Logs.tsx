/**
 * Logs Page
 * Unified log viewer - shows both local (IndexedDB) and cloud (Supabase) logs
 */

import { useState, useEffect } from 'react';
import { 
  ScrollText, 
  Filter, 
  Trash2, 
  Download, 
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Cloud,
  HardDrive,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { db, LogEntry as LocalLogEntry } from '@/db/index';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/lib/secureLogger';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';

interface CloudLog {
  id: string;
  level: string | null;
  scope: string;
  message: string | null;
  meta_json: unknown;
  created_at: string | null;
  user_id: string | null;
}

const LEVEL_CONFIG = {
  debug: { icon: Bug, color: 'text-muted-foreground', bg: 'bg-muted' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function Logs() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [localLogs, setLocalLogs] = useState<LocalLogEntry[]>([]);
  const [cloudLogs, setCloudLogs] = useState<CloudLog[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');

  const loadLocalLogs = async () => {
    setLoading(true);
    const allLogs = await db.logs.orderBy('ts').reverse().limit(500).toArray();
    setLocalLogs(allLogs);
    setLoading(false);
  };

  const loadCloudLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        secureLogger.error('db', 'Error loading cloud logs', { error: error.message });
        toast({ title: 'Error', description: 'Failed to load cloud logs', variant: 'destructive' });
        return;
      }

      setCloudLogs(data || []);
    } catch (err) {
      secureLogger.error('system', 'Cloud logs fetch failed', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalLogs();
    if (user) {
      loadCloudLogs();
    }
  }, [user]);

  const handleRefresh = () => {
    if (activeTab === 'local') {
      loadLocalLogs();
    } else {
      loadCloudLogs();
    }
  };

  const clearLocalLogs = async () => {
    await db.logs.clear();
    setLocalLogs([]);
    toast({ title: 'Logs Cleared', description: 'Local logs have been deleted' });
  };

  const clearCloudLogs = async () => {
    if (!user) return;
    
    const { error } = await supabase.from('logs').delete().eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete cloud logs', variant: 'destructive' });
      return;
    }
    setCloudLogs([]);
    toast({ title: 'Logs Cleared', description: 'Cloud logs have been deleted' });
  };

  const exportLogs = (type: 'local' | 'cloud', format: 'json' | 'csv') => {
    const logs = type === 'local' 
      ? localLogs.map(l => ({
          timestamp: new Date(l.ts).toISOString(),
          level: l.level,
          message: l.message,
          meta: l.meta,
        }))
      : cloudLogs.map(l => ({
          timestamp: l.created_at,
          level: l.level,
          scope: l.scope,
          message: l.message,
          meta: l.meta_json,
        }));

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
      filename = `logs-${type}-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      const headers = Object.keys(logs[0] || {}).join(',');
      const rows = logs.map(l => Object.values(l).map(v => 
        typeof v === 'object' ? JSON.stringify(v) : String(v)
      ).join(','));
      content = [headers, ...rows].join('\n');
      filename = `logs-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: `${logs.length} logs exported as ${format.toUpperCase()}` });
  };

  const exportDebugBundle = async () => {
    try {
      const settings = await db.getSettings();
      const recentLogs = await db.logs.orderBy('ts').reverse().limit(1000).toArray();
      const lastRun = await db.backtestRuns.orderBy('createdAt').reverse().first();

      const bundle = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        userId: user?.id,
        settings: { ...settings },
        localLogs: recentLogs,
        cloudLogs: cloudLogs.slice(0, 100),
        lastRun: lastRun ? {
          id: lastRun.id,
          status: lastRun.status,
          progress: lastRun.progress,
          error: lastRun.error,
          startedAt: lastRun.startedAt,
          endedAt: lastRun.endedAt,
        } : null,
      };

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mmc-debug-bundle-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Exported', description: 'Debug bundle downloaded' });
    } catch (err) {
      toast({ title: 'Export Failed', description: String(err), variant: 'destructive' });
    }
  };

  const getFilteredLogs = (logs: Array<LocalLogEntry | CloudLog>) => {
    return logs.filter(log => {
      const level = 'level' in log ? log.level : '';
      const message = 'message' in log ? log.message : '';
      const matchesLevel = levelFilter === 'all' || level === levelFilter;
      const matchesSearch = !searchQuery || 
        message?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  };

  const filteredLocalLogs = getFilteredLogs(localLogs) as LocalLogEntry[];
  const filteredCloudLogs = getFilteredLogs(cloudLogs) as CloudLog[];

  const localLevelCounts = {
    all: localLogs.length,
    debug: localLogs.filter(l => l.level === 'debug').length,
    info: localLogs.filter(l => l.level === 'info').length,
    warn: localLogs.filter(l => l.level === 'warn').length,
    error: localLogs.filter(l => l.level === 'error').length,
  };

  const cloudLevelCounts = {
    all: cloudLogs.length,
    debug: cloudLogs.filter(l => l.level === 'debug').length,
    info: cloudLogs.filter(l => l.level === 'info').length,
    warn: cloudLogs.filter(l => l.level === 'warn').length,
    error: cloudLogs.filter(l => l.level === 'error').length,
  };

  const levelCounts = activeTab === 'local' ? localLevelCounts : cloudLevelCounts;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Logs" 
          subtitle="View application logs and export debug bundles"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportDebugBundle}>
            <Download className="h-4 w-4 mr-2" />
            Debug Bundle
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'local' | 'cloud')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="local" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Local ({localLogs.length})
          </TabsTrigger>
          <TabsTrigger value="cloud" className="gap-2">
            <Cloud className="h-4 w-4" />
            Cloud ({cloudLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Filter Card */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({levelCounts.all})</SelectItem>
                    <SelectItem value="debug">Debug ({levelCounts.debug})</SelectItem>
                    <SelectItem value="info">Info ({levelCounts.info})</SelectItem>
                    <SelectItem value="warn">Warn ({levelCounts.warn})</SelectItem>
                    <SelectItem value="error">Error ({levelCounts.error})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportLogs(activeTab, 'json')}
                >
                  JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportLogs(activeTab, 'csv')}
                >
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={activeTab === 'local' ? clearLocalLogs : clearCloudLogs}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              {Object.entries(levelCounts).filter(([k]) => k !== 'all').map(([level, count]) => {
                const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG];
                return (
                  <Badge
                    key={level}
                    variant="outline"
                    className={cn(
                      'cursor-pointer transition-colors',
                      levelFilter === level && config.bg,
                      config.color
                    )}
                    onClick={() => setLevelFilter(levelFilter === level ? 'all' : level)}
                  >
                    {level.toUpperCase()}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardHeader>
        </Card>

        {/* Local Logs */}
        <TabsContent value="local" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                Local Log Entries ({filteredLocalLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredLocalLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No logs found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredLocalLogs.map((log) => {
                      const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
                      const Icon = config.icon;
                      return (
                        <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={cn('p-1.5 rounded', config.bg)}>
                              <Icon className={cn('h-4 w-4', config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                                  {log.level.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {new Date(log.ts).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{log.message}</p>
                              {log.meta && (
                                <pre className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto max-h-32">
                                  {JSON.stringify(log.meta, null, 2)}
                                </pre>
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
        </TabsContent>

        {/* Cloud Logs */}
        <TabsContent value="cloud" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                Cloud Log Entries ({filteredCloudLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {!user ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sign in to view cloud logs</p>
                  </div>
                ) : filteredCloudLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cloud logs found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredCloudLogs.map((log) => {
                      const config = LEVEL_CONFIG[log.level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.info;
                      const Icon = config.icon;
                      return (
                        <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className={cn('p-1.5 rounded', config.bg)}>
                              <Icon className={cn('h-4 w-4', config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                                  {log.level?.toUpperCase() || 'INFO'}
                                </Badge>
                                {log.scope && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {log.scope}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground font-mono">
                                  {log.created_at && new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{log.message}</p>
                              {log.meta_json && (
                                <pre className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto max-h-32">
                                  {JSON.stringify(log.meta_json, null, 2)}
                                </pre>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
