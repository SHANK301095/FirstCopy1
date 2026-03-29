/**
 * Factory Deployments
 * Deploy portfolio EAs to terminals/accounts, monitor status
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Rocket, Pause, XCircle, Play, Server } from 'lucide-react';
import { useFactoryDeployments, useFactoryPortfolios, useFactoryTerminals, useFactoryAccounts, useDeployPortfolio } from '@/hooks/useFactory';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

const STATUS_COLORS: Record<string, string> = {
  deploying: 'bg-blue-500/15 text-blue-400',
  running: 'bg-emerald-500/15 text-emerald-400',
  paused: 'bg-amber-500/15 text-amber-400',
  killed: 'bg-red-500/15 text-red-400',
  error: 'bg-red-500/15 text-red-400',
};

function FactoryDeploymentsContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: deployments, isLoading } = useFactoryDeployments();
  const { data: portfolios } = useFactoryPortfolios();
  const { data: terminals } = useFactoryTerminals();
  const { data: accounts } = useFactoryAccounts();
  const deploy = useDeployPortfolio();

  const [selPortfolio, setSelPortfolio] = useState('');
  const [selAccount, setSelAccount] = useState('');
  const [selTerminal, setSelTerminal] = useState('');

  const handleDeploy = () => {
    if (!selPortfolio || !selAccount || !selTerminal) { toast.error('Select all fields'); return; }
    deploy.mutate({ portfolio_id: selPortfolio, account_id: selAccount, terminal_id: selTerminal });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('factory_deployments').update({ status }).eq('id', id);
    if (error) { toast.error(`Failed to update: ${error.message}`); return; }
    qc.invalidateQueries({ queryKey: ['factory-deployments'] });
    toast.success(`Deployment ${status}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deployments</h1>
        <p className="text-muted-foreground text-sm mt-1">Deploy portfolio EAs to terminals and monitor live status</p>
      </div>

      {/* Deploy Panel */}
      <Card variant="glass">
        <CardHeader><CardTitle className="text-base">Deploy Portfolio</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap items-end">
          <Select value={selPortfolio} onValueChange={setSelPortfolio}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Select portfolio"><SelectValue placeholder="Portfolio" /></SelectTrigger>
            <SelectContent>
              {(portfolios || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selAccount} onValueChange={setSelAccount}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Select account"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selTerminal} onValueChange={setSelTerminal}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Select terminal"><SelectValue placeholder="Terminal" /></SelectTrigger>
            <SelectContent>
              {(terminals || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleDeploy} disabled={deploy.isPending}>
            <Rocket className="h-4 w-4 mr-1" /> Deploy
          </Button>
        </CardContent>
      </Card>

      {/* Deployment Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : !deployments?.length ? (
        <Card variant="outline" className="py-16 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No deployments yet. Build a portfolio and deploy it above.</p>
        </Card>
      ) : (
        <Card>
          <div className="w-full min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(deployments || []).map(d => {
                  const member = d.factory_portfolio_members as any;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-sm truncate max-w-[160px]">
                        {member?.strategy_versions?.strategies?.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{member?.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{member?.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{(d.factory_accounts as any)?.label}</TableCell>
                      <TableCell className="text-sm">{(d.factory_terminals as any)?.name}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_COLORS[d.status] || ''}`}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.status === 'running' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => updateStatus(d.id, 'paused')} aria-label="Pause deployment">
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          {d.status === 'paused' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => updateStatus(d.id, 'running')} aria-label="Resume deployment">
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          {!['killed', 'error'].includes(d.status) && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400" onClick={() => updateStatus(d.id, 'killed')} aria-label="Kill deployment">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function FactoryDeployments() {
  return (
    <PageErrorBoundary pageName="Deployments">
      <FactoryDeploymentsContent />
    </PageErrorBoundary>
  );
}
