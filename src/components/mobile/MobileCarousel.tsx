import { ReactNode, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  showIndicators?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function MobileCarousel<T>({ 
  items, 
  renderItem, 
  className,
  showIndicators = true,
  showArrows = false,
  autoPlay = false,
  autoPlayInterval = 4000,
}: MobileCarouselProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Handle scroll snap detection
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const itemWidth = container.offsetWidth;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveIndex(Math.min(newIndex, items.length - 1));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % items.length;
        scrollToIndex(next);
        return next;
      });
    }, autoPlayInterval);

    return () => clearInterval(intervalRef.current);
  }, [autoPlay, autoPlayInterval, items.length]);

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({
      left: index * container.offsetWidth,
      behavior: 'smooth',
    });
  };

  const goToPrev = () => {
    const newIndex = Math.max(0, activeIndex - 1);
    scrollToIndex(newIndex);
    setActiveIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = Math.min(items.length - 1, activeIndex + 1);
    scrollToIndex(newIndex);
    setActiveIndex(newIndex);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Carousel container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth touch-pan-x"
      >
        {items.map((item, index) => (
          <div 
            key={index}
            className="flex-shrink-0 w-full snap-center"
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {showArrows && items.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            disabled={activeIndex === 0}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 z-10',
              'w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50',
              'flex items-center justify-center',
              'transition-opacity duration-200',
              activeIndex === 0 ? 'opacity-30' : 'opacity-100'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            disabled={activeIndex === items.length - 1}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 z-10',
              'w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50',
              'flex items-center justify-center',
              'transition-opacity duration-200',
              activeIndex === items.length - 1 ? 'opacity-30' : 'opacity-100'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                scrollToIndex(index);
                setActiveIndex(index);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === activeIndex 
                  ? 'w-4 bg-primary' 
                  : 'w-1.5 bg-muted-foreground/30'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MobileTabsProps {
  tabs: { label: string; value: string; badge?: number }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MobileTabs({ tabs, value, onChange, className }: MobileTabsProps) {
  const activeIndex = tabs.findIndex(tab => tab.value === value);

  return (
    <div className={cn('relative', className)}>
      <div className="flex overflow-x-auto scrollbar-hide gap-1 p-1 bg-muted/50 rounded-xl">
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
              'whitespace-nowrap transition-all duration-200',
              'touch-manipulation active:scale-95',
              tab.value === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={cn(
                'min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[10px] font-bold',
                tab.value === value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              )}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface MobileSegmentedControlProps {
  segments: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MobileSegmentedControl({ segments, value, onChange, className }: MobileSegmentedControlProps) {
  const activeIndex = segments.findIndex(s => s.value === value);

  return (
    <div className={cn(
      'relative flex p-1 bg-muted/50 rounded-lg',
      className
    )}>
      {/* Active indicator */}
      <div 
        className="absolute top-1 bottom-1 bg-background rounded-md shadow-sm transition-all duration-200 ease-out"
        style={{
          left: `calc(${(100 / segments.length) * activeIndex}% + 4px)`,
          width: `calc(${100 / segments.length}% - 8px)`,
        }}
      />
      
      {segments.map((segment) => (
        <button
          key={segment.value}
          onClick={() => onChange(segment.value)}
          className={cn(
            'relative flex-1 py-1.5 text-sm font-medium text-center rounded-md',
            'transition-colors duration-200 touch-manipulation',
            segment.value === value
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}
