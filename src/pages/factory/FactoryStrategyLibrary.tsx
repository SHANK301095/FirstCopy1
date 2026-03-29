/**
 * Factory Strategy Library
 * Registry of 500+ strategies with versions, categories, tags
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, BookOpen, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFactoryStrategies } from '@/hooks/useFactory';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

const CATEGORIES = ['all', 'trend', 'range', 'breakout', 'defensive', 'unknown'];
const PAGE_SIZE = 25;

function FactoryStrategyLibraryContent() {
  const { data: strategies, isLoading } = useFactoryStrategies();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = (strategies || []).filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && s.category !== category) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleCategory = (v: string) => { setCategory(v); setPage(0); };

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s === 'paused') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strategy Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Register, version, and manage your EA strategies</p>
        </div>
        <Badge variant="outline" className="text-xs">{filtered.length} strategies</Badge>
      </div>

      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search strategies..." value={search} onChange={e => handleSearch(e.target.value)} className="pl-9" aria-label="Search strategies" />
            </div>
            <Select value={category} onValueChange={handleCategory}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card variant="outline" className="py-16 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No strategies found. Create your first strategy to begin.</p>
        </Card>
      ) : (
        <Card>
          <div className="w-full min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{s.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(s.tags || []).slice(0, 3).map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.default_symbol || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <GitBranch className="h-3 w-3" />
                        {(s.strategy_versions || []).length}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColor(s.factory_status)}`}>{s.factory_status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function FactoryStrategyLibrary() {
  return (
    <PageErrorBoundary pageName="Strategy Library">
      <FactoryStrategyLibraryContent />
    </PageErrorBoundary>
  );
}
