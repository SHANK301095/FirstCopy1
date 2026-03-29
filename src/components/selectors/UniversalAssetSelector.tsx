/**
 * UniversalAssetSelector
 * Dropdown-based selector for Datasets, Strategies, and Results
 * with categories: Public Library, My Assets, Workspace, Shared Datasets
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Globe, Lock, Users, Database, Plus, Search, 
  ChevronDown, Loader2, Copy, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  type DatasetEntity,
  type StrategyEntity,
  type ResultEntity,
  type VisibilityType,
  getMyDatasets,
  getPublicDatasets,
  getMyStrategies,
  getPublicStrategies,
  getMyResults,
  forkStrategy,
} from '@/lib/saasEntities';
import { getSharedDatasets, type SharedDataset } from '@/lib/sharedDataService';
import { useToast } from '@/hooks/use-toast';

// =====================================================
// TYPES
// =====================================================

export type AssetType = 'dataset' | 'strategy' | 'result';

export interface AssetOption {
  id: string;
  type: AssetType | 'shared';
  name: string;
  subtitle?: string;
  visibility: VisibilityType | 'shared';
  meta?: Record<string, unknown>;
  original?: DatasetEntity | StrategyEntity | ResultEntity | SharedDataset;
}

interface UniversalAssetSelectorProps {
  assetType: AssetType;
  value?: AssetOption | null;
  onSelect: (asset: AssetOption | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showSharedDatasets?: boolean; // For datasets, also show admin-managed shared datasets
  className?: string;
}

// =====================================================
// VISIBILITY ICONS
// =====================================================

const VisibilityIcon = ({ visibility }: { visibility: VisibilityType | 'shared' }) => {
  switch (visibility) {
    case 'public':
      return <Globe className="h-3.5 w-3.5 text-green-500" />;
    case 'private':
      return <Lock className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'workspace':
      return <Users className="h-3.5 w-3.5 text-blue-500" />;
    case 'shared':
      return <Database className="h-3.5 w-3.5 text-primary" />;
    default:
      return null;
  }
};

// =====================================================
// COMPONENT
// =====================================================

export function UniversalAssetSelector({
  assetType,
  value,
  onSelect,
  onCreateNew,
  placeholder,
  disabled = false,
  showSharedDatasets = true,
  className,
}: UniversalAssetSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [myAssets, setMyAssets] = useState<AssetOption[]>([]);
  const [publicAssets, setPublicAssets] = useState<AssetOption[]>([]);
  const [sharedDatasets, setSharedDatasets] = useState<AssetOption[]>([]);

  // Load assets on mount
  useEffect(() => {
    if (!user) return;
    loadAssets();
  }, [user, assetType]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      if (assetType === 'dataset') {
        const [mine, pub, shared] = await Promise.all([
          getMyDatasets(),
          getPublicDatasets(),
          showSharedDatasets ? getSharedDatasets() : Promise.resolve([]),
        ]);
        
        setMyAssets(mine.map(d => ({
          id: d.id,
          type: 'dataset' as AssetType,
          name: d.name,
          subtitle: `${d.symbol} • ${d.timeframe} • ${d.row_count?.toLocaleString() || 0} rows`,
          visibility: d.visibility,
          meta: { symbol: d.symbol, timeframe: d.timeframe, rowCount: d.row_count },
          original: d,
        })));
        
        setPublicAssets(pub.filter(p => !mine.some(m => m.id === p.id)).map(d => ({
          id: d.id,
          type: 'dataset' as AssetType,
          name: d.name,
          subtitle: `${d.symbol} • ${d.timeframe} • ${d.row_count?.toLocaleString() || 0} rows`,
          visibility: 'public',
          meta: { symbol: d.symbol, timeframe: d.timeframe, rowCount: d.row_count },
          original: d,
        })));
        
        setSharedDatasets(shared.map(s => ({
          id: s.id,
          type: 'shared',
          name: s.name,
          subtitle: `${s.symbol} • ${s.timeframe} • ${s.row_count?.toLocaleString() || 0} rows`,
          visibility: 'shared',
          meta: { symbol: s.symbol, timeframe: s.timeframe, rowCount: s.row_count },
          original: s,
        })));
        
      } else if (assetType === 'strategy') {
        const [mine, pub] = await Promise.all([
          getMyStrategies(),
          getPublicStrategies(),
        ]);
        
        setMyAssets(mine.map(s => ({
          id: s.id,
          type: 'strategy' as AssetType,
          name: s.name,
          subtitle: `${s.category} • v${s.version || '1.0'}`,
          visibility: s.visibility,
          meta: { category: s.category, version: s.version },
          original: s,
        })));
        
        setPublicAssets(pub.filter(p => !mine.some(m => m.id === p.id)).map(s => ({
          id: s.id,
          type: 'strategy' as AssetType,
          name: s.name,
          subtitle: `${s.category} • v${s.version || '1.0'} • ${s.usage_count} uses`,
          visibility: 'public',
          meta: { category: s.category, version: s.version, usageCount: s.usage_count },
          original: s,
        })));
        
      } else if (assetType === 'result') {
        const mine = await getMyResults();
        
        setMyAssets(mine.map(r => {
          const summary = r.summary_json as Record<string, unknown>;
          return {
            id: r.id,
            type: 'result' as AssetType,
            name: r.name || `Result ${r.id.slice(0, 8)}`,
            subtitle: `PF: ${summary?.profitFactor || 'N/A'} • Win: ${summary?.winRate || 'N/A'}%`,
            visibility: r.visibility,
            meta: summary,
            original: r,
          };
        }));
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search query
  const filteredAssets = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filter = (assets: AssetOption[]) => 
      assets.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.subtitle?.toLowerCase().includes(query)
      );
    
    return {
      my: filter(myAssets),
      public: filter(publicAssets),
      shared: filter(sharedDatasets),
    };
  }, [myAssets, publicAssets, sharedDatasets, searchQuery]);

  const totalCount = myAssets.length + publicAssets.length + sharedDatasets.length;

  // Handle fork action for public strategies
  const handleFork = async (asset: AssetOption) => {
    if (asset.type !== 'strategy') return;
    
    const forked = await forkStrategy(asset.id);
    if (forked) {
      toast({ title: 'Strategy Forked', description: `"${forked.name}" added to your library` });
      await loadAssets();
      onSelect({
        id: forked.id,
        type: 'strategy',
        name: forked.name,
        visibility: 'private',
        original: forked,
      });
    } else {
      toast({ title: 'Fork Failed', variant: 'destructive' });
    }
    setOpen(false);
  };

  // Asset type label
  const assetLabel = {
    dataset: 'Dataset',
    strategy: 'Strategy',
    result: 'Result',
  }[assetType];

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground p-3 border border-dashed rounded-lg">
        Login to access {assetLabel.toLowerCase()}s
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full justify-between',
            value && 'border-primary/50',
            className
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </span>
          ) : value ? (
            <span className="flex items-center gap-2 truncate">
              <VisibilityIcon visibility={value.visibility} />
              <span className="font-medium truncate">{value.name}</span>
              {value.subtitle && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  {value.subtitle}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || `Select ${assetLabel.toLowerCase()}...`}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[400px]" align="start">
        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${totalCount} ${assetLabel.toLowerCase()}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[320px]">
          {/* Create New Action */}
          {onCreateNew && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => { onCreateNew(); setOpen(false); }}>
                  <Plus className="h-4 w-4 mr-2 text-primary" />
                  <span className="font-medium text-primary">Create New {assetLabel}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Clear Selection */}
          {value && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => { onSelect(null); setOpen(false); }}>
                  <span className="text-muted-foreground">Clear selection</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* My Assets */}
          {filteredAssets.my.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                My {assetLabel}s ({filteredAssets.my.length})
              </DropdownMenuLabel>
              {filteredAssets.my.map((asset) => (
                <DropdownMenuItem
                  key={asset.id}
                  onClick={() => { onSelect(asset); setOpen(false); }}
                  className="flex flex-col items-start py-2"
                >
                  <span className="font-medium">{asset.name}</span>
                  {asset.subtitle && (
                    <span className="text-xs text-muted-foreground">{asset.subtitle}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
          
          {/* Shared Datasets (Admin-managed) */}
          {assetType === 'dataset' && filteredAssets.shared.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  Shared Datasets ({filteredAssets.shared.length})
                </DropdownMenuLabel>
                {filteredAssets.shared.map((asset) => (
                  <DropdownMenuItem
                    key={asset.id}
                    onClick={() => { onSelect(asset); setOpen(false); }}
                    className="flex flex-col items-start py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">shared</Badge>
                    </div>
                    {asset.subtitle && (
                      <span className="text-xs text-muted-foreground">{asset.subtitle}</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          
          {/* Public Assets */}
          {filteredAssets.public.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-green-500" />
                  Public Library ({filteredAssets.public.length})
                </DropdownMenuLabel>
                {filteredAssets.public.map((asset) => (
                  <DropdownMenuItem
                    key={asset.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div 
                      className="flex flex-col flex-1 cursor-pointer"
                      onClick={() => { onSelect(asset); setOpen(false); }}
                    >
                      <span className="font-medium">{asset.name}</span>
                      {asset.subtitle && (
                        <span className="text-xs text-muted-foreground">{asset.subtitle}</span>
                      )}
                    </div>
                    {assetType === 'strategy' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 ml-2"
                        onClick={(e) => { e.stopPropagation(); handleFork(asset); }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Fork
                      </Button>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          
          {/* Empty State */}
          {totalCount === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {assetLabel.toLowerCase()}s available</p>
              {onCreateNew && (
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => { onCreateNew(); setOpen(false); }}
                >
                  Create your first {assetLabel.toLowerCase()}
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UniversalAssetSelector;
