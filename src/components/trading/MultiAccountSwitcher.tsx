/**
 * Multi-Account Switcher — Quick switch between trading accounts
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Account {
  id: string;
  display_name: string;
  broker_type: string;
  status: string;
}

export function MultiAccountSwitcher({ onAccountChange }: { onAccountChange?: (accountId: string | null) => void }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('broker_connections')
      .select('id, display_name, broker_type, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setAccounts(data as Account[]);
      });
  }, [user]);

  const handleChange = (val: string) => {
    setSelected(val);
    onAccountChange?.(val === 'all' ? null : val);
    toast.info(val === 'all' ? 'Showing all accounts' : `Switched to ${accounts.find(a => a.id === val)?.display_name}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map(a => (
            <SelectItem key={a.id} value={a.id}>
              <div className="flex items-center gap-2">
                {a.status === 'active' && <CheckCircle className="h-3 w-3 text-emerald-400" />}
                {a.display_name || a.broker_type}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
