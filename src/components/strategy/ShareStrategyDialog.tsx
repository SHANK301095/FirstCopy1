/**
 * Share Strategy Dialog
 * Publish strategies to the marketplace from Strategy Library
 */

import { useState, useEffect } from 'react';
import { Share2, Globe, Tag, DollarSign, ImageIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Strategy, StrategyVersion } from '@/db/index';
import { secureLogger } from '@/lib/secureLogger';

const CATEGORIES = [
  { value: 'trend', label: 'Trend Following' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean-reversion', label: 'Mean Reversion' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'scalping', label: 'Scalping' },
  { value: 'swing', label: 'Swing Trading' },
  { value: 'arbitrage', label: 'Arbitrage' },
  { value: 'general', label: 'General' },
];

interface ShareStrategyDialogProps {
  strategy: Strategy;
  version?: StrategyVersion;
  trigger?: React.ReactNode;
}

export function ShareStrategyDialog({ strategy, version, trigger }: ShareStrategyDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('0');
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // Reset form when dialog opens or strategy changes
  useEffect(() => {
    if (open) {
      setTitle(strategy.name || '');
      setDescription(strategy.description || '');
      // Safely handle tags - ensure it's an array before joining
      const tagsArray = Array.isArray(strategy.tags) ? strategy.tags : [];
      setTags(tagsArray.join(', '));
      setCategory('general');
      setIsFree(true);
      setPrice('0');
      setPreviewImageUrl('');
    }
  }, [open, strategy]);

  const handleSubmit = async () => {
    // Validate
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    if (!description.trim()) {
      toast({ title: 'Error', description: 'Description is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({ 
          title: 'Authentication Required', 
          description: 'Please log in to share strategies', 
          variant: 'destructive' 
        });
        setIsSubmitting(false);
        return;
      }

      // First, sync strategy to Supabase strategies table if not already
      const { data: existingStrategy, error: checkError } = await supabase
        .from('strategies')
        .select('id')
        .eq('id', strategy.id)
        .maybeSingle();

      let strategyIdToUse = existingStrategy?.id;

      if (!existingStrategy) {
        // Create strategy in Supabase
        const { data: newStrategy, error: strategyError } = await supabase
          .from('strategies')
          .insert([{
            name: strategy.name,
            notes: strategy.description,
            code: version?.codeOrDSL || '',
            parameters: JSON.parse(JSON.stringify(version?.params || {})),
            user_id: user.id,
          }])
          .select('id')
          .single();

        if (strategyError || !newStrategy) {
          secureLogger.error('db', 'Strategy sync error', { error: strategyError?.message });
          throw new Error('Failed to sync strategy');
        }
        strategyIdToUse = newStrategy.id;
      }

      // Parse tags
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // Create marketplace listing
      const { error: marketplaceError } = await supabase
        .from('marketplace_strategies')
        .insert([{
          strategy_id: strategyIdToUse,
          author_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          tags: parsedTags,
          is_free: isFree,
          price: isFree ? 0 : parseFloat(price) || 0,
          preview_image_url: previewImageUrl.trim() || null,
        }]);

      if (marketplaceError) {
        if (marketplaceError.code === '23505') {
          toast({ 
            title: 'Already Shared', 
            description: 'This strategy is already on the marketplace', 
            variant: 'destructive' 
          });
        } else {
          throw marketplaceError;
        }
        setIsSubmitting(false);
        return;
      }

      toast({ 
        title: 'Strategy Shared!', 
        description: 'Your strategy is now live on the marketplace' 
      });
      
      setOpen(false);
    } catch (error) {
      secureLogger.error('db', 'Share strategy failed', { error: String(error) });
      toast({ 
        title: 'Share Failed', 
        description: 'Could not publish strategy. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Share to Marketplace
          </DialogTitle>
          <DialogDescription>
            Publish your strategy for the community to discover and use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Strategy"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your strategy does, its logic, and expected performance..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Tags
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="forex, gold, daily"
            />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          {/* Preview tags */}
          {tags.trim() && (
            <div className="flex flex-wrap gap-1">
              {tags.split(',').filter(t => t.trim()).slice(0, 5).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          )}

          {/* Preview Image */}
          <div className="space-y-2">
            <Label htmlFor="image" className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              Preview Image URL (optional)
            </Label>
            <Input
              id="image"
              type="url"
              value={previewImageUrl}
              onChange={(e) => setPreviewImageUrl(e.target.value)}
              placeholder="https://your-domain.com/strategy-preview.png"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use your own hosted image URL or leave empty for default
            </p>
          </div>

          {/* Pricing */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="free" className="flex items-center gap-2 cursor-pointer">
                <DollarSign className="h-4 w-4" />
                Free Strategy
              </Label>
              <Switch
                id="free"
                checked={isFree}
                onCheckedChange={setIsFree}
              />
            </div>
            
            {!isFree && (
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-7"
                    placeholder="9.99"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Publish to Marketplace
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
