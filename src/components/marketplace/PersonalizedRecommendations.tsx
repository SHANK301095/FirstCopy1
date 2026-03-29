/**
 * Personalized Recommendations
 * AI-like recommendations based on user's activity
 */

import { Sparkles, Star, Download, Heart, ArrowRight, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecommendedStrategy {
  id: string;
  title: string;
  category: string;
  rating_avg: number;
  download_count: number;
  reason: string;
}

interface PersonalizedRecommendationsProps {
  strategies: RecommendedStrategy[];
  onSelect: (id: string) => void;
  userName?: string;
}

export function PersonalizedRecommendations({ strategies, onSelect, userName }: PersonalizedRecommendationsProps) {
  if (strategies.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">For You</h2>
            <p className="text-sm text-muted-foreground">Personalized recommendations</p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground mb-4">
            Download or favorite some strategies to get personalized recommendations!
          </p>
          <Button variant="outline">
            Explore Strategies
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {userName ? `For ${userName}` : 'Recommended For You'}
            </h2>
            <p className="text-sm text-muted-foreground">Based on your activity</p>
          </div>
        </div>
        
        <Button variant="ghost" size="sm">
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategies.slice(0, 4).map((strategy) => (
          <Card
            key={strategy.id}
            variant="glass"
            className={cn(
              "p-4 cursor-pointer transition-all duration-200",
              "hover:border-violet-500/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
            )}
            onClick={() => onSelect(strategy.id)}
          >
            {/* Reason Badge */}
            <Badge 
              variant="secondary" 
              className="mb-3 bg-violet-500/10 text-violet-400 border-violet-500/20"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {strategy.reason}
            </Badge>
            
            <h3 className="font-semibold mb-1 line-clamp-1">{strategy.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{strategy.category}</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-medium">{strategy.rating_avg.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-xs">{strategy.download_count}</span>
                </div>
              </div>
              
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
