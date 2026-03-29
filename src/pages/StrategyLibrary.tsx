/**
 * Strategy Library Page
 * Create/save/load strategies with versioning
 * Spec: Screen C - Strategy Library
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Tag, 
  Clock, 
  Copy, 
  Trash2,
  Code,
  ChevronRight,
  Save,
  Share2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { db, Strategy, StrategyVersion } from '@/db/index';
import { ShareStrategyDialog } from '@/components/strategy/ShareStrategyDialog';
import { PageTitle } from '@/components/ui/PageTitle';
import { StrategySkeleton } from '@/components/skeletons/PageSkeletons';
import { StaggeredList, StaggeredItem } from '@/components/ui/StaggeredList';

const CODE_TYPES = [
  { value: 'mql5', label: 'MQL5' },
  { value: 'yaml', label: 'YAML DSL' },
  { value: 'javascript', label: 'JavaScript' },
];

export default function StrategyLibrary() {
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [versions, setVersions] = useState<Record<string, StrategyVersion[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New strategy form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newCodeType, setNewCodeType] = useState<'mql5' | 'yaml' | 'javascript'>('mql5');
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const strats = await db.strategies.orderBy('updatedAt').reverse().toArray();
      setStrategies(strats);
      
      // Load versions for each strategy
      const versionsMap: Record<string, StrategyVersion[]> = {};
      for (const strat of strats) {
        const vers = await db.strategyVersions
          .where('strategyId')
          .equals(strat.id)
          .reverse()
          .sortBy('version');
        versionsMap[strat.id] = vers;
      }
      setVersions(versionsMap);
    } finally {
      setLoading(false);
    }
  };

  const createStrategy = async () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const strategyId = uuidv4();
    const versionId = uuidv4();
    const now = Date.now();

    const strategy: Strategy = {
      id: strategyId,
      name: newName.trim(),
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      description: newDescription.trim(),
      createdAt: now,
      updatedAt: now,
      currentVersionId: versionId,
    };

    const version: StrategyVersion = {
      id: versionId,
      strategyId,
      version: 1,
      description: 'Initial version',
      inputsSchema: {},
      codeOrDSL: newCode,
      codeType: newCodeType,
      params: {},
      createdAt: now,
    };

    await db.strategies.put(strategy);
    await db.strategyVersions.put(version);
    await db.log('info', 'Strategy created', { strategyId, name: newName });

    setStrategies(prev => [strategy, ...prev]);
    setVersions(prev => ({ ...prev, [strategyId]: [version] }));
    
    setCreateDialogOpen(false);
    setNewName('');
    setNewDescription('');
    setNewTags('');
    setNewCode('');
    
    toast({ title: 'Created', description: `Strategy "${newName}" created` });
  };

  const cloneStrategy = async (strategy: Strategy) => {
    const strategyId = uuidv4();
    const versionId = uuidv4();
    const now = Date.now();

    const originalVersions = versions[strategy.id] || [];
    const latestVersion = originalVersions[0];

    const newStrategy: Strategy = {
      id: strategyId,
      name: `${strategy.name} (Copy)`,
      tags: Array.isArray(strategy.tags) ? [...strategy.tags] : [],
      description: strategy.description,
      createdAt: now,
      updatedAt: now,
      currentVersionId: versionId,
    };

    const newVersion: StrategyVersion = {
      id: versionId,
      strategyId,
      version: 1,
      description: 'Cloned from ' + strategy.name,
      inputsSchema: latestVersion?.inputsSchema || {},
      codeOrDSL: latestVersion?.codeOrDSL || '',
      codeType: latestVersion?.codeType || 'mql5',
      params: latestVersion?.params || {},
      createdAt: now,
    };

    await db.strategies.put(newStrategy);
    await db.strategyVersions.put(newVersion);

    setStrategies(prev => [newStrategy, ...prev]);
    setVersions(prev => ({ ...prev, [strategyId]: [newVersion] }));

    toast({ title: 'Cloned', description: `Strategy cloned as "${newStrategy.name}"` });
  };

  const deleteStrategy = async (id: string) => {
    await db.strategyVersions.where('strategyId').equals(id).delete();
    await db.strategies.delete(id);
    setStrategies(prev => prev.filter(s => s.id !== id));
    if (selectedStrategy?.id === id) setSelectedStrategy(null);
    toast({ title: 'Deleted', description: 'Strategy removed' });
  };

  // Get all unique tags
  const allTags = [...new Set(strategies.flatMap(s => s.tags))];

  const filteredStrategies = strategies.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !tagFilter || s.tags.includes(tagFilter);
    return matchesSearch && matchesTag;
  });
  // Show skeleton while loading
  if (loading) {
    return <StrategySkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Strategy Library" 
          subtitle="Manage and version your trading strategies"
        />
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Strategy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My Strategy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="trend, momentum, mean-reversion"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your strategy..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Code Type</Label>
                <Select value={newCodeType} onValueChange={(v) => setNewCodeType(v as 'mql5' | 'yaml' | 'javascript')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Strategy Code / DSL</Label>
                <Textarea
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="// Paste your strategy code here..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createStrategy}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Strategy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Strategies List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search strategies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge
                    variant={tagFilter === null ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setTagFilter(null)}
                  >
                    All
                  </Badge>
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={tagFilter === tag ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredStrategies.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground px-4">
                    <div className="p-4 rounded-2xl bg-muted/40 w-fit mx-auto mb-4">
                      <BookOpen className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="font-medium text-sm">No strategies yet</p>
                    <p className="text-xs mt-1 text-muted-foreground/60">Create your first strategy to get started</p>
                  </div>
                ) : (
                  <StaggeredList className="divide-y divide-border">
                    {filteredStrategies.map((strategy) => (
                      <StaggeredItem key={strategy.id}>
                        <button
                          onClick={() => setSelectedStrategy(strategy)}
                          className={cn(
                            "w-full text-left p-3.5 hover:bg-muted/40 transition-all duration-200 rounded-lg mx-1",
                            selectedStrategy?.id === strategy.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{strategy.name}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(strategy.updatedAt).toLocaleDateString()}
                            </span>
                            <span>v{(versions[strategy.id]?.[0]?.version || 1)}</span>
                          </div>
                          {Array.isArray(strategy.tags) && strategy.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {strategy.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-[10px] py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </button>
                      </StaggeredItem>
                    ))}
                  </StaggeredList>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Strategy Detail */}
        <div className="lg:col-span-2">
          {selectedStrategy ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    {selectedStrategy.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <ShareStrategyDialog 
                      strategy={selectedStrategy} 
                      version={versions[selectedStrategy.id]?.[0]}
                    />
                    <Button variant="outline" size="sm" onClick={() => cloneStrategy(selectedStrategy)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Clone
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-loss hover:text-loss"
                      onClick={() => deleteStrategy(selectedStrategy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {selectedStrategy.description && (
                  <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {(selectedStrategy.tags || []).map(tag => (
                    <Badge key={tag} variant="outline">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {versions[selectedStrategy.id]?.[0] && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Version {versions[selectedStrategy.id][0].version}
                      </span>
                      <Badge variant="outline">
                        {versions[selectedStrategy.id][0].codeType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="bg-muted/30 rounded-xl border border-border/30 p-4 font-mono text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-foreground/80">
                        {versions[selectedStrategy.id][0].codeOrDSL || '// No code yet'}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center border-dashed">
              <CardContent className="text-center py-16">
                <div className="p-4 rounded-2xl bg-muted/40 w-fit mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground opacity-40" />
                </div>
                <p className="font-medium text-sm text-muted-foreground">Select a strategy to view details</p>
                <p className="text-xs mt-1 text-muted-foreground/50">Click on any strategy from the list</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
