/**
 * Broker Directory - Integration status, asset-class filters & Request a Broker
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageTitle } from '@/components/ui/PageTitle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { Upload, Globe, Plug, CheckCircle2, Clock, ArrowRight, Search, Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Broker {
  name: string;
  logo: string;
  region: string;
  assetClasses: string[];
  syncMethod: 'csv' | 'api' | 'mt5' | 'coming-soon';
  status: 'live' | 'beta' | 'planned';
  description: string;
}

const ASSET_CLASSES = ['Stocks', 'Forex', 'Crypto', 'Futures', 'Options', 'Commodities', 'Indices'] as const;

const BROKERS: Broker[] = [
  { name: 'Zerodha (Kite)', logo: '🟢', region: 'India', assetClasses: ['Stocks', 'Futures', 'Options', 'Indices'], syncMethod: 'csv', status: 'live', description: 'CSV trade history import via Kite Console → Reports' },
  { name: 'Angel One', logo: '🔵', region: 'India', assetClasses: ['Stocks', 'Futures', 'Options', 'Commodities'], syncMethod: 'csv', status: 'live', description: 'CSV export from Angel One back-office reports' },
  { name: 'Upstox', logo: '🟡', region: 'India', assetClasses: ['Stocks', 'Futures', 'Options'], syncMethod: 'csv', status: 'live', description: 'Download P&L report CSV from Upstox dashboard' },
  { name: 'Groww', logo: '🟠', region: 'India', assetClasses: ['Stocks'], syncMethod: 'csv', status: 'live', description: 'Export trade history CSV from Groww stocks section' },
  { name: 'ICICI Direct', logo: '🔴', region: 'India', assetClasses: ['Stocks', 'Futures', 'Options', 'Commodities'], syncMethod: 'csv', status: 'live', description: 'CSV download from ICICI Direct trade book' },
  { name: 'MetaTrader 5', logo: '📊', region: 'Global', assetClasses: ['Forex', 'Futures', 'Indices', 'Commodities'], syncMethod: 'mt5', status: 'planned', description: 'Direct MT5 terminal sync (coming soon — use CSV export for now)' },
  { name: 'MetaTrader 4', logo: '📈', region: 'Global', assetClasses: ['Forex'], syncMethod: 'mt5', status: 'planned', description: 'MT4 statement import via CSV or HTML export' },
  { name: 'Interactive Brokers', logo: '🏦', region: 'Global', assetClasses: ['Stocks', 'Forex', 'Futures', 'Options', 'Commodities', 'Indices'], syncMethod: 'csv', status: 'beta', description: 'Flex query CSV/XML import from IB Account Management' },
  { name: 'FTMO', logo: '🏆', region: 'Global', assetClasses: ['Forex', 'Indices', 'Commodities'], syncMethod: 'csv', status: 'live', description: 'CSV export from FTMO dashboard → Account History' },
  { name: 'The5ers', logo: '⭐', region: 'Global', assetClasses: ['Forex', 'Indices'], syncMethod: 'csv', status: 'live', description: 'Trade history CSV download from The5ers portal' },
  { name: 'FundedNext', logo: '🚀', region: 'Global', assetClasses: ['Forex', 'Indices', 'Commodities'], syncMethod: 'csv', status: 'live', description: 'Export trades from FundedNext client area' },
  { name: 'cTrader', logo: '💹', region: 'Global', assetClasses: ['Forex', 'Indices'], syncMethod: 'csv', status: 'planned', description: 'cTrader history export via CSV' },
  { name: 'TradingView', logo: '📉', region: 'Global', assetClasses: ['Stocks', 'Forex', 'Crypto', 'Indices'], syncMethod: 'csv', status: 'planned', description: 'Paper trading CSV export from TradingView' },
  { name: 'Binance', logo: '🪙', region: 'Global', assetClasses: ['Crypto', 'Futures'], syncMethod: 'csv', status: 'beta', description: 'Spot & futures trade history CSV' },
  { name: 'Generic CSV', logo: '📄', region: 'Any', assetClasses: ['Stocks', 'Forex', 'Crypto', 'Futures', 'Options', 'Commodities', 'Indices'], syncMethod: 'csv', status: 'live', description: 'Universal CSV import with column mapping wizard' },
];

const statusConfig = {
  live: { label: 'Live', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  beta: { label: 'Beta', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  planned: { label: 'Planned', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

const methodConfig = {
  csv: { label: 'CSV Import', icon: Upload },
  api: { label: 'API Sync', icon: Plug },
  mt5: { label: 'MT5 Sync', icon: Globe },
  'coming-soon': { label: 'Coming Soon', icon: Clock },
};

export default function BrokerDirectory() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ broker_name: '', website_url: '', asset_classes: [] as string[], notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const toggleAsset = (a: string) => {
    setSelectedAssets(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const filtered = BROKERS.filter(b => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.region.toLowerCase().includes(search.toLowerCase());
    const matchAsset = selectedAssets.length === 0 || selectedAssets.some(a => b.assetClasses.includes(a));
    return matchSearch && matchAsset;
  });

  const liveCount = BROKERS.filter(b => b.status === 'live').length;

  const handleRequestSubmit = async () => {
    if (!user) { toast.error('Please sign in to submit a request'); return; }
    if (!reqForm.broker_name.trim()) { toast.error('Broker name is required'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('broker_requests' as any).insert({
      user_id: user.id,
      broker_name: reqForm.broker_name.trim(),
      website_url: reqForm.website_url.trim() || null,
      asset_classes: reqForm.asset_classes,
      notes: reqForm.notes.trim() || null,
    } as any);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Broker request submitted! We will review it soon.');
    setShowRequest(false);
    setReqForm({ broker_name: '', website_url: '', asset_classes: [], notes: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle title="Broker Directory" subtitle={`${liveCount} brokers supported — import trades via CSV or auto-sync`} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowRequest(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Request Broker
          </Button>
          <Button size="sm" asChild>
            <Link to="/trades"><Upload className="h-4 w-4 mr-1.5" /> Import Trades</Link>
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brokers or regions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ASSET_CLASSES.map(a => (
            <Badge
              key={a}
              variant={selectedAssets.includes(a) ? 'default' : 'outline'}
              className={cn(
                "cursor-pointer text-[10px] transition-colors",
                selectedAssets.includes(a) && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleAsset(a)}
            >
              {a}
            </Badge>
          ))}
          {selectedAssets.length > 0 && (
            <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2" onClick={() => setSelectedAssets([])}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-lg font-bold font-mono">{BROKERS.filter(b => b.status === 'live').length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Live</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-lg font-bold font-mono">{BROKERS.filter(b => b.status === 'beta').length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Beta</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-lg font-bold font-mono">{BROKERS.filter(b => b.status === 'planned').length}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Planned</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Broker Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center py-12">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No brokers match your filters</p>
              <Button variant="link" size="sm" onClick={() => { setSearch(''); setSelectedAssets([]); }}>Clear filters</Button>
            </CardContent>
          </Card>
        ) : filtered.map(broker => {
          const Method = methodConfig[broker.syncMethod];
          const status = statusConfig[broker.status];
          return (
            <Card key={broker.name} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{broker.logo}</span>
                    <div>
                      <p className="text-sm font-medium">{broker.name}</p>
                      <p className="text-[10px] text-muted-foreground">{broker.region}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px]", status.color)}>{status.label}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {broker.assetClasses.map(a => (
                    <Badge key={a} variant="secondary" className="text-[8px] px-1.5 py-0">{a}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{broker.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                    <Method.icon className="h-3 w-3" /> {Method.label}
                  </Badge>
                  {broker.status === 'live' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                      <Link to="/trades">Import <ArrowRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Request a Broker Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request a Broker</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Broker Name *</Label>
              <Input value={reqForm.broker_name} onChange={e => setReqForm(p => ({ ...p, broker_name: e.target.value }))} placeholder="e.g. Dhan, Kotak Neo" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Website URL</Label>
              <Input value={reqForm.website_url} onChange={e => setReqForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Asset Classes</Label>
              <div className="flex flex-wrap gap-1.5">
                {ASSET_CLASSES.map(a => (
                  <Badge
                    key={a}
                    variant={reqForm.asset_classes.includes(a) ? 'default' : 'outline'}
                    className={cn("cursor-pointer text-[10px]", reqForm.asset_classes.includes(a) && "bg-primary text-primary-foreground")}
                    onClick={() => setReqForm(p => ({
                      ...p,
                      asset_classes: p.asset_classes.includes(a) ? p.asset_classes.filter(x => x !== a) : [...p.asset_classes, a]
                    }))}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea value={reqForm.notes} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any details about data export format, API availability..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button onClick={handleRequestSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-1.5" /> {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
