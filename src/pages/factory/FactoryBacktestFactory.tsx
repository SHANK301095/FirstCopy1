/**
 * Backtest Factory — Production-Grade Batch Orchestration
 * Real cycle management, job lifecycle, and result persistence
 * Mock submission isolated behind explicit fallback toggle
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, Zap, CheckCircle2, XCircle, Clock, Loader2, FlaskConical, Plus, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { useRotationCycles, useBacktestJobs, useEnqueueJobs, useScoreCycle, useSubmitMockResult } from '@/hooks/useFactory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading';
import { generateFactoryDemoData } from '@/lib/factoryDemoSeed';
import { useQueryClient } from '@tanstack/react-query';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

const STATUS_ICONS: Record<string, any> = {
  queued: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />,
  succeeded: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  retried: <RotateCcw className="h-3.5 w-3.5 text-yellow-400" />,
  canceled: <XCircle className="h-3.5 w-3.5 text-muted-foreground" />,
};

const PAGE_SIZE = 30;

function FactoryBacktestFactoryContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: cycles, isLoading: cyclesLoading } = useRotationCycles();
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const { data: jobs, isLoading: jobsLoading } = useBacktestJobs(selectedCycle || undefined);
  const enqueue = useEnqueueJobs();
  const scoreCycle = useScoreCycle();
  const submitMock = useSubmitMockResult();
  const [newCycleType, setNewCycleType] = useState<string>('weekly');
  const [page, setPage] = useState(0);
  const [showFallbackControls, setShowFallbackControls] = useState(false);
  const [retryingJob, setRetryingJob] = useState<string | null>(null);

  const createCycle = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from('rotation_cycles').insert({
      user_id: user.id, cycle_type: newCycleType, as_of: today, status: 'running',
    }).select('id').single();
    if (error) { toast.error(error.message); return; }
    toast.success(`${newCycleType} cycle created`);
    qc.invalidateQueries({ queryKey: ['rotation-cycles'] });
    setSelectedCycle(data!.id);
  };

  const handleSeedDemo = async () => {
    const result = await generateFactoryDemoData();
    if (result?.cycle_id) setSelectedCycle(result.cycle_id);
    qc.invalidateQueries();
  };

  const retryFailedJob = async (jobId: string) => {
    setRetryingJob(jobId);
    try {
      const { error } = await supabase
        .from('backtest_jobs')
        .update({ status: 'queued', error: null, attempts: 0, started_at: null, finished_at: null })
        .eq('id', jobId);
      if (error) throw error;
      toast.success('Job re-queued for retry');
      qc.invalidateQueries({ queryKey: ['backtest-jobs'] });
    } catch (e: any) {
      toast.error(e.message || 'Retry failed');
    } finally {
      setRetryingJob(null);
    }
  };

  const cancelJob = async (jobId: string) => {
    const { error } = await supabase
      .from('backtest_jobs')
      .update({ status: 'failed', error: 'Canceled by user', finished_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) toast.error(error.message);
    else {
      toast.success('Job canceled');
      qc.invalidateQueries({ queryKey: ['backtest-jobs'] });
    }
  };

  const allJobs = jobs || [];
  const jobStats = {
    queued: allJobs.filter(j => j.status === 'queued').length,
    running: allJobs.filter(j => j.status === 'running').length,
    succeeded: allJobs.filter(j => j.status === 'succeeded').length,
    failed: allJobs.filter(j => j.status === 'failed').length,
  };

  const totalPages = Math.max(1, Math.ceil(allJobs.length / PAGE_SIZE));
  const paginatedJobs = allJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const currentCycle = (cycles || []).find(c => c.id === selectedCycle);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backtest Factory</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure cycles, enqueue jobs, and score results</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="fallback-mode"
              checked={showFallbackControls}
              onCheckedChange={setShowFallbackControls}
            />
            <Label htmlFor="fallback-mode" className="text-xs text-muted-foreground">
              Fallback Mode
            </Label>
          </div>
          {showFallbackControls && (
            <Button variant="outline" size="sm" onClick={handleSeedDemo}>
              <FlaskConical className="h-4 w-4 mr-1" /> Seed Demo Data
            </Button>
          )}
        </div>
      </div>

      {showFallbackControls && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-500">Fallback Mode — Mock results are for testing only. Real jobs use the backtest engine.</p>
        </div>
      )}

      {/* Cycle Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="stat">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Cycle</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedCycle} onValueChange={(v) => { setSelectedCycle(v); setPage(0); }}>
              <SelectTrigger aria-label="Select cycle"><SelectValue placeholder="Select cycle" /></SelectTrigger>
              <SelectContent>
                {(cycles || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.cycle_type} — {c.as_of} ({c.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card variant="stat">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Create New Cycle</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={newCycleType} onValueChange={setNewCycleType}>
                <SelectTrigger className="w-full sm:w-32" aria-label="Cycle type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={createCycle}><Plus className="h-4 w-4 mr-1" /> Create</Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="stat">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={!selectedCycle || enqueue.isPending} onClick={() => enqueue.mutate({ cycle_id: selectedCycle })}>
              <Zap className="h-4 w-4 mr-1" /> Enqueue All
            </Button>
            <Button size="sm" variant="secondary" disabled={!selectedCycle || currentCycle?.status !== 'running'}
              onClick={() => scoreCycle.mutate({ cycle_id: selectedCycle })}>
              Score & Lock
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Job Queue Stats */}
      {selectedCycle && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(jobStats).map(([k, v]) => (
            <Card key={k} variant="stat">
              <CardContent className="p-4 flex items-center gap-3">
                {STATUS_ICONS[k]}
                <div>
                  <p className="text-2xl font-bold">{v}</p>
                  <p className="text-xs text-muted-foreground capitalize">{k}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Table */}
      {selectedCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Queue</CardTitle>
            <CardDescription>Backtest jobs for the selected cycle ({allJobs.length} total)</CardDescription>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
              <>
                <div className="w-full min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Strategy</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>TF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Robust Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedJobs.map(j => (
                        <TableRow key={j.id}>
                          <TableCell className="font-medium text-sm truncate max-w-[200px]">
                            {(j.strategy_versions as any)?.strategies?.name || '—'}
                          </TableCell>
                          <TableCell className="text-sm">{(j.backtest_configs as any)?.symbol}</TableCell>
                          <TableCell className="text-sm">{(j.backtest_configs as any)?.timeframe}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {STATUS_ICONS[j.status] || STATUS_ICONS.queued}
                              <span className="text-xs capitalize">{j.status}</span>
                              {j.attempts > 1 && (
                                <Badge variant="outline" className="text-[10px] ml-1">×{j.attempts}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {j.factory_backtest_results ? (
                              <span className="font-mono text-sm font-semibold">
                                {(j.factory_backtest_results as any).robust_score?.toFixed(1)}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {j.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  disabled={retryingJob === j.id}
                                  onClick={() => retryFailedJob(j.id)}
                                  aria-label="Retry job"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                </Button>
                              )}
                              {j.status === 'queued' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-destructive"
                                  onClick={() => cancelJob(j.id)}
                                  aria-label="Cancel job"
                                >
                                  Cancel
                                </Button>
                              )}
                              {showFallbackControls && j.status === 'queued' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-yellow-500"
                                  onClick={() => {
                                    // Deterministic fallback result based on job index
                                    const hash = j.id.charCodeAt(0) + j.id.charCodeAt(1);
                                    submitMock.mutate({
                                      job_id: j.id,
                                      result: {
                                        net_profit: ((hash * 137) % 12000) - 2000,
                                        max_dd_pct: ((hash * 53) % 1800) / 100,
                                        profit_factor: ((hash * 71) % 250 + 50) / 100,
                                        win_rate: ((hash * 43) % 4000 + 3500) / 100,
                                        avg_trade: ((hash * 31) % 6000 - 1000) / 100,
                                        trades: (hash * 17) % 400 + 80,
                                        sharpe: ((hash * 23) % 300 - 50) / 100,
                                        consistency_score: ((hash * 61) % 100) / 100,
                                        worst_month: -((hash * 11) % 1500) / 100,
                                      },
                                    });
                                  }}
                                  aria-label="Submit fallback result"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Fallback
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allJobs.length)} of {allJobs.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs px-2">{page + 1}/{totalPages}</span>
                      <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FactoryBacktestFactory() {
  return (
    <PageErrorBoundary pageName="Backtest Factory">
      <FactoryBacktestFactoryContent />
    </PageErrorBoundary>
  );
}
