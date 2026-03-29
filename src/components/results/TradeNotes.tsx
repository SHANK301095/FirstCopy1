/**
 * Trade Notes - P0 Results
 * Add notes to specific trades
 */

import { useState, useEffect } from 'react';
import { MessageSquare, X, Save, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'mmc-trade-notes';

interface TradeNotesProps {
  tradeId: string;
  className?: string;
  compact?: boolean;
}

export function TradeNotes({ tradeId, className, compact = false }: TradeNotesProps) {
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load note from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const notes = JSON.parse(stored);
        setNote(notes[tradeId] || '');
      }
    } catch {
      // Ignore
    }
  }, [tradeId]);

  const handleSave = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const notes = stored ? JSON.parse(stored) : {};
      
      if (note.trim()) {
        notes[tradeId] = note.trim();
      } else {
        delete notes[tradeId];
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setIsEditing(false);
    } catch {
      // Ignore
    }
  };

  const handleDelete = () => {
    setNote('');
    handleSave();
  };

  const hasNote = note.trim().length > 0;

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0",
              hasNote && "text-primary",
              className
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover border-border" align="end">
          <NoteEditor
            note={note}
            setNote={setNote}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={handleSave}
            onDelete={handleDelete}
            hasNote={hasNote}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <NoteEditor
        note={note}
        setNote={setNote}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onSave={handleSave}
        onDelete={handleDelete}
        hasNote={hasNote}
      />
    </div>
  );
}

function NoteEditor({
  note,
  setNote,
  isEditing,
  setIsEditing,
  onSave,
  onDelete,
  hasNote,
}: {
  note: string;
  setNote: (v: string) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
  hasNote: boolean;
}) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this trade..."
          className="text-xs min-h-[60px] resize-none"
          autoFocus
        />
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-6"
            onClick={onSave}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (hasNote) {
    return (
      <div className="space-y-2">
        <div className="p-2 rounded bg-muted/50 text-xs text-foreground/80 whitespace-pre-wrap">
          {note}
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-loss"
            onClick={onDelete}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-full justify-start text-xs text-muted-foreground"
      onClick={() => setIsEditing(true)}
    >
      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
      Add note...
    </Button>
  );
}

/**
 * Bulk load all trade notes (for export)
 */
export function getAllTradeNotes(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}
