/**
 * Manual Tag Editor — inline tag editing for trade detail view
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  readonly?: boolean;
}

const TAG_COLORS = [
  'bg-chart-1/20 text-chart-1 border-chart-1/30',
  'bg-chart-2/20 text-chart-2 border-chart-2/30',
  'bg-chart-3/20 text-chart-3 border-chart-3/30',
  'bg-chart-4/20 text-chart-4 border-chart-4/30',
  'bg-chart-5/20 text-chart-5 border-chart-5/30',
];

function tagColor(tag: string) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function TagEditor({ tags, onChange, className, readonly = false }: TagEditorProps) {
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);

  const addTag = () => {
    const t = input.trim();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === 'Escape') { setEditing(false); setInput(''); }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <Badge
            key={tag}
            variant="outline"
            className={cn("text-[10px] gap-1", tagColor(tag))}
          >
            {tag}
            {!readonly && (
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeTag(tag)}
              />
            )}
          </Badge>
        ))}
        {tags.length === 0 && !editing && (
          <span className="text-xs text-muted-foreground">No tags</span>
        )}
      </div>
      {!readonly && (
        editing ? (
          <div className="flex gap-1.5">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type tag + Enter"
              className="h-7 text-xs"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
              Done
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] text-muted-foreground gap-1"
            onClick={() => setEditing(true)}
          >
            <Plus className="h-3 w-3" /> Add Tag
          </Button>
        )
      )}
    </div>
  );
}
