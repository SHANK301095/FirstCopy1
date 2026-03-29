/**
 * Strategy Marketplace — Trusted ecosystem with verification, transparency, and creator profiles
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Search, Star, Download, Heart, TrendingUp, Filter, Grid3X3, List,
  Sparkles, Award, Clock, User, ChevronRight, ExternalLink, Check,
  Plus, Store, Package, BarChart3, Scale, Shield, AlertTriangle,
  ThumbsDown, Eye, Copy, BadgeCheck, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PageErrorBoundary } from '@/components/error';
import { PageTitle } from '@/components/ui/PageTitle';
import { format } from 'date-fns';

// ── Types ──
interface MarketplaceStrategy {
  id: string;
  strategy_id: string | null;
  author_id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  price: number;
  is_free: boolean;
  is_featured: boolean;
  is_verified: boolean;
  download_count: number;
  rating_avg: number;
  rating_count: number;
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
  is_downloaded?: boolean;
}

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'trend-following', label: 'Trend Following' },
  { value: 'mean-reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'scalping', label: 'Scalping' },
  { value: 'swing-trading', label: 'Swing Trading' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'general', label: 'General' },
];

// ── Strategy Card ──
function StrategyCard({
  strategy: s,
  onView,
  onFavorite,
  onCompare,
  isInCompare,
}: {
  strategy: MarketplaceStrategy;
  onView: (s: MarketplaceStrategy) => void;
  onFavorite: (id: string) => void;
  onCompare: (s: MarketplaceStrategy) => void;
  isInCompare: boolean;
}) {
  return (
    <Card className="group hover:border-primary/30 transition-all cursor-pointer" onClick={() => onView(s)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-sm font-semibold truncate">{s.title}</h3>
              {s.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{s.description || 'No description'}</p>
          </div>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 shrink-0"
            onClick={e => { e.stopPropagation(); onFavorite(s.id); }}
          >
            <Heart className={cn("h-3.5 w-3.5", s.is_favorited && "fill-red-400 text-red-400")} />
          </Button>
        </div>

        {/* Verification & Transparency Badges */}
        <div className="flex flex-wrap gap-1">
          {s.is_verified && (
            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Shield className="h-2.5 w-2.5 mr-0.5" /> Verified
            </Badge>
          )}
          {s.rating_count >= 10 && (
            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {s.rating_count}+ reviews
            </Badge>
          )}
          {s.download_count >= 50 && (
            <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-400 border-violet-500/30">
              Popular
            </Badge>
          )}
          <Badge variant="outline" className="text-[9px]">{s.category}</Badge>
        </div>

        {/* Transparency Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-1.5 rounded bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Rating</div>
            <div className="text-xs font-bold flex items-center justify-center gap-0.5">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> {s.rating_avg.toFixed(1)}
            </div>
          </div>
          <div className="p-1.5 rounded bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Downloads</div>
            <div className="text-xs font-bold">{s.download_count}</div>
          </div>
          <div className="p-1.5 rounded bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Reviews</div>
            <div className="text-xs font-bold">{s.rating_count}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className={cn("text-sm font-bold", s.is_free ? "text-emerald-400" : "text-foreground")}>
            {s.is_free ? 'Free' : `$${s.price}`}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline" size="sm" className="h-7 text-[10px]"
              onClick={e => { e.stopPropagation(); onCompare(s); }}
            >
              <Scale className={cn("h-3 w-3 mr-1", isInCompare && "text-primary")} />
              {isInCompare ? 'In Compare' : 'Compare'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Strategy Detail Modal ──
function StrategyDetail({
  strategy: s,
  open,
  onOpenChange,
  onDownload,
}: {
  strategy: MarketplaceStrategy | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDownload: (s: MarketplaceStrategy) => void;
}) {
  if (!s) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {s.title}
            {s.is_verified && <BadgeCheck className="h-4 w-4 text-blue-400" />}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Creator Trust Profile */}
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Strategy Creator</div>
                  <div className="text-[10px] text-muted-foreground">Published {format(new Date(s.created_at), 'MMM yyyy')}</div>
                </div>
                {s.is_verified && (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px]">
                    <Shield className="h-3 w-3 mr-1" /> Verified Creator
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Description</h4>
            <p className="text-sm text-foreground/80">{s.description || 'No description provided.'}</p>
          </div>

          {/* Sample Size & DD Transparency */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-muted/20">
              <CardContent className="p-3 text-center">
                <Info className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-[10px] text-muted-foreground">Sample Size</div>
                <div className="text-sm font-bold">{s.rating_count > 0 ? `${s.rating_count} reviews` : 'Not enough data'}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {s.rating_count < 5 ? '⚠️ Low sample — use with caution' : '✅ Sufficient reviews'}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardContent className="p-3 text-center">
                <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-[10px] text-muted-foreground">Downloads</div>
                <div className="text-sm font-bold">{s.download_count}</div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {s.download_count < 10 ? 'New strategy' : 'Battle-tested'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Where This Fails / Not For You If */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Where This May Fail</span>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li>• Ranging/sideways markets (if trend-based)</li>
                  <li>• High-impact news events</li>
                  <li>• Low-liquidity sessions</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400">Not For You If</span>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li>• You can't handle 5+ loss streak</li>
                  <li>• You need daily profits</li>
                  <li>• Account size below recommended</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => { onDownload(s); onOpenChange(false); }}>
              <Download className="h-4 w-4 mr-1.5" /> {s.is_free ? 'Clone to Workspace' : `Buy — $${s.price}`}
            </Button>
            <Button variant="outline">
              <Copy className="h-4 w-4 mr-1.5" /> Clone
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Compare Mode ──
function ComparePanel({
  strategies,
  open,
  onOpenChange,
  onRemove,
}: {
  strategies: MarketplaceStrategy[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRemove: (id: string) => void;
}) {
  if (!open || strategies.length < 2) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Compare ({strategies.length})</h3>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${strategies.length}, 1fr)` }}>
          {strategies.map(s => (
            <div key={s.id} className="space-y-2 text-center">
              <div className="text-xs font-semibold truncate">{s.title}</div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Rating</div>
                <div className="text-sm font-bold">{s.rating_avg.toFixed(1)} ⭐</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Downloads</div>
                <div className="text-sm font-bold">{s.download_count}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Price</div>
                <div className="text-sm font-bold">{s.is_free ? 'Free' : `$${s.price}`}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground">Verified</div>
                <div className="text-sm">{s.is_verified ? '✅' : '❌'}</div>
              </div>
              <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => onRemove(s.id)}>Remove</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ──
function MarketplaceContent() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<MarketplaceStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedStrategy, setSelectedStrategy] = useState<MarketplaceStrategy | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [compareList, setCompareList] = useState<MarketplaceStrategy[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, [category, sortBy, user]);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      let query = supabase.from('marketplace_strategies').select('*');
      if (category !== 'all') query = query.eq('category', category);
      query = query.eq('visibility', 'public');

      switch (sortBy) {
        case 'popular': query = query.order('download_count', { ascending: false }); break;
        case 'rating': query = query.order('rating_avg', { ascending: false }); break;
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        case 'price-low': query = query.order('price', { ascending: true }); break;
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      let favorites: string[] = [];
      let downloads: string[] = [];
      if (user) {
        const [favResult, dlResult] = await Promise.all([
          supabase.from('strategy_favorites').select('marketplace_strategy_id').eq('user_id', user.id),
          supabase.from('strategy_downloads').select('marketplace_strategy_id').eq('user_id', user.id)
        ]);
        favorites = favResult.data?.map(f => f.marketplace_strategy_id) || [];
        downloads = dlResult.data?.map(d => d.marketplace_strategy_id) || [];
      }

      setStrategies((data || []).map(s => ({
        ...s,
        tags: s.tags || [],
        is_favorited: favorites.includes(s.id),
        is_downloaded: downloads.includes(s.id),
      })) as MarketplaceStrategy[]);
    } catch (err: any) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (id: string) => {
    if (!user) { toast.error('Sign in to favorite'); return; }
    const s = strategies.find(x => x.id === id);
    if (!s) return;
    if (s.is_favorited) {
      await supabase.from('strategy_favorites').delete().eq('marketplace_strategy_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('strategy_favorites').insert({ marketplace_strategy_id: id, user_id: user.id });
    }
    setStrategies(prev => prev.map(x => x.id === id ? { ...x, is_favorited: !x.is_favorited } : x));
  };

  const handleDownload = async (strategy: MarketplaceStrategy) => {
    if (!user) { toast.error('Sign in to download'); return; }
    await supabase.from('strategy_downloads').insert({ marketplace_strategy_id: strategy.id, user_id: user.id });
    toast.success(`${strategy.title} cloned to your workspace!`);
    fetchStrategies();
  };

  const toggleCompare = (s: MarketplaceStrategy) => {
    setCompareList(prev => {
      const exists = prev.find(x => x.id === s.id);
      if (exists) return prev.filter(x => x.id !== s.id);
      if (prev.length >= 4) { toast.error('Max 4 strategies in compare'); return prev; }
      const newList = [...prev, s];
      if (newList.length >= 2) setCompareOpen(true);
      return newList;
    });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return strategies;
    const q = search.toLowerCase();
    return strategies.filter(s => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.category.includes(q));
  }, [strategies, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Strategy Marketplace" subtitle="Verified strategies with full transparency" />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search strategies..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-low">Price: Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compare Panel */}
      <ComparePanel strategies={compareList} open={compareOpen} onOpenChange={setCompareOpen} onRemove={id => setCompareList(p => p.filter(x => x.id !== id))} />

      {/* Grid */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading marketplace...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <Store className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Strategies Found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {search ? 'Try a different search term' : 'No strategies published yet. Be the first!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(s => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onView={s => { setSelectedStrategy(s); setDetailOpen(true); }}
              onFavorite={handleFavorite}
              onCompare={toggleCompare}
              isInCompare={!!compareList.find(x => x.id === s.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <StrategyDetail strategy={selectedStrategy} open={detailOpen} onOpenChange={setDetailOpen} onDownload={handleDownload} />
    </div>
  );
}

export default function StrategyMarketplace() {
  return (
    <PageErrorBoundary pageName="Marketplace">
      <MarketplaceContent />
    </PageErrorBoundary>
  );
}
