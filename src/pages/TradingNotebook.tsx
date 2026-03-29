/**
 * Trading Notebook - Notion-like notes with Supabase persistence
 * Auto-save, realtime sync, category colors, keyboard shortcuts
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Search, BookOpen, FileText, Clock, Pin, PinOff, CloudOff, Check, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageTitle } from '@/components/ui/PageTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['General', 'Strategy Notes', 'Market Analysis', 'Rules & Checklists', 'Lessons', 'Resources'];

const CATEGORY_COLORS: Record<string, string> = {
  'General': 'border-l-muted-foreground/40',
  'Strategy Notes': 'border-l-blue-500',
  'Market Analysis': 'border-l-purple-500',
  'Rules & Checklists': 'border-l-orange-500',
  'Lessons': 'border-l-emerald-500',
  'Resources': 'border-l-yellow-500',
};

const CATEGORY_DOT: Record<string, string> = {
  'General': 'bg-muted-foreground/40',
  'Strategy Notes': 'bg-blue-500',
  'Market Analysis': 'bg-purple-500',
  'Rules & Checklists': 'bg-orange-500',
  'Lessons': 'bg-emerald-500',
  'Resources': 'bg-yellow-500',
};

export default function TradingNotebook() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNoteRef = useRef<Note | null>(null);

  // Keep ref in sync for debounce closure
  useEffect(() => { selectedNoteRef.current = selectedNote; }, [selectedNote]);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notebook_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const typed = (data || []) as unknown as Note[];
      setNotes(typed);
      return typed;
    } catch (err: any) {
      toast.error('Failed to load notes', { description: err.message });
      return [];
    }
  }, [user]);

  // Initial load + migration check
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchNotes().then((loaded) => {
      setLoading(false);
      // Check localStorage migration
      const saved = localStorage.getItem('trading-notebook');
      const migDismissed = localStorage.getItem('notebook-migration-dismissed');
      if (saved && !migDismissed) {
        try {
          const local = JSON.parse(saved);
          if (Array.isArray(local) && local.length > 0 && (!loaded || loaded.length === 0)) {
            setMigrationCount(local.length);
            setShowMigrationBanner(true);
          } else if (loaded && loaded.length > 0) {
            localStorage.removeItem('trading-notebook');
          }
        } catch { /* ignore */ }
      }
    });
  }, [user, fetchNotes]);

  // Realtime sync across tabs
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('notebook-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notebook_notes',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotes]);

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedNoteRef.current) {
          saveNote(selectedNoteRef.current.id, editTitle, editContent, editCategory);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editTitle, editContent, editCategory]);

  const handleMigration = async () => {
    if (!user) return;
    const saved = localStorage.getItem('trading-notebook');
    if (!saved) return;
    try {
      const local = JSON.parse(saved) as Array<{ title: string; content: string; category: string; tags: string[]; pinned: boolean }>;
      const rows = local.map(n => ({
        user_id: user.id,
        title: n.title || 'Untitled',
        content: n.content || '',
        category: n.category || 'General',
        tags: n.tags || [],
        pinned: n.pinned || false,
      }));
      const { error } = await supabase.from('notebook_notes').insert(rows as any);
      if (!error) {
        localStorage.removeItem('trading-notebook');
        setShowMigrationBanner(false);
        toast.success(`Imported ${rows.length} notes to cloud ☁️`);
        fetchNotes();
      }
    } catch { toast.error('Migration failed'); }
  };

  const dismissMigration = () => {
    localStorage.setItem('notebook-migration-dismissed', 'true');
    setShowMigrationBanner(false);
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
    setSaveStatus('idle');
  };

  const createNote = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notebook_notes')
        .insert({ user_id: user.id, title: 'Untitled Note', content: '', category: 'General' } as any)
        .select()
        .single();
      if (error) throw error;
      const note = data as unknown as Note;
      setNotes(prev => [note, ...prev]);
      selectNote(note);
    } catch (err: any) {
      toast.error('Failed to create note', { description: err.message });
    }
  };

  const saveNote = async (id: string, title: string, content: string, category: string) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('notebook_notes')
        .update({ title: title || 'Untitled', content, category } as any)
        .eq('id', id);
      if (error) throw error;
      setNotes(prev => prev.map(n =>
        n.id === id ? { ...n, title: title || 'Untitled', content, category, updated_at: new Date().toISOString() } : n
      ));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  };

  // Debounced auto-save on content/title/category change
  const triggerAutoSave = useCallback((title: string, content: string, category: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const note = selectedNoteRef.current;
      if (note) saveNote(note.id, title, content, category);
    }, 2000);
  }, []);

  const handleTitleChange = (v: string) => {
    setEditTitle(v);
    triggerAutoSave(v, editContent, editCategory);
  };
  const handleContentChange = (v: string) => {
    setEditContent(v);
    triggerAutoSave(editTitle, v, editCategory);
  };
  const handleCategoryChange = (v: string) => {
    setEditCategory(v);
    triggerAutoSave(editTitle, editContent, v);
  };

  const togglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    await supabase.from('notebook_notes').update({ pinned: newPinned } as any).eq('id', id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: newPinned } : n));
    if (selectedNote?.id === id) setSelectedNote(prev => prev ? { ...prev, pinned: newPinned } : prev);
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notebook_notes').delete().eq('id', id);
      if (error) throw error;
      const updated = notes.filter(n => n.id !== id);
      setNotes(updated);
      if (selectedNote?.id === id) {
        if (updated[0]) selectNote(updated[0]); else setSelectedNote(null);
      }
      toast.success('Note deleted');
    } catch (err: any) {
      toast.error('Failed to delete', { description: err.message });
    }
  };

  const filtered = notes.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.category.toLowerCase().includes(q);
  });

  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Migration Banner */}
      {showMigrationBanner && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CloudOff className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Found {migrationCount} notes saved locally</p>
              <p className="text-xs text-muted-foreground">Import them to cloud so they sync across all devices.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleMigration}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Notes
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissMigration}>Dismiss</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle title="Trading Notebook" subtitle="Your personal trading knowledge base — synced to cloud" />
        <Button size="sm" onClick={createNote}><Plus className="h-4 w-4 mr-1.5" /> New Note</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
        {/* Sidebar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-1 pr-2">
              {filtered.length === 0 && notes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">Your trading knowledge base starts here.</p>
                  <p className="text-xs mb-4">Document your strategies, rules, and lessons.</p>
                  <Button size="sm" onClick={createNote}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create First Note
                  </Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>No notes match "{searchQuery}"</p>
                </div>
              ) : (
                filtered.map(note => (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-colors border-l-[3px] border border-r-transparent border-t-transparent border-b-transparent group',
                      CATEGORY_COLORS[note.category] || 'border-l-muted-foreground/40',
                      selectedNote?.id === note.id ? 'bg-primary/10' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {note.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        <p className="text-sm font-medium line-clamp-1">{note.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={cn('h-2 w-2 rounded-full', CATEGORY_DOT[note.category] || 'bg-muted-foreground/40')} />
                        <span className="text-[9px] text-muted-foreground">{note.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{note.content || 'Empty note...'}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(note.updated_at), 'MMM d, HH:mm')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Editor */}
        {selectedNote ? (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Input
                  value={editTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                  placeholder="Note title..."
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePin(selectedNote.id)}>
                    {selectedNote.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <select
                    value={editCategory}
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="text-xs bg-muted/40 border border-border rounded-md px-2 py-1"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteNote(selectedNote.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Textarea
                value={editContent}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Start writing... Use this space for strategy notes, market observations, trading rules, checklists, and lessons learned."
                className="min-h-[500px] flex-1 border-none p-0 focus-visible:ring-0 resize-none bg-transparent text-sm leading-relaxed"
              />
              {/* Footer: word count + save status */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-3">
                <span className="text-[11px] text-muted-foreground">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && <><Check className="h-3 w-3 text-chart-2" /> Saved</>}
                  {saveStatus === 'idle' && <span className="text-muted-foreground/50">Auto-saves on pause</span>}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium mb-1">Select a note or create a new one</p>
              <p className="text-xs mb-4">Your trading knowledge base — synced across devices</p>
              <Button size="sm" variant="outline" onClick={createNote}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Note
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
