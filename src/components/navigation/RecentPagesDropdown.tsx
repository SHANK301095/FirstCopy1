/**
 * Recent Pages Dropdown - P0 UX
 * Quick access to recently visited pages
 */

import { Link } from 'react-router-dom';
import { History, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRecentPages } from '@/hooks/useRecentPages';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function RecentPagesDropdown() {
  const { recentPages, clearRecent } = useRecentPages();

  if (recentPages.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Recent pages"
        >
          <History className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Recent Pages
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              clearRecent();
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentPages.slice(0, 6).map((page, index) => (
          <DropdownMenuItem key={page.path} asChild>
            <Link 
              to={page.path}
              className={cn(
                "flex items-center justify-between w-full cursor-pointer",
                index === 0 && "bg-primary/5"
              )}
            >
              <span className="truncate">{page.title}</span>
              <span className="text-[10px] text-muted-foreground ml-2">
                {formatDistanceToNow(page.visitedAt, { addSuffix: false })}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
