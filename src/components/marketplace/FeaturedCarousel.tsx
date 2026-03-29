/**
 * Featured Strategies Carousel
 * Horizontal scrolling showcase of top strategies
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Award, Star, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FeaturedStrategy {
  id: string;
  title: string;
  description: string | null;
  category: string;
  rating_avg: number;
  download_count: number;
  author_name?: string;
  is_verified: boolean;
}

interface FeaturedCarouselProps {
  strategies: FeaturedStrategy[];
  onSelect: (id: string) => void;
}

export function FeaturedCarousel({ strategies, onSelect }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    
    // Calculate active index
    const cardWidth = 400;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, strategies.length - 1));
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [strategies.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = 400;
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (strategies.length === 0) return null;

  return (
    <div className="relative group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Featured Strategies</h2>
            <p className="text-sm text-muted-foreground">Hand-picked by our team</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {strategies.map((strategy, index) => (
          <Card
            key={strategy.id}
            variant="glass"
            className={cn(
              "flex-shrink-0 w-[380px] snap-start cursor-pointer transition-all duration-300",
              "hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]",
              "bg-gradient-to-br from-card via-card to-primary/5",
              index === activeIndex && "ring-2 ring-primary/30"
            )}
            onClick={() => onSelect(strategy.id)}
          >
            {/* Gradient Header */}
            <div className="h-28 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.3),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.3),transparent_50%)]" />
              
              <Badge className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured
              </Badge>
              
              {strategy.is_verified && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0">
                  <Award className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              
              {/* Category badge */}
              <Badge 
                variant="secondary" 
                className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm"
              >
                {strategy.category}
              </Badge>
            </div>
            
            {/* Content */}
            <div className="p-5">
              <h3 className="text-lg font-semibold mb-2 line-clamp-1">{strategy.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">
                {strategy.description || 'No description provided'}
              </p>
              
              {/* Stats Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{strategy.rating_avg.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">{strategy.download_count}</span>
                  </div>
                </div>
                
                <Button size="sm" variant="default" className="gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-1.5 mt-2">
        {strategies.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === activeIndex 
                ? "w-6 bg-primary" 
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: index * 400, behavior: 'smooth' });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
