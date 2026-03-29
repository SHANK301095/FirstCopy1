/**
 * Marketplace Moderation Component
 * Review pending strategies, approve/reject, manage featured strategies
 */

import { useState, useEffect } from 'react';
import {
  ShoppingBag, CheckCircle, XCircle, Flag, Star, Eye,
  Loader2, AlertTriangle, Search, Filter, MoreHorizontal,
  ThumbsUp, ThumbsDown, StarOff
} from 'lucide-react';
import { secureLogger } from '@/lib/secureLogger';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MarketplaceStrategy {
  id: string;
  title: string;
  description: string | null;
  author_id: string;
  category: string;
  visibility: string;
  is_verified: boolean | null;
  is_featured: boolean | null;
  is_free: boolean | null;
  price: number | null;
  download_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ReviewDialog {
  open: boolean;
  strategy: MarketplaceStrategy | null;
  action: 'approve' | 'reject' | 'feature' | 'unfeature' | 'flag' | null;
}

export function MarketplaceModeration() {
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<MarketplaceStrategy[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'featured'>('all');
  const [reviewDialog, setReviewDialog] = useState<ReviewDialog>({ open: false, strategy: null, action: null });
  const [reviewNote, setReviewNote] = useState('');
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; strategy: MarketplaceStrategy | null }>({ open: false, strategy: null });

  const loadStrategies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_strategies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (err) {
      secureLogger.error('admin', 'Error loading marketplace strategies', { error: String(err) });
      toast.error('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const handleAction = async () => {
    if (!reviewDialog.strategy || !reviewDialog.action) return;

    try {
      const updates: Partial<MarketplaceStrategy> = { updated_at: new Date().toISOString() };
      
      switch (reviewDialog.action) {
        case 'approve':
          updates.is_verified = true;
          updates.visibility = 'public';
          break;
        case 'reject':
          updates.is_verified = false;
          updates.visibility = 'private';
          break;
        case 'feature':
          updates.is_featured = true;
          break;
        case 'unfeature':
          updates.is_featured = false;
          break;
        case 'flag':
          updates.visibility = 'flagged';
          break;
      }

      const { error } = await supabase
        .from('marketplace_strategies')
        .update(updates)
        .eq('id', reviewDialog.strategy.id);

      if (error) throw error;

      toast.success(`Strategy ${reviewDialog.action}ed successfully`);
      loadStrategies();
    } catch (err) {
      secureLogger.error('admin', 'Marketplace moderation action failed', { action: reviewDialog.action, error: String(err) });
      toast.error('Action failed');
    } finally {
      setReviewDialog({ open: false, strategy: null, action: null });
      setReviewNote('');
    }
  };

  const filteredStrategies = strategies.filter(s => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!s.title.toLowerCase().includes(query) && !s.description?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Status filter
    if (filterStatus === 'pending' && s.is_verified !== null) return false;
    if (filterStatus === 'verified' && !s.is_verified) return false;
    if (filterStatus === 'featured' && !s.is_featured) return false;
    
    return true;
  });

  const stats = {
    total: strategies.length,
    pending: strategies.filter(s => s.is_verified === null).length,
    verified: strategies.filter(s => s.is_verified).length,
    featured: strategies.filter(s => s.is_featured).length,
    flagged: strategies.filter(s => s.visibility === 'flagged').length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading marketplace strategies...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Marketplace Moderation
          </CardTitle>
          <CardDescription>
            Review and moderate community-submitted strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <div className="p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="p-3 rounded-lg border text-center bg-yellow-500/10">
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="p-3 rounded-lg border text-center bg-green-500/10">
              <div className="text-2xl font-bold text-green-500">{stats.verified}</div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
            <div className="p-3 rounded-lg border text-center bg-primary/10">
              <div className="text-2xl font-bold text-primary">{stats.featured}</div>
              <div className="text-xs text-muted-foreground">Featured</div>
            </div>
            <div className="p-3 rounded-lg border text-center bg-red-500/10">
              <div className="text-2xl font-bold text-red-500">{stats.flagged}</div>
              <div className="text-xs text-muted-foreground">Flagged</div>
            </div>
          </div>

          <Separator />

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search strategies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadStrategies}>
              Refresh
            </Button>
          </div>

          {/* Strategies List */}
          <ScrollArea className="h-[500px]">
            {filteredStrategies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No strategies found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStrategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      strategy.visibility === 'flagged' && "border-red-500/30 bg-red-500/5",
                      strategy.is_featured && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{strategy.title[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{strategy.title}</span>
                            {strategy.is_verified && (
                              <Badge variant="default" className="bg-green-500/10 text-green-500 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {strategy.is_featured && (
                              <Badge variant="default" className="bg-primary/10 text-primary text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            {strategy.visibility === 'flagged' && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Flagged
                              </Badge>
                            )}
                            {strategy.is_verified === null && (
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {strategy.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{strategy.category}</span>
                            <span>•</span>
                            <span>{strategy.is_free ? 'Free' : `₹${strategy.price}`}</span>
                            <span>•</span>
                            <span>{strategy.download_count || 0} downloads</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              {strategy.rating_avg?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewDialog({ open: true, strategy })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!strategy.is_verified && (
                              <DropdownMenuItem onClick={() => setReviewDialog({ open: true, strategy, action: 'approve' })}>
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {strategy.is_verified && (
                              <DropdownMenuItem onClick={() => setReviewDialog({ open: true, strategy, action: 'reject' })}>
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Revoke Verification
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!strategy.is_featured ? (
                              <DropdownMenuItem onClick={() => setReviewDialog({ open: true, strategy, action: 'feature' })}>
                                <Star className="h-4 w-4 mr-2" />
                                Feature
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setReviewDialog({ open: true, strategy, action: 'unfeature' })}>
                                <StarOff className="h-4 w-4 mr-2" />
                                Remove from Featured
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-500"
                              onClick={() => setReviewDialog({ open: true, strategy, action: 'flag' })}
                            >
                              <Flag className="h-4 w-4 mr-2" />
                              Flag for Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog 
        open={reviewDialog.open} 
        onOpenChange={(open) => setReviewDialog({ ...reviewDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewDialog.action === 'approve' && 'Approve Strategy'}
              {reviewDialog.action === 'reject' && 'Revoke Verification'}
              {reviewDialog.action === 'feature' && 'Feature Strategy'}
              {reviewDialog.action === 'unfeature' && 'Remove from Featured'}
              {reviewDialog.action === 'flag' && 'Flag Strategy'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewDialog.action === 'approve' && 'This will verify the strategy and make it public.'}
              {reviewDialog.action === 'reject' && 'This will revoke verification and hide the strategy.'}
              {reviewDialog.action === 'feature' && 'This will feature the strategy on the marketplace homepage.'}
              {reviewDialog.action === 'unfeature' && 'This will remove the strategy from featured listings.'}
              {reviewDialog.action === 'flag' && 'This will flag the strategy for content review.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Add a note (optional)"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ ...previewDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewDialog.strategy?.title}</DialogTitle>
            <DialogDescription>{previewDialog.strategy?.category}</DialogDescription>
          </DialogHeader>
          {previewDialog.strategy && (
            <div className="space-y-4">
              <p>{previewDialog.strategy.description || 'No description provided'}</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded border">
                  <div className="text-muted-foreground">Price</div>
                  <div className="font-semibold">
                    {previewDialog.strategy.is_free ? 'Free' : `₹${previewDialog.strategy.price}`}
                  </div>
                </div>
                <div className="p-2 rounded border">
                  <div className="text-muted-foreground">Downloads</div>
                  <div className="font-semibold">{previewDialog.strategy.download_count || 0}</div>
                </div>
                <div className="p-2 rounded border">
                  <div className="text-muted-foreground">Rating</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    {previewDialog.strategy.rating_avg?.toFixed(1) || 'N/A'}
                    ({previewDialog.strategy.rating_count || 0})
                  </div>
                </div>
                <div className="p-2 rounded border">
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-semibold">
                    {format(new Date(previewDialog.strategy.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              
              {previewDialog.strategy.tags && previewDialog.strategy.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {previewDialog.strategy.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog({ open: false, strategy: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
