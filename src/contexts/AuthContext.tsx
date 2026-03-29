import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from '@/lib/secureLogger';
interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  phoneRequired: boolean;
  onPhoneUpdated: () => void;
  signIn: (emailOrUsername: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    username?: string,
    phone?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session refresh interval (5 minutes before expiry)
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Fetch profile when user changes
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const [{ data: profileRow }, { data: privateRow }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('profile_private_data')
          .select('phone')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profileRow) {
        const phone = (privateRow?.phone ?? null) as string | null;
        setProfile({ ...profileRow, phone } as Profile);
        setPhoneRequired(!phone);
      }
    } catch {
      // Profile fetch failed - non-critical, continue without profile
    }
  }, []);

  const onPhoneUpdated = useCallback(() => {
    setPhoneRequired(false);
    if (user) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Proactive session refresh
  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const now = Date.now();
    const expiresAtMs = expiresAt * 1000;
    const refreshAt = expiresAtMs - REFRESH_MARGIN_MS;
    const timeUntilRefresh = Math.max(refreshAt - now, 1000);

    refreshTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          // Session refresh failed - onAuthStateChange will handle logout if needed
        } else if (data.session) {
          // Schedule next refresh
          scheduleTokenRefresh(data.session.expires_at!);
        }
      } catch {
        // Session refresh error - silent fail, will be handled on next interaction
      } finally {
        isRefreshingRef.current = false;
      }
    }, timeUntilRefresh);
  }, []);

  // Handle visibility change - refresh session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && session) {
        // Check if session is about to expire (within 10 minutes)
        const now = Date.now();
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry < 10 * 60 * 1000 && !isRefreshingRef.current) {
          isRefreshingRef.current = true;
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (!error && data.session) {
              scheduleTokenRefresh(data.session.expires_at!);
            }
          } catch {
            // Visibility refresh failed - will retry on next interaction
          } finally {
            isRefreshingRef.current = false;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, scheduleTokenRefresh]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Wire secureLogger with user ID
        secureLogger.setUser(currentSession?.user?.id ?? null);

        // Schedule token refresh if we have a valid session
        if (currentSession?.expires_at) {
          scheduleTokenRefresh(currentSession.expires_at);
        } else if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }

        // Defer profile fetch to avoid deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      if (existingSession?.expires_at) {
        scheduleTokenRefresh(existingSession.expires_at);
      }

      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [fetchProfile, scheduleTokenRefresh]);

  const signIn = async (email: string, password: string, _rememberMe?: boolean) => {
    // Quick offline guard for clearer UX
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      secureLogger.networkError('Sign-in blocked: offline', { route: window.location.pathname });
      return { error: new Error('Offline. Please check your internet connection and try again.') };
    }

    const attempt = async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    };

    try {
      return await attempt();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      secureLogger.networkError('Sign-in request failed (exception)', {
        message,
        online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });

      // Most common browser-level failure: "Failed to fetch" (DNS/VPN/adblock/CORS/transient)
      if (/fetch|network|load failed/i.test(message)) {
        try {
          await new Promise((r) => setTimeout(r, 750));
          return await attempt();
        } catch (err2) {
          const message2 = err2 instanceof Error ? err2.message : String(err2);
          secureLogger.networkError('Sign-in retry failed', { message: message2 });
          return { error: new Error(message2 || 'Network error. Please try again.') };
        }
      }

      return { error: new Error(message || 'Sign in failed. Please try again.') };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string, username?: string, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
          username: username || null,
          phone: phone || null,
        },
      },
    });

    // If email confirmations are enabled, Supabase creates the user but doesn't create a session.
    const needsEmailConfirmation = !error && !data?.session;

    return { error: error as Error | null, needsEmailConfirmation };
  };

  const signOut = async () => {
    // Phase 3: Clear Dexie + local data on logout
    try {
      const { db } = await import('@/db/index');
      await db.delete();
      await db.open();
    } catch {
      // Dexie cleanup best-effort
    }
    // Clear sync timestamps and retry queue
    try {
      const { clearSyncTimestamps } = await import('@/lib/cloudSync');
      clearSyncTimestamps();
      localStorage.removeItem('mmc-sync-retry-queue');
    } catch {
      // Cleanup best-effort
    }
    await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, phoneRequired, onPhoneUpdated, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
