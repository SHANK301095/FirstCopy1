/**
 * Favorite Pages List - P1 Navigation
 * Pinned favorites in sidebar
 */

import { Star, GripVertical, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { cn } from '@/lib/utils';

// Page label mapping
const PAGE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/workflow': 'Workflow',
  '/data': 'Data Manager',
  '/strategies': 'Strategies',
  '/saved-results': 'Saved Results',
  '/analytics': 'Analytics',
  '/optimizer': 'Optimizer',
  '/scanner': 'Scanner',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/sentinel': 'Sentinel AI',
};

interface FavoritePagesListProps {
  className?: string;
  compact?: boolean;
}

export function FavoritePagesList({ className, compact }: FavoritePagesListProps) {
  const { favorites, removeFavorite } = useFavoritePages();
  const location = useLocation();

  if (favorites.length === 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5 px-2 py-1">
        <Star className="h-3 w-3 text-warning fill-warning" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Favorites
        </span>
      </div>
      
      {favorites.map((path) => {
        const isActive = location.pathname === path;
        const label = PAGE_LABELS[path] || path;
        
        return (
          <div
            key={path}
            className={cn(
              "group flex items-center gap-1 rounded-md transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-muted/50"
            )}
          >
            {!compact && (
              <GripVertical className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 cursor-grab ml-1" />
            )}
            <Link
              to={path}
              className={cn(
                "flex-1 px-2 py-1.5 text-sm truncate",
                compact && "px-3"
              )}
            >
              {label}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1"
              onClick={(e) => {
                e.preventDefault();
                removeFavorite(path);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Favorite Toggle Button - For individual pages
 */
interface FavoriteToggleProps {
  path: string;
  className?: string;
}

export function FavoriteToggle({ path, className }: FavoriteToggleProps) {
  const { isFavorite, toggleFavorite } = useFavoritePages();
  const isFav = isFavorite(path);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={() => toggleFavorite(path)}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star 
        className={cn(
          "h-4 w-4 transition-colors",
          isFav ? "text-warning fill-warning" : "text-muted-foreground"
        )} 
      />
    </Button>
  );
}
