/**
 * Dataset Tag System - P0 Data Manager
 * Basic tagging for datasets
 */

import { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatasetTagsProps {
  datasetId: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
  className?: string;
  compact?: boolean;
}

const TAG_COLORS: Record<string, string> = {
  forex: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  crypto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  stocks: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  indices: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  commodities: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  clean: 'bg-profit/20 text-profit border-profit/30',
  test: 'bg-muted text-muted-foreground border-border',
  production: 'bg-primary/20 text-primary border-primary/30',
};

export function DatasetTags({
  datasetId,
  tags,
  onTagsChange,
  availableTags = ['forex', 'crypto', 'stocks', 'indices', 'commodities', 'clean', 'test', 'production'],
  className,
  compact = false,
}: DatasetTagsProps) {
  const [newTag, setNewTag] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onTagsChange([...tags, normalizedTag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  const getTagColor = (tag: string) => {
    return TAG_COLORS[tag] || 'bg-muted text-muted-foreground border-border';
  };

  if (compact && tags.length === 0) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            <Tag className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover border-border" align="start">
          <TagEditor
            tags={tags}
            availableTags={availableTags}
            newTag={newTag}
            setNewTag={setNewTag}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            getTagColor={getTagColor}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {tags.map(tag => (
        <Badge
          key={tag}
          variant="outline"
          className={cn("text-[10px] h-5 gap-1 pr-1", getTagColor(tag))}
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="hover:text-foreground transition-colors ml-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover border-border" align="start">
          <TagEditor
            tags={tags}
            availableTags={availableTags}
            newTag={newTag}
            setNewTag={setNewTag}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            getTagColor={getTagColor}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TagEditor({
  tags,
  availableTags,
  newTag,
  setNewTag,
  onAddTag,
  onRemoveTag,
  getTagColor,
}: {
  tags: string[];
  availableTags: string[];
  newTag: string;
  setNewTag: (v: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  getTagColor: (tag: string) => string;
}) {
  const unusedTags = availableTags.filter(t => !tags.includes(t));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="New tag..."
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onAddTag(newTag);
            }
          }}
          className="h-7 text-xs"
        />
        <Button
          size="sm"
          className="h-7"
          onClick={() => onAddTag(newTag)}
          disabled={!newTag.trim()}
        >
          Add
        </Button>
      </div>
      
      {unusedTags.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Suggestions</p>
          <div className="flex flex-wrap gap-1">
            {unusedTags.slice(0, 6).map(tag => (
              <button
                key={tag}
                onClick={() => onAddTag(tag)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] border transition-opacity hover:opacity-80",
                  getTagColor(tag)
                )}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
