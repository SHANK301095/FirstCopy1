/**
 * Favorite/Bookmark Button Component
 * Quick toggle for starring runs, strategies, etc.
 */

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFavoritesStore, Favorite } from '@/lib/favoritesStore';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  id: string;
  type: Favorite['type'];
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function FavoriteButton({ 
  id, 
  type, 
  name, 
  size = 'md',
  showLabel = false,
  className 
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorite(id);
  
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };
  
  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(id, type, name);
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={cn(
              sizeClasses[size],
              'transition-all duration-200',
              favorited && 'text-yellow-500 hover:text-yellow-600',
              !favorited && 'text-muted-foreground hover:text-yellow-500',
              className
            )}
          >
            <Star
              size={iconSizes[size]}
              className={cn(
                'transition-transform duration-200',
                favorited && 'fill-yellow-500 scale-110',
                'hover:scale-125'
              )}
            />
            {showLabel && (
              <span className="ml-1 text-sm">
                {favorited ? 'Favorited' : 'Favorite'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{favorited ? 'Remove from favorites' : 'Add to favorites'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FavoriteButton;
