/**
 * useJournalData — Extracted journal data management hook
 * Separates data fetching/mutations from UI
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTradesDB } from '@/hooks/useTradesDB';

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  pre_market_plan: string | null;
  post_market_review: string | null;
  summary: string | null;
  overall_mood: string | null;
  confidence: number | null;
  focus_level: number | null;
  goals: string | null;
  lessons: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export const MOOD_OPTIONS = ['Confident', 'Anxious', 'FOMO', 'Greedy', 'Patient', 'Frustrated', 'Calm', 'Impulsive', 'Disciplined'];
export const EMOTION_TAGS = ['😤 Frustrated', '😰 Anxious', '🤑 Greedy', '😌 Calm', '🔥 Focused', '😶 Numb', '💪 Disciplined', '😡 Revenge'];
export const SETUP_TAGS = ['Breakout', 'Pullback', 'Reversal', 'Range', 'Momentum', 'Gap Fill', 'News Play', 'Scalp', 'Swing'];
export const MISTAKE_TAGS = ['Overtrading', 'No Stop Loss', 'FOMO Entry', 'Moved SL', 'Too Large Size', 'Against Trend', 'No Plan', 'Revenge Trade'];

export type FilterMode = 'all' | 'wins' | 'losses' | 'emotion' | 'setup' | 'mistake';

export interface JournalFormData {
  date: string;
  pre_market_plan: string;
  post_market_review: string;
  summary: string;
  overall_mood: string;
  confidence: number;
  focus_level: number;
  goals: string;
  lessons: string;
  tags: string;
  emotion_tags: string[];
  setup_tags: string[];
  mistake_tags: string[];
  rules_followed: boolean;
  review_later: boolean;
}

const defaultFormData = (): JournalFormData => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  pre_market_plan: '', post_market_review: '', summary: '',
  overall_mood: '', confidence: 3, focus_level: 3,
  goals: '', lessons: '', tags: '',
  emotion_tags: [], setup_tags: [], mistake_tags: [],
  rules_followed: true, review_later: false,
});

export function useJournalData() {
  const { user } = useAuth();
  const { trades: allTrades } = useTradesDB();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [formData, setFormData] = useState<JournalFormData>(defaultFormData);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('date', { ascending: false });
      if (error) throw error;
      setEntries((data || []) as unknown as JournalEntry[]);
    } catch (err: any) {
      toast.error('Failed to load journal', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const createEntry = async () => {
    if (!user) return;
    try {
      const allTags = [
        ...(formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        ...formData.emotion_tags, ...formData.setup_tags, ...formData.mistake_tags,
        ...(formData.rules_followed ? ['✅ Rules Followed'] : ['❌ Rules Broken']),
        ...(formData.review_later ? ['📋 Review Later'] : []),
      ];
      const { error } = await supabase.from('journal_entries').insert({
        user_id: user.id, date: formData.date,
        pre_market_plan: formData.pre_market_plan || null,
        post_market_review: formData.post_market_review || null,
        summary: formData.summary || null,
        overall_mood: formData.overall_mood || null,
        confidence: formData.confidence, focus_level: formData.focus_level,
        goals: formData.goals || null, lessons: formData.lessons || null,
        tags: allTags.length > 0 ? allTags : null,
      } as any);
      if (error) throw error;
      toast.success('Journal entry saved 🎯');
      resetForm();
      fetchEntries();
      return true;
    } catch (err: any) {
      toast.error('Failed to save entry', { description: err.message });
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
      toast.success('Entry deleted');
      fetchEntries();
      return true;
    } catch (err: any) {
      toast.error('Failed to delete', { description: err.message });
      return false;
    }
  };

  const resetForm = () => setFormData(defaultFormData());

  const toggleTag = (tag: string, key: 'emotion_tags' | 'setup_tags' | 'mistake_tags') => {
    setFormData(p => ({
      ...p,
      [key]: p[key].includes(tag) ? p[key].filter(t => t !== tag) : [...p[key], tag],
    }));
  };

  /* ── Computed ── */
  const journalStreak = useMemo(() => {
    const dates = new Set(entries.map(e => e.date));
    let streak = 0, d = new Date();
    while (dates.has(format(d, 'yyyy-MM-dd'))) { streak++; d = new Date(d.getTime() - 86400000); }
    return streak;
  }, [entries]);

  const bestStreak = useMemo(() => {
    if (entries.length === 0) return 0;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    let best = 1, current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      if (diff === 86400000) { current++; best = Math.max(best, current); } else { current = 1; }
    }
    return Math.max(best, current);
  }, [entries]);

  const consistency = useMemo(() => {
    const tradeDays = new Set(allTrades.filter(t => t.status === 'closed').map(t => t.entry_time.slice(0, 10)));
    if (tradeDays.size === 0) return null;
    const journalDays = new Set(entries.map(e => e.date));
    let both = 0;
    tradeDays.forEach(d => { if (journalDays.has(d)) both++; });
    return Math.round((both / tradeDays.size) * 100);
  }, [allTrades, entries]);

  const filteredEntries = useMemo(() => {
    let filtered = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.date.includes(q) || (e.summary || '').toLowerCase().includes(q) ||
        (e.pre_market_plan || '').toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterMode === 'emotion') {
      filtered = filtered.filter(e => (e.tags || []).some(t => EMOTION_TAGS.some(et => t.includes(et.slice(2)))));
    } else if (filterMode === 'setup') {
      filtered = filtered.filter(e => (e.tags || []).some(t => SETUP_TAGS.includes(t)));
    } else if (filterMode === 'mistake') {
      filtered = filtered.filter(e => (e.tags || []).some(t => MISTAKE_TAGS.includes(t) || t.includes('Rules Broken')));
    } else if (filterMode === 'wins' || filterMode === 'losses') {
      const tradeDayPnl: Record<string, number> = {};
      allTrades.filter(t => t.status === 'closed').forEach(t => {
        const d = t.entry_time.slice(0, 10);
        tradeDayPnl[d] = (tradeDayPnl[d] || 0) + t.net_pnl;
      });
      filtered = filtered.filter(e => filterMode === 'wins' ? (tradeDayPnl[e.date] || 0) > 0 : (tradeDayPnl[e.date] || 0) < 0);
    }
    return filtered;
  }, [entries, searchQuery, filterMode, allTrades]);

  return {
    entries, loading, allTrades, searchQuery, setSearchQuery, filterMode, setFilterMode,
    formData, setFormData, createEntry, deleteEntry, resetForm, toggleTag,
    journalStreak, bestStreak, consistency, filteredEntries, fetchEntries,
  };
}
