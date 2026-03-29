import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { secureLogger } from '@/lib/secureLogger';

export interface PresenceUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  onlineAt: string;
  currentPage?: string;
  currentResource?: {
    type: string;
    id: string;
    name?: string;
  };
}

export interface UseRealtimePresenceReturn {
  onlineUsers: PresenceUser[];
  isConnected: boolean;
  updatePresence: (updates: Partial<Pick<PresenceUser, 'currentPage' | 'currentResource'>>) => void;
  broadcastEvent: (event: string, payload: Record<string, unknown>) => void;
  onBroadcast: (callback: (event: string, payload: Record<string, unknown>) => void) => void;
}

export function useRealtimePresence(channelName: string | null): UseRealtimePresenceReturn {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [broadcastCallbacks, setBroadcastCallbacks] = useState<Array<(event: string, payload: Record<string, unknown>) => void>>([]);

  useEffect(() => {
    if (!user || !channelName) return;

    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.entries(state).forEach(([, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as unknown as PresenceUser;
            if (presence.id) {
              users.push(presence);
            }
          }
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        secureLogger.debug('network', 'User joined presence channel', { count: newPresences?.length });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        secureLogger.debug('network', 'User left presence channel', { count: leftPresences?.length });
      })
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        broadcastCallbacks.forEach(cb => cb(event, payload as Record<string, unknown>));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await presenceChannel.track({
            id: user.id,
            email: user.email,
            displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
            avatarUrl: user.user_metadata?.avatar_url,
            onlineAt: new Date().toISOString()
          });
        } else {
          setIsConnected(false);
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
      supabase.removeChannel(presenceChannel);
    };
  }, [user, channelName]);

  const updatePresence = useCallback((updates: Partial<Pick<PresenceUser, 'currentPage' | 'currentResource'>>) => {
    if (!channel || !user) return;
    
    channel.track({
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
      avatarUrl: user.user_metadata?.avatar_url,
      onlineAt: new Date().toISOString(),
      ...updates
    });
  }, [channel, user]);

  const broadcastEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    if (!channel) return;
    channel.send({
      type: 'broadcast',
      event,
      payload
    });
  }, [channel]);

  const onBroadcast = useCallback((callback: (event: string, payload: Record<string, unknown>) => void) => {
    setBroadcastCallbacks(prev => [...prev, callback]);
  }, []);

  return {
    onlineUsers,
    isConnected,
    updatePresence,
    broadcastEvent,
    onBroadcast
  };
}
