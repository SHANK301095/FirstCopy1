/**
 * Factory Portfolio Builder
 * Auto-built diversified portfolio with champions/challengers/reserves
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Shield, Users, AlertTriangle } from 'lucide-react';
import { useRotationCycles, useFactoryPortfolios, usePortfolioMembers, useBuildPortfolio, usePublishCycle } from '@/hooks/useFactory';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

const ROLE_COLORS: Record<string, string> = {
  champion: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  challenger: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  reserve: 'bg-muted text-muted-foreground border-border',
};

function FactoryPortfolioBuilderContent() {
  const { data: cycles } = useRotationCycles();
  const lockedCycles = (cycles || []).filter(c => c.status === 'locked' || c.status === 'published');
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const { data: portfolios } = useFactoryPortfolios();
  const cyclePortfolio = (portfolios || []).find(p => (p as any).cycle_id === selectedCycle);
  const { data: members, isLoading } = usePortfolioMembers(cyclePortfolio?.id);
  const buildPortfolio = useBuildPortfolio();
  const publishCycle = usePublishCycle();

  const currentCycle = lockedCycles.find(c => c.id === selectedCycle);
  const champions = (members || []).filter(m => m.role === 'champion');
  const challengers = (members || []).filter(m => m.role === 'challenger');
  const reserves = (members || []).filter(m => m.role === 'reserve');
  const champAllocation = champions.reduce((s, m) => s + m.allocation_pct, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Builder</h1>
        <p className="text-muted-foreground text-sm mt-1">Auto-build diversified Top 10–15 portfolios from scored cycles</p>
      </div>

      <Card variant="glass">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Select locked cycle"><SelectValue placeholder="Select locked cycle" /></SelectTrigger>
            <SelectContent>
              {lockedCycles.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.cycle_type} — {c.as_of} ({c.status})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!selectedCycle || buildPortfolio.isPending || currentCycle?.status === 'published'}
            onClick={() => buildPortfolio.mutate({ cycle_id: selectedCycle })}>
            <Briefcase className="h-4 w-4 mr-1" /> Build Portfolio
          </Button>
          {currentCycle?.status === 'locked' && (
            <Button size="sm" variant="secondary" onClick={() => publishCycle.mutate({ cycle_id: selectedCycle })}>
              Publish Cycle
            </Button>
          )}
        </CardContent>
      </Card>

      {!cyclePortfolio ? (
        <Card variant="outline" className="py-16 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No portfolio yet. Select a locked cycle and click "Build Portfolio".</p>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="stat">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{champions.length}</p>
                  <p className="text-xs text-muted-foreground">Champions</p>
                </div>
              </CardContent>
            </Card>
            <Card variant="stat">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{challengers.length}</p>
                  <p className="text-xs text-muted-foreground">Challengers</p>
                </div>
              </CardContent>
            </Card>
            <Card variant="stat">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{reserves.length}</p>
                  <p className="text-xs text-muted-foreground">Reserves</p>
                </div>
              </CardContent>
            </Card>
            <Card variant="stat">
              <CardContent className="p-4 flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{champAllocation.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Champion Alloc.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio Members</CardTitle>
              <CardDescription>{cyclePortfolio.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full min-w-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>TF</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Allocation</TableHead>
                      <TableHead className="text-right">Kill DD%</TableHead>
                      <TableHead className="text-right">Kill Streak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(members || []).map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium truncate max-w-[180px]">
                          {(m.strategy_versions as any)?.strategies?.name || '—'}
                        </TableCell>
                        <TableCell className="text-sm">{m.symbol}</TableCell>
                        <TableCell className="text-sm">{m.timeframe}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] capitalize ${ROLE_COLORS[m.role] || ''}`}>{m.role}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {m.allocation_pct > 0 ? `${m.allocation_pct}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">{m.kill_dd_pct}%</TableCell>
                        <TableCell className="text-right text-sm">{m.kill_loss_streak}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function FactoryPortfolioBuilder() {
  return (
    <PageErrorBoundary pageName="Portfolio Builder">
      <FactoryPortfolioBuilderContent />
    </PageErrorBoundary>
  );
}
