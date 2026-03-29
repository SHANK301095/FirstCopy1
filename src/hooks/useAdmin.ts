import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Reusable hook to check if the current user has admin role.
 * Uses the `user_roles` table (RLS enforced — users can only read their own roles).
 * 
 * Returns:
 *   isAdmin: boolean — true if user has 'admin' role
 *   isLoading: boolean — true while checking
 */
export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!cancelled) {
        setIsAdmin(!error && !!data);
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    check();

    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdmin, isLoading };
}
