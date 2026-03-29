/**
 * Factory Monitoring
 * Live metrics, drift detection, system events timeline, health summary
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, AlertTriangle, Zap, CheckCircle2, XCircle, Clock, BarChart3 } from 'lucide-react';
import { useFactoryDeployments, useLiveMetrics, useSystemEvents, useIngestMetrics, useBacktestJobs } from '@/hooks/useFactory';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

function FactoryMonitoringContent() {
  const { data: deployments } = useFactoryDeployments();
  const runningDeps = (deployments || []).filter(d => d.status === 'running' || d.status === 'paused');
  const killedDeps = (deployments || []).filter(d => d.status === 'killed');
  const [selectedDep, setSelectedDep] = useState<string>('');
  const { data: metrics, isLoading: metricsLoading } = useLiveMetrics(selectedDep || undefined);
  const { data: events } = useSystemEvents(50);
  const ingest = useIngestMetrics();

  // Health summary
  const recentEvents = events || [];
  const failsLast24h = recentEvents.filter(e => e.kind === 'kill' || e.kind === 'rollback').length;

  const handleMockIngest = () => {
    if (!selectedDep) return;
    // Deterministic sample data for manual ingest testing — clearly labeled
    const dayHash = new Date().getDate();
    ingest.mutate({
      deployment_id: selectedDep,
      date: new Date().toISOString().slice(0, 10),
      daily_pnl: Math.round(((dayHash * 37 % 100) - 40) * 6) / 100,
      dd_pct: Math.round((dayHash * 13 % 12) * 100) / 100,
      trade_count: (dayHash * 7) % 15,
      expectancy: Math.round(((dayHash * 23 % 100) - 20) * 0.4 * 100) / 100,
      drift_score: Math.round((dayHash * 11 % 30) * 100) / 100,
    });
  };

  const pnlColor = (v: number) => v >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitoring</h1>
        <p className="text-muted-foreground text-sm mt-1">Live PnL, drawdown, drift tracking, and system event log</p>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="stat">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{runningDeps.length}</p>
              <p className="text-xs text-muted-foreground">Running</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{killedDeps.length}</p>
              <p className="text-xs text-muted-foreground">Killed</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{failsLast24h}</p>
              <p className="text-xs text-muted-foreground">Kill/Rollback Events</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{(deployments || []).length}</p>
              <p className="text-xs text-muted-foreground">Total Deployments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Selector */}
      <Card variant="glass">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <Select value={selectedDep} onValueChange={setSelectedDep}>
            <SelectTrigger className="w-full sm:w-80" aria-label="Select active deployment"><SelectValue placeholder="Select active deployment" /></SelectTrigger>
            <SelectContent>
              {runningDeps.map(d => {
                const member = d.factory_portfolio_members as any;
                return (
                  <SelectItem key={d.id} value={d.id}>
                    {member?.strategy_versions?.strategies?.name || '—'} / {member?.symbol} ({d.status})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={!selectedDep || ingest.isPending} onClick={handleMockIngest}>
            <Zap className="h-4 w-4 mr-1" /> Simulate Daily Metrics
          </Button>
        </CardContent>
      </Card>

      {/* Metrics Table */}
      {selectedDep && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Daily Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : !(metrics || []).length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No metrics yet. Click "Simulate Daily Metrics" to generate test data.</p>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Daily PnL</TableHead>
                      <TableHead className="text-right">DD%</TableHead>
                      <TableHead className="text-right">Trades</TableHead>
                      <TableHead className="text-right">Expectancy</TableHead>
                      <TableHead className="text-right">Drift Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(metrics || []).map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm font-mono whitespace-nowrap">{m.date}</TableCell>
                        <TableCell className={`text-right font-mono ${pnlColor(m.daily_pnl)}`}>
                          {m.daily_pnl >= 0 ? '+' : ''}{m.daily_pnl.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{m.dd_pct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right text-sm">{m.trade_count}</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${pnlColor(m.expectancy)}`}>
                          {m.expectancy.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {m.drift_score > 20 ? (
                            <Badge variant="destructive" className="text-[10px]">{m.drift_score.toFixed(1)}</Badge>
                          ) : (
                            <span className="font-mono">{m.drift_score.toFixed(1)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* System Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Events</CardTitle>
          <CardDescription>Latest factory events (enqueue, score, deploy, kill, rollback)</CardDescription>
        </CardHeader>
        <CardContent>
          {!recentEvents.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No events yet. Actions in the Factory will appear here.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentEvents.map(e => (
                <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                  <Badge variant="outline" className="text-[10px] mt-0.5 capitalize shrink-0">{e.kind}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">{e.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {e.entity_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FactoryMonitoring() {
  return (
    <PageErrorBoundary pageName="Monitoring">
      <FactoryMonitoringContent />
    </PageErrorBoundary>
  );
}
