/**
 * Activity Timeline - P0 Dashboard
 * Filterable activity timeline with comparison toggles
 */

import { useState, useMemo } from 'react';
import { 
  Activity, 
  FileText, 
  Database, 
  Play, 
  BarChart3, 
  FolderKanban,
  Filter,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow, format, isThisWeek, isThisMonth, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  type: 'strategy' | 'dataset' | 'run' | 'result' | 'project';
  name: string;
  action: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
}

const TYPE_CONFIGS = {
  strategy: { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  dataset: { icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  run: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  result: { icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  project: { icon: FolderKanban, color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

type FilterType = 'strategy' | 'dataset' | 'run' | 'result' | 'project';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

export function ActivityTimeline({ activities, loading, maxItems = 10 }: ActivityTimelineProps) {
  const [typeFilters, setTypeFilters] = useState<Set<FilterType>>(new Set(['strategy', 'dataset', 'run', 'result', 'project']));
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const filteredActivities = useMemo(() => {
    return activities
      .filter(item => typeFilters.has(item.type))
      .filter(item => {
        if (timeFilter === 'all') return true;
        const date = new Date(item.timestamp);
        const now = new Date();
        if (timeFilter === 'today') return format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
        if (timeFilter === 'week') return isThisWeek(date);
        if (timeFilter === 'month') return isThisMonth(date);
        return true;
      })
      .slice(0, maxItems);
  }, [activities, typeFilters, timeFilter, maxItems]);

  const toggleTypeFilter = (type: FilterType) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-md bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
              <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Type
              {typeFilters.size < 5 && (
                <Badge variant="secondary" className="ml-1 h-4 text-[10px]">
                  {typeFilters.size}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover border-border">
            <DropdownMenuLabel className="text-xs">Activity Types</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['strategy', 'dataset', 'run', 'result', 'project'] as FilterType[]).map(type => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={typeFilters.has(type)}
                onCheckedChange={() => toggleTypeFilter(type)}
                className="text-xs capitalize"
              >
                {type}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex gap-1">
          {(['all', 'today', 'week', 'month'] as TimeFilter[]).map(filter => (
            <Button
              key={filter}
              variant={timeFilter === filter ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setTimeFilter(filter)}
            >
              {filter === 'all' ? 'All' : filter === 'today' ? 'Today' : filter === 'week' ? 'Week' : 'Month'}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {filteredActivities.length > 0 ? (
        <div className="space-y-0.5">
          {filteredActivities.map((item) => {
            const config = TYPE_CONFIGS[item.type];
            const Icon = config.icon;
            return (
              <div 
                key={`${item.type}-${item.id}`} 
                className="data-row-hover group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn("p-1.5 rounded-md border border-border/30", config.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{item.action}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                  {item.timestamp && formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No activity found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
