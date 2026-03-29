/**
 * Trending Categories Grid
 * Visual category selection with stats
 */

import { 
  TrendingUp, 
  Activity, 
  Target, 
  Zap, 
  BarChart3, 
  ArrowUpRight,
  LineChart,
  Shuffle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CategoryStats {
  category: string;
  count: number;
  trending: boolean;
}

interface TrendingCategoriesProps {
  categories: CategoryStats[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

const categoryIcons: Record<string, typeof TrendingUp> = {
  'trend-following': TrendingUp,
  'mean-reversion': Shuffle,
  'breakout': Zap,
  'scalping': Activity,
  'swing-trading': LineChart,
  'momentum': ArrowUpRight,
  'arbitrage': BarChart3,
  'general': Target,
};

const categoryColors: Record<string, string> = {
  'trend-following': 'from-green-500/20 to-emerald-500/20 text-green-500',
  'mean-reversion': 'from-blue-500/20 to-cyan-500/20 text-blue-500',
  'breakout': 'from-orange-500/20 to-amber-500/20 text-orange-500',
  'scalping': 'from-purple-500/20 to-violet-500/20 text-purple-500',
  'swing-trading': 'from-pink-500/20 to-rose-500/20 text-pink-500',
  'momentum': 'from-red-500/20 to-orange-500/20 text-red-500',
  'arbitrage': 'from-teal-500/20 to-cyan-500/20 text-teal-500',
  'general': 'from-gray-500/20 to-slate-500/20 text-gray-500',
};

const categoryLabels: Record<string, string> = {
  'trend-following': 'Trend Following',
  'mean-reversion': 'Mean Reversion',
  'breakout': 'Breakout',
  'scalping': 'Scalping',
  'swing-trading': 'Swing Trading',
  'momentum': 'Momentum',
  'arbitrage': 'Arbitrage',
  'general': 'General',
};

export function TrendingCategories({ categories, selectedCategory, onSelect }: TrendingCategoriesProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Browse by Category</h2>
          <p className="text-sm text-muted-foreground">Find strategies that match your style</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* All Categories */}
        <Card
          variant="glass"
          className={cn(
            "p-4 cursor-pointer transition-all duration-200 text-center",
            "hover:border-primary/30 hover:shadow-md",
            selectedCategory === 'all' && "border-primary bg-primary/5 ring-1 ring-primary/30"
          )}
          onClick={() => onSelect('all')}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-accent/20"
          )}>
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">All</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categories.reduce((sum, c) => sum + c.count, 0)}
          </p>
        </Card>

        {/* Category Cards */}
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.category] || Target;
          const colorClass = categoryColors[cat.category] || categoryColors.general;
          const label = categoryLabels[cat.category] || cat.category;
          const isSelected = selectedCategory === cat.category;

          return (
            <Card
              key={cat.category}
              variant="glass"
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 text-center relative overflow-hidden",
                "hover:border-primary/30 hover:shadow-md",
                isSelected && "border-primary bg-primary/5 ring-1 ring-primary/30"
              )}
              onClick={() => onSelect(cat.category)}
            >
              {cat.trending && (
                <Badge 
                  className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0 bg-red-500 text-white border-0"
                >
                  HOT
                </Badge>
              )}
              
              <div className={cn(
                "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center",
                "bg-gradient-to-br",
                colorClass
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium truncate">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.count}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
