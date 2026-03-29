/**
 * Strategy Versioning Page
 * Track changes in strategy code and compare performance across versions
 * Supports Public Library strategies via UniversalAssetSelector
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GitBranch, History, Trash2, Eye, GitCompare, Plus,
  Loader2, Cloud, Code, Calendar, FileText, BarChart3,
  TrendingUp, TrendingDown, Minus, PlusIcon, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  fetchStrategies, 
  fetchStrategyVersions, 
  createStrategyVersion,
  deleteStrategyVersion,
  fetchResults,
  type CloudStrategy, 
  type CloudStrategyVersion,
  type CloudResult
} from '@/lib/cloudSync';
import { computeDiff, type DiffLine } from '@/lib/diffUtils';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { UniversalAssetSelector, type AssetOption } from '@/components/selectors/UniversalAssetSelector';

// Parsed result for display
interface ParsedResult {
  id: string;
  symbol: string;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  created_at: string;
}

function parseResult(result: CloudResult): ParsedResult {
  const summary = result.summary_json as Record<string, unknown>;
  return {
    id: result.id,
    symbol: (summary.symbol as string) || 'Unknown',
    netProfit: (summary.netProfit as number) || 0,
    winRate: (summary.winRate as number) || 0,
    profitFactor: (summary.profitFactor as number) || 0,
    totalTrades: (summary.totalTrades as number) || 0,
    created_at: result.created_at || '',
  };
}

// Diff Line Component
function DiffLineDisplay({ line, side }: { line: DiffLine; side: 'left' | 'right' }) {
  if (line.lineNumber === -1) {
    // Placeholder line
    return (
      <div className="h-6 bg-muted/20 border-l-2 border-transparent" />
    );
  }

  return (
    <div className={cn(
      'flex text-xs font-mono',
      line.type === 'removed' && 'bg-loss/20 border-l-2 border-loss',
      line.type === 'added' && 'bg-profit/20 border-l-2 border-profit',
      line.type === 'unchanged' && 'border-l-2 border-transparent'
    )}>
      <span className="w-8 px-1 text-right text-muted-foreground select-none shrink-0">
        {line.lineNumber > 0 ? line.lineNumber : ''}
      </span>
      <span className="w-4 text-center shrink-0">
        {line.type === 'removed' && <Minus className="h-3 w-3 text-loss inline" />}
        {line.type === 'added' && <PlusIcon className="h-3 w-3 text-profit inline" />}
      </span>
      <pre className="flex-1 px-2 overflow-hidden text-ellipsis whitespace-pre">
        {line.content}
      </pre>
    </div>
  );
}

export default function StrategyVersioning() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<CloudStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<CloudStrategy | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetOption | null>(null);
  const [versions, setVersions] = useState<CloudStrategyVersion[]>([]);
  const [versionResults, setVersionResults] = useState<Record<string, ParsedResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  
  // Dialogs
  const [viewVersion, setViewVersion] = useState<CloudStrategyVersion | null>(null);
  const [compareVersions, setCompareVersions] = useState<[CloudStrategyVersion, CloudStrategyVersion] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showNewVersion, setShowNewVersion] = useState(false);
  
  // New version form
  const [newVersionNumber, setNewVersionNumber] = useState('');
  const [newVersionCode, setNewVersionCode] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [newVersionSummary, setNewVersionSummary] = useState('');
  const [saving, setSaving] = useState(false);

  // Compare selection
  const [compareSelection, setCompareSelection] = useState<Set<string>>(new Set());

  // Handle asset selection from UniversalAssetSelector
  const handleAssetSelect = (asset: AssetOption | null) => {
    setSelectedAsset(asset);
    if (asset) {
      const strategy = strategies.find(s => s.id === asset.id);
      if (strategy) {
        setSelectedStrategy(strategy);
      }
    }
    setCompareSelection(new Set());
  };

  // Compute diff for comparison
  const diffResult = useMemo(() => {
    if (!compareVersions) return null;
    const oldCode = compareVersions[0].code || '';
    const newCode = compareVersions[1].code || '';
    return computeDiff(oldCode, newCode);
  }, [compareVersions]);

  useEffect(() => {
    loadStrategies();
  }, [user]);

  useEffect(() => {
    if (selectedStrategy) {
      loadVersions(selectedStrategy.id);
    }
  }, [selectedStrategy]);

  async function loadStrategies() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchStrategies();
      setStrategies(data);
      if (data.length > 0 && !selectedStrategy) {
        setSelectedStrategy(data[0]);
      }
    } catch (error) {
      toast({
        title: 'Failed to load strategies',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(strategyId: string) {
    setLoadingVersions(true);
    try {
      const data = await fetchStrategyVersions(strategyId);
      setVersions(data);
      
      // Load results for each version
      const resultsMap: Record<string, ParsedResult[]> = {};
      for (const version of data) {
        try {
          const results = await fetchResults({ strategyVersionId: version.id });
          resultsMap[version.id] = results.map(parseResult);
        } catch {
          resultsMap[version.id] = [];
        }
      }
      setVersionResults(resultsMap);
    } catch (error) {
      toast({
        title: 'Failed to load versions',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleCreateVersion() {
    if (!selectedStrategy || !newVersionNumber.trim()) {
      toast({ title: 'Version number required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await createStrategyVersion({
        strategy_id: selectedStrategy.id,
        version: newVersionNumber.trim(),
        code: newVersionCode || selectedStrategy.code || undefined,
        notes: newVersionNotes || undefined,
        change_summary: newVersionSummary || undefined,
      });
      
      toast({ title: 'Version created', description: `Version ${newVersionNumber} saved` });
      setShowNewVersion(false);
      setNewVersionNumber('');
      setNewVersionCode('');
      setNewVersionNotes('');
      setNewVersionSummary('');
      loadVersions(selectedStrategy.id);
    } catch (error) {
      toast({
        title: 'Failed to create version',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVersion(id: string) {
    try {
      await deleteStrategyVersion(id);
      setVersions(v => v.filter(ver => ver.id !== id));
      toast({ title: 'Version deleted' });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  }

  function toggleCompareSelect(versionId: string) {
    setCompareSelection(s => {
      const newSet = new Set(s);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else if (newSet.size < 2) {
        newSet.add(versionId);
      }
      return newSet;
    });
  }

  function startComparison() {
    const selected = versions.filter(v => compareSelection.has(v.id));
    if (selected.length === 2) {
      // Sort by date so older is first (left side)
      selected.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setCompareVersions([selected[0], selected[1]]);
    }
  }

  function openNewVersionWithCurrent() {
    if (selectedStrategy) {
      setNewVersionCode(selectedStrategy.code || '');
      // Auto-increment version
      const latestVersion = versions[0]?.version || selectedStrategy.version || '1.0';
      const parts = latestVersion.split('.');
      const minor = parseInt(parts[1] || '0') + 1;
      setNewVersionNumber(`${parts[0]}.${minor}`);
    }
    setShowNewVersion(true);
  }

  // Get aggregated stats for a version
  function getVersionStats(versionId: string) {
    const results = versionResults[versionId] || [];
    if (results.length === 0) return null;
    
    const totalProfit = results.reduce((sum, r) => sum + r.netProfit, 0);
    const avgWinRate = results.reduce((sum, r) => sum + r.winRate, 0) / results.length;
    const avgPF = results.reduce((sum, r) => sum + r.profitFactor, 0) / results.length;
    
    return { totalProfit, avgWinRate, avgPF, count: results.length };
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to manage strategy versions.
            </p>
            <Button asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageTitle 
          title="Strategy Versioning" 
          subtitle="Track code changes and compare performance across versions"
        />
      </div>

      {strategies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Strategies Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create strategies in the Workflow to start versioning.
            </p>
            <Button asChild>
              <Link to="/">Go to Workflow</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Strategy Selector */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <UniversalAssetSelector
                  assetType="strategy"
                  value={selectedAsset}
                  onSelect={handleAssetSelect}
                  placeholder="Choose a strategy..."
                />

                {selectedStrategy && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Version:</span>
                      <Badge variant="outline">{selectedStrategy.version || '1.0'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(selectedStrategy.created_at || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saved Versions:</span>
                      <span>{versions.length}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {selectedStrategy && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button 
                    className="w-full gap-2" 
                    onClick={openNewVersionWithCurrent}
                  >
                    <Plus className="h-4 w-4" />
                    Save New Version
                  </Button>
                  {compareSelection.size === 2 && (
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={startComparison}
                    >
                      <GitCompare className="h-4 w-4" />
                      Compare Selected
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Version History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Version History
                </CardTitle>
                <CardDescription>
                  {selectedStrategy ? `${versions.length} versions saved` : 'Select a strategy'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVersions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No versions saved yet</p>
                    <p className="text-sm">Click "Save New Version" to create your first snapshot</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {versions.map((version, index) => {
                        const stats = getVersionStats(version.id);
                        const results = versionResults[version.id] || [];
                        
                        return (
                          <div
                            key={version.id}
                            className={cn(
                              'p-4 rounded-lg border transition-colors',
                              compareSelection.has(version.id) 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-muted-foreground/50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                    v{version.version}
                                  </Badge>
                                  {index === 0 && (
                                    <Badge variant="outline" className="text-xs">Latest</Badge>
                                  )}
                                  {results.length > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <BarChart3 className="h-3 w-3" />
                                      {results.length} result{results.length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(version.created_at).toLocaleString()}
                                </div>
                                {version.change_summary && (
                                  <p className="mt-2 text-sm">{version.change_summary}</p>
                                )}
                                
                                {/* Performance Stats */}
                                {stats && (
                                  <div className="mt-3 flex items-center gap-4 text-xs">
                                    <div className={cn(
                                      'flex items-center gap-1',
                                      stats.totalProfit >= 0 ? 'text-profit' : 'text-loss'
                                    )}>
                                      {stats.totalProfit >= 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3" />
                                      )}
                                      <span className="font-mono">
                                        ₹{stats.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      {stats.avgWinRate.toFixed(1)}% win
                                    </div>
                                    <div className="text-muted-foreground">
                                      PF {stats.avgPF.toFixed(2)}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => toggleCompareSelect(version.id)}
                                  title="Select for comparison"
                                >
                                  <GitCompare className={cn(
                                    'h-4 w-4',
                                    compareSelection.has(version.id) && 'text-primary'
                                  )} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setViewVersion(version)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteId(version.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* New Version Dialog */}
      <Dialog open={showNewVersion} onOpenChange={setShowNewVersion}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save New Version</DialogTitle>
            <DialogDescription>
              Create a snapshot of the current strategy code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version Number</Label>
                <Input
                  value={newVersionNumber}
                  onChange={(e) => setNewVersionNumber(e.target.value)}
                  placeholder="e.g., 1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Change Summary</Label>
                <Input
                  value={newVersionSummary}
                  onChange={(e) => setNewVersionSummary(e.target.value)}
                  placeholder="Brief description of changes"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Strategy Code</Label>
              <Textarea
                value={newVersionCode}
                onChange={(e) => setNewVersionCode(e.target.value)}
                placeholder="Paste strategy code here..."
                className="font-mono text-sm h-48"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={newVersionNotes}
                onChange={(e) => setNewVersionNotes(e.target.value)}
                placeholder="Additional notes about this version..."
                className="h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewVersion(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVersion} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Version Dialog */}
      <Dialog open={!!viewVersion} onOpenChange={() => setViewVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewVersion && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Version {viewVersion.version}
                </DialogTitle>
                <DialogDescription>
                  Saved on {new Date(viewVersion.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="code">
                <TabsList>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="results">
                    Linked Results ({(versionResults[viewVersion.id] || []).length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="code" className="space-y-4">
                  {viewVersion.change_summary && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Change Summary</p>
                      <p className="text-sm text-muted-foreground">{viewVersion.change_summary}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Code</Label>
                    <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto text-sm font-mono max-h-[400px] overflow-y-auto">
                      {viewVersion.code || 'No code saved'}
                    </pre>
                  </div>

                  {viewVersion.notes && (
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <p className="text-sm text-muted-foreground">{viewVersion.notes}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="results">
                  {(versionResults[viewVersion.id] || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No results linked to this version</p>
                      <p className="text-sm">Results are linked when saving with a version selected</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(versionResults[viewVersion.id] || []).map((result) => (
                        <div 
                          key={result.id}
                          className="p-3 rounded-lg border flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">{result.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(result.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              'font-mono font-semibold',
                              result.netProfit >= 0 ? 'text-profit' : 'text-loss'
                            )}>
                              {result.netProfit >= 0 ? '+' : ''}₹{result.netProfit.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.winRate.toFixed(1)}% • PF {result.profitFactor.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog with Diff Highlighting */}
      <Dialog open={!!compareVersions} onOpenChange={() => setCompareVersions(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {compareVersions && diffResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-primary" />
                  Compare Versions
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4">
                  <span>v{compareVersions[0].version} → v{compareVersions[1].version}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-profit gap-1">
                      <PlusIcon className="h-3 w-3" />
                      {diffResult.stats.added} added
                    </Badge>
                    <Badge variant="outline" className="text-loss gap-1">
                      <Minus className="h-3 w-3" />
                      {diffResult.stats.removed} removed
                    </Badge>
                  </span>
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="diff" className="flex-1 overflow-hidden flex flex-col">
                <TabsList>
                  <TabsTrigger value="diff">Code Diff</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="diff" className="flex-1 overflow-hidden">
                  <div className="grid grid-cols-2 gap-2 h-full">
                    {/* Left (Old) */}
                    <div className="border rounded-lg overflow-hidden flex flex-col">
                      <div className="p-2 bg-muted/50 border-b flex items-center justify-between">
                        <Badge variant="secondary">v{compareVersions[0].version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(compareVersions[0].created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="p-1">
                          {diffResult.left.map((line, i) => (
                            <DiffLineDisplay key={i} line={line} side="left" />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {/* Right (New) */}
                    <div className="border rounded-lg overflow-hidden flex flex-col">
                      <div className="p-2 bg-muted/50 border-b flex items-center justify-between">
                        <Badge>v{compareVersions[1].version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(compareVersions[1].created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="p-1">
                          {diffResult.right.map((line, i) => (
                            <DiffLineDisplay key={i} line={line} side="right" />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="performance" className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 gap-4">
                    {compareVersions.map((version, idx) => {
                      const stats = getVersionStats(version.id);
                      const results = versionResults[version.id] || [];
                      
                      return (
                        <div key={version.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge variant={idx === 0 ? 'secondary' : 'default'}>
                              v{version.version}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {results.length} result{results.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {stats ? (
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-2 bg-muted/30 rounded-lg">
                                <div className={cn(
                                  'text-lg font-bold font-mono',
                                  stats.totalProfit >= 0 ? 'text-profit' : 'text-loss'
                                )}>
                                  ₹{stats.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-muted-foreground">Total Profit</div>
                              </div>
                              <div className="text-center p-2 bg-muted/30 rounded-lg">
                                <div className="text-lg font-bold font-mono">
                                  {stats.avgWinRate.toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground">Avg Win Rate</div>
                              </div>
                              <div className="text-center p-2 bg-muted/30 rounded-lg">
                                <div className="text-lg font-bold font-mono">
                                  {stats.avgPF.toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">Avg PF</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No results linked
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this version. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDeleteVersion(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
