/**
 * Pinned & Recents Navigation Component
 * Compact sidebar section for pinned favorites and recent pages
 */

import { GripVertical, X, Pin, Settings2, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { cn } from '@/lib/utils';
import { getPageLabel, getPageIcon, DEFAULT_PINNED_PAGES } from '@/lib/navigationConfig';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface PinnedRecentsProps {
  collapsed?: boolean;
  className?: string;
}

export function PinnedRecents({ collapsed, className }: PinnedRecentsProps) {
  const { favorites, removeFavorite, addFavorite, clearFavorites, reorderFavorites } = useFavoritePages();
  const location = useLocation();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  
  // Set default pins on first load
  useEffect(() => {
    if (favorites.length === 0) {
      const storedFavorites = localStorage.getItem('mmc-favorite-pages');
      if (!storedFavorites) {
        DEFAULT_PINNED_PAGES.forEach(path => addFavorite(path));
      }
    }
  }, [favorites.length, addFavorite]);

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;
    
    const newFavorites = [...favorites];
    const [draggedItem] = newFavorites.splice(draggingIndex, 1);
    newFavorites.splice(index, 0, draggedItem);
    reorderFavorites(newFavorites);
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
  };

  // Collapsed mode - show icons only
  if (collapsed) {
    return (
      <div className={cn("space-y-1 px-1", className)}>
        {favorites.slice(0, 5).map((path) => {
          const isActive = location.pathname === path;
          const label = getPageLabel(path);
          
          return (
            <Tooltip key={path}>
              <TooltipTrigger asChild>
                <Link
                  to={path}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-warning/15 text-warning'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <Pin className="h-2.5 w-2.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <div className="flex items-center gap-1.5">
                  <Pin className="h-2 w-2 text-warning" />
                  <span>{label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  if (favorites.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Pinned Section */}
      {favorites.length > 0 && (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Pin className="h-2.5 w-2.5 text-warning/70" />
              <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                Pinned
              </span>
            </div>
            
            {/* Manage Pins Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 opacity-60 hover:opacity-100"
                >
                  <Settings2 className="h-2.5 w-2.5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 sm:w-80">
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <Pin className="h-3.5 w-3.5 text-warning" />
                    Manage Pins
                  </SheetTitle>
                </SheetHeader>
                
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Drag to reorder. Max 5 pins allowed.
                  </p>
                  
                  {/* Draggable List */}
                  <div className="space-y-1">
                    {favorites.map((path, index) => {
                      const label = getPageLabel(path);
                      return (
                        <div
                          key={path}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/30 cursor-grab active:cursor-grabbing transition-all",
                            draggingIndex === index && "opacity-50 scale-95"
                          )}
                        >
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="flex-1 text-sm font-medium truncate">{label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => removeFavorite(path)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Clear All */}
                  {favorites.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={clearFavorites}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Clear All Pins
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          {favorites.slice(0, 5).map((path) => {
            const isActive = location.pathname === path;
            const label = getPageLabel(path);
            const PageIcon = getPageIcon(path);
            
            return (
              <div
                key={path}
                className={cn(
                  "group flex items-center rounded-md transition-all duration-200",
                  isActive 
                    ? "bg-warning/10 text-warning" 
                    : "hover:bg-muted/50"
                )}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 cursor-grab ml-1 shrink-0" />
                <Link
                  to={path}
                  className="flex-1 flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium truncate"
                >
                  {PageIcon && <PageIcon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-warning" : "text-muted-foreground/60")} />}
                  <span className="truncate">{label}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1 shrink-0"
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
      )}
      
      {/* Separator */}
      <div className="h-px bg-border/40 mx-2" />
    </div>
  );
}

/**
 * Pin Toggle Button - For pinning pages from nav items
 */
interface PinToggleProps {
  path: string;
  className?: string;
  showOnHover?: boolean;
}

export function PinToggle({ path, className, showOnHover }: PinToggleProps) {
  const { isFavorite, toggleFavorite, favorites } = useFavoritePages();
  const isPinned = isFavorite(path);
  const canPin = favorites.length < 5 || isPinned;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 shrink-0",
            showOnHover && "opacity-0 group-hover:opacity-100",
            className
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (canPin) toggleFavorite(path);
          }}
          disabled={!canPin}
        >
          <Pin 
            className={cn(
              "h-2.5 w-2.5 transition-colors",
              isPinned ? "text-warning" : "text-muted-foreground/50"
            )} 
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={4}>
        {isPinned ? 'Unpin' : canPin ? 'Pin to sidebar' : 'Max 5 pins'}
      </TooltipContent>
    </Tooltip>
  );
}
