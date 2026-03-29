/**
 * Admin Real-time Notifications
 * Subscribes to new signups (profiles) and waitlist joins via Supabase Realtime
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, UserPlus, Users, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: 'signup' | 'waitlist';
  message: string;
  detail: string;
  timestamp: Date;
  read: boolean;
}

export function AdminRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const playNotifSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Simple beep using Web Audio API
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, [soundEnabled]);

  const addNotification = useCallback((type: 'signup' | 'waitlist', message: string, detail: string) => {
    const notif: Notification = {
      id: crypto.randomUUID(),
      type,
      message,
      detail,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50)); // Keep latest 50
    playNotifSound();
    toast.info(message, { description: detail, icon: type === 'signup' ? '👤' : '📋' });
  }, [playNotifSound]);

  useEffect(() => {
    // Subscribe to new user signups
    const profilesChannel = supabase
      .channel('admin-new-signups')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const p = payload.new as any;
          addNotification(
            'signup',
            'New User Signed Up',
            p.display_name || p.username || `User ${(p.id as string).slice(0, 8)}`
          );
        }
      )
      .subscribe();

    // Subscribe to new waitlist entries
    const waitlistChannel = supabase
      .channel('admin-waitlist-joins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sentinel_waitlist' },
        (payload) => {
          const w = payload.new as any;
          addNotification(
            'waitlist',
            'New Waitlist Entry',
            w.email || w.phone || 'Unknown contact'
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(waitlistChannel);
    };
  }, [addNotification]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative rounded-xl gap-1.5">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Live</span>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5"
              >
                <Badge className="h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground border-2 border-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Pulse when unread */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-50" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Live Notifications</span>
            {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">Real-time events will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30',
                    !n.read && 'bg-primary/[0.03]'
                  )}
                >
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    n.type === 'signup' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                  )}>
                    {n.type === 'signup' ?
                      <UserPlus className="h-4 w-4 text-emerald-500" /> :
                      <Users className="h-4 w-4 text-blue-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.detail}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Mark all read
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
