/**
 * Seller Dashboard
 * Publisher tools for managing strategies on the marketplace
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Package,
  TrendingUp,
  Download,
  Star,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Upload,
  CheckCircle,
  Clock,
  BarChart3,
  Users,
  ArrowUpRight,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { db, Strategy } from '@/db/index';
import { secureLogger } from '@/lib/secureLogger';

interface PublishedStrategy {
  id: string;
  title: string;
  description: string | null;
  category: string;
  visibility: string;
  download_count: number;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface SellerStats {
  totalStrategies: number;
  totalDownloads: number;
  averageRating: number;
  totalRatings: number;
}

const categories = [
  { value: 'trend-following', label: 'Trend Following' },
  { value: 'mean-reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'scalping', label: 'Scalping' },
  { value: 'swing-trading', label: 'Swing Trading' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'arbitrage', label: 'Arbitrage' },
  { value: 'general', label: 'General' },
];

export function SellerDashboard() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<PublishedStrategy[]>([]);
  const [localStrategies, setLocalStrategies] = useState<Strategy[]>([]);
  const [stats, setStats] = useState<SellerStats>({
    totalStrategies: 0,
    totalDownloads: 0,
    averageRating: 0,
    totalRatings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedLocalStrategy, setSelectedLocalStrategy] = useState<string>('');
  const [publishForm, setPublishForm] = useState({
    title: '',
    description: '',
    category: 'general',
  });

  useEffect(() => {
    if (user) {
      fetchPublishedStrategies();
      fetchLocalStrategies();
    }
  }, [user]);

  const fetchPublishedStrategies = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('marketplace_strategies')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const published = (data || []) as PublishedStrategy[];
      setStrategies(published);

      // Calculate stats
      const totalDownloads = published.reduce((sum, s) => sum + s.download_count, 0);
      const totalRatings = published.reduce((sum, s) => sum + s.rating_count, 0);
      const weightedRating = published.reduce((sum, s) => sum + (s.rating_avg * s.rating_count), 0);
      
      setStats({
        totalStrategies: published.length,
        totalDownloads,
        averageRating: totalRatings > 0 ? weightedRating / totalRatings : 0,
        totalRatings,
      });
    } catch (error) {
      secureLogger.error('system', 'Failed to fetch published strategies', { error: String(error) });
      toast.error('Failed to load your strategies');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalStrategies = async () => {
    try {
      const all = await db.strategies.toArray();
      setLocalStrategies(all);
    } catch (error) {
      secureLogger.error('system', 'Failed to fetch local strategies', { error: String(error) });
    }
  };

  const handlePublish = async () => {
    if (!user || !selectedLocalStrategy) {
      toast.error('Please select a strategy to publish');
      return;
    }

    try {
      const localStrategy = localStrategies.find(s => s.id === selectedLocalStrategy);
      if (!localStrategy) throw new Error('Strategy not found');

      // Get strategy version with code
      const version = localStrategy.currentVersionId 
        ? await db.strategyVersions.get(localStrategy.currentVersionId)
        : null;

      const { error } = await supabase
        .from('marketplace_strategies')
        .insert({
          author_id: user.id,
          strategy_id: localStrategy.id,
          title: publishForm.title || localStrategy.name,
          description: publishForm.description || localStrategy.description || null,
          category: publishForm.category,
          visibility: 'public',
          is_free: true,
        });

      if (error) throw error;

      toast.success('Strategy published to marketplace!');
      setPublishDialogOpen(false);
      setPublishForm({ title: '', description: '', category: 'general' });
      setSelectedLocalStrategy('');
      fetchPublishedStrategies();
      
      secureLogger.info('strategy', 'Strategy published to marketplace', { 
        strategyId: localStrategy.id,
        title: publishForm.title || localStrategy.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish strategy';
      toast.error(message);
      secureLogger.error('strategy', 'Failed to publish strategy', { error: String(error) });
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_strategies')
        .delete()
        .eq('id', id)
        .eq('author_id', user?.id);

      if (error) throw error;

      toast.success('Strategy removed from marketplace');
      fetchPublishedStrategies();
    } catch (error) {
      toast.error('Failed to remove strategy');
    }
  };

  const handleUpdateVisibility = async (id: string, visibility: 'public' | 'private') => {
    try {
      const { error } = await supabase
        .from('marketplace_strategies')
        .update({ visibility })
        .eq('id', id)
        .eq('author_id', user?.id);

      if (error) throw error;

      toast.success(`Strategy ${visibility === 'public' ? 'published' : 'hidden'}`);
      fetchPublishedStrategies();
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    trend,
    format = 'number'
  }: { 
    label: string; 
    value: number; 
    icon: typeof TrendingUp; 
    trend?: number;
    format?: 'number' | 'decimal';
  }) => (
    <Card variant="glass">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {trend !== undefined && trend > 0 && (
            <Badge variant="secondary" className="bg-success/10 text-success border-0">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              {trend}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold mt-3">
          {format === 'decimal' ? value.toFixed(1) : value.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Publisher Dashboard</h2>
          <p className="text-muted-foreground">Manage your strategies on the marketplace</p>
        </div>
        <Button onClick={() => setPublishDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Publish Strategy
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Published Strategies" 
          value={stats.totalStrategies} 
          icon={Package}
        />
        <StatCard 
          label="Total Downloads" 
          value={stats.totalDownloads} 
          icon={Download}
        />
        <StatCard 
          label="Average Rating" 
          value={stats.averageRating} 
          icon={Star}
          format="decimal"
        />
        <StatCard 
          label="Total Reviews" 
          value={stats.totalRatings} 
          icon={Users}
        />
      </div>

      {/* Strategies Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-2">No strategies published yet</h3>
              <p className="text-muted-foreground mb-4">
                Share your trading strategies with the community
              </p>
              <Button onClick={() => setPublishDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Publish Your First Strategy
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategies.map((strategy) => (
                  <TableRow key={strategy.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{strategy.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {strategy.description || 'No description'}
                          </p>
                        </div>
                        {strategy.is_verified && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                            <Award className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{strategy.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {strategy.visibility === 'public' ? (
                        <Badge className="bg-success/10 text-success border-success/30">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {strategy.download_count}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span>{strategy.rating_avg.toFixed(1)}</span>
                        <span className="text-muted-foreground">({strategy.rating_count})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {strategy.visibility === 'public' ? (
                            <DropdownMenuItem onClick={() => handleUpdateVisibility(strategy.id, 'private')}>
                              <Clock className="h-4 w-4 mr-2" />
                              Make Private
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUpdateVisibility(strategy.id, 'public')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Make Public
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleUnpublish(strategy.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to Marketplace</DialogTitle>
            <DialogDescription>
              Share your strategy with the trading community
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Strategy</Label>
              <Select value={selectedLocalStrategy} onValueChange={(v) => {
                setSelectedLocalStrategy(v);
                const strategy = localStrategies.find(s => s.id === v);
                if (strategy) {
                  setPublishForm(prev => ({
                    ...prev,
                    title: strategy.name,
                    description: strategy.description || '',
                  }));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a strategy" />
                </SelectTrigger>
                <SelectContent>
                  {localStrategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title</Label>
              <Input
                value={publishForm.title}
                onChange={(e) => setPublishForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Strategy name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={publishForm.description}
                onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your strategy..."
                rows={3}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select 
                value={publishForm.category} 
                onValueChange={(v) => setPublishForm(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={!selectedLocalStrategy}>
              <Upload className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
