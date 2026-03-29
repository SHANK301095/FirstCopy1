/**
 * Admin Affiliates Manager
 * Approve/reject applications, view all affiliates with stats
 */
import { useState, useEffect } from 'react';
import { Check, X, Users, IndianRupee, MousePointer, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: string;
  platform: string | null;
  channel_url: string | null;
  subscriber_count: string | null;
  trading_niche: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  commission_rate: number;
  created_at: string;
}

export function AffiliatesManager() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadAffiliates(); }, []);

  const loadAffiliates = async () => {
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });
    setAffiliates((data || []) as Affiliate[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from('affiliates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Affiliate ${status}`);
      setAffiliates(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
    setActionLoading(null);
  };

  const pending = affiliates.filter(a => a.status === 'pending');
  const approved = affiliates.filter(a => a.status === 'approved');
  const rejected = affiliates.filter(a => a.status === 'rejected');

  const renderTable = (list: Affiliate[], showActions: boolean) => (
    <div className="overflow-x-auto w-full">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Subscribers</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8 text-muted-foreground">
              No affiliates found
            </TableCell>
          </TableRow>
        ) : (
          list.map(aff => (
            <TableRow key={aff.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{aff.applicant_name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{aff.applicant_email}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="capitalize">{aff.platform || 'N/A'}</Badge>
                  {aff.channel_url && (
                    <a href={aff.channel_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell>{aff.subscriber_count || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{aff.affiliate_code}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(aff.created_at), 'dd MMM yyyy')}
              </TableCell>
              <TableCell>
                <Badge variant={
                  aff.status === 'approved' ? 'default' : 
                  aff.status === 'rejected' ? 'destructive' : 'secondary'
                }>
                  {aff.status}
                </Badge>
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-emerald-600 hover:bg-emerald-500/10"
                      disabled={actionLoading === aff.id}
                      onClick={() => updateStatus(aff.id, 'approved')}
                    >
                      {actionLoading === aff.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-destructive hover:bg-destructive/10"
                      disabled={actionLoading === aff.id}
                      onClick={() => updateStatus(aff.id, 'rejected')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card variant="stat">
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Active Affiliates</p>
            <p className="text-2xl font-bold text-emerald-500">{approved.length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Total Applications</p>
            <p className="text-2xl font-bold">{affiliates.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pending.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-4">{renderTable(pending, true)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-4">{renderTable(approved, false)}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rejected">
          <Card>
            <CardContent className="pt-4">{renderTable(rejected, false)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
