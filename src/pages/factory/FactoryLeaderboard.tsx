/**
 * Factory Leaderboard
 * Ranked strategy scores per cycle with breakdown
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, AlertTriangle, Search } from 'lucide-react';
import { useRotationCycles, useStrategyScores } from '@/hooks/useFactory';
import { LoadingSpinner } from '@/components/ui/loading';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

function FactoryLeaderboardContent() {
  const { data: cycles } = useRotationCycles();
  const lockedCycles = (cycles || []).filter(c => c.status === 'locked' || c.status === 'published');
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const { data: scores, isLoading } = useStrategyScores(selectedCycle || undefined);
  const [search, setSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('all');

  const allScores = scores || [];
  const symbols = ['all', ...Array.from(new Set(allScores.map(s => s.symbol)))];

  const filtered = allScores.filter(s => {
    const name = (s.strategy_versions as any)?.strategies?.name || '';
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    if (symbolFilter !== 'all' && s.symbol !== symbolFilter) return false;
    return true;
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-400" />;
    if (rank <= 3) return <Medal className="h-4 w-4 text-primary" />;
    return <span className="text-xs text-muted-foreground font-mono">#{rank}</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    if (score > 0) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ranked strategies by Robust Score per cycle</p>
      </div>

      <Card variant="glass">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-full sm:w-72" aria-label="Select scored cycle"><SelectValue placeholder="Select a scored cycle" /></SelectTrigger>
            <SelectContent>
              {lockedCycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.cycle_type} — {c.as_of} ({c.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCycle && (
            <>
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search strategy..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search leaderboard" />
              </div>
              <Select value={symbolFilter} onValueChange={setSymbolFilter}>
                <SelectTrigger className="w-full sm:w-36" aria-label="Filter by symbol"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {symbols.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Symbols' : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
        </CardContent>
      </Card>

      {!selectedCycle ? (
        <Card variant="outline" className="py-16 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Select a scored cycle to view the leaderboard</p>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card variant="outline" className="py-16 text-center">
          <p className="text-muted-foreground">No strategies match your filters</p>
        </Card>
      ) : (
        <Card>
          <div className="w-full min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Timeframe</TableHead>
                  <TableHead className="text-right">Robust Score</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => {
                  const stratName = (s.strategy_versions as any)?.strategies?.name || 'Unknown';
                  const stratCat = (s.strategy_versions as any)?.strategies?.category || 'unknown';
                  const rejected = s.robust_score === 0;

                  return (
                    <TableRow key={s.id} className={rejected ? 'opacity-50' : ''}>
                      <TableCell className="text-center">{getRankIcon(s.rank)}</TableCell>
                      <TableCell className="font-medium truncate max-w-[180px]">{stratName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{stratCat}</Badge></TableCell>
                      <TableCell className="text-sm">{s.symbol}</TableCell>
                      <TableCell className="text-sm">{s.timeframe}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${getScoreColor(s.robust_score)}`}>
                        {s.robust_score.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        {s.notes && (
                          <Tooltip>
                            <TooltipTrigger aria-label="View rejection notes">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">{s.notes}</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function FactoryLeaderboard() {
  return (
    <PageErrorBoundary pageName="Leaderboard">
      <FactoryLeaderboardContent />
    </PageErrorBoundary>
  );
}
