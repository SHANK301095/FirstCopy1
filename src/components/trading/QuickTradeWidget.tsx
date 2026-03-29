/**
 * Quick Trade Widget - floating FAB for logging trades in 3 taps
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Zap } from 'lucide-react';
import { useTradesDB } from '@/hooks/useTradesDB';
import { toast } from 'sonner';

export function QuickTradeWidget() {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [pnl, setPnl] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const { addTrade } = useTradesDB();

  const handleSubmit = async () => {
    if (!symbol || !entryPrice) {
      toast.error('Symbol and entry price required');
      return;
    }
    const pnlNum = parseFloat(pnl) || 0;
    await addTrade({
      symbol: symbol.toUpperCase(),
      direction,
      entry_price: parseFloat(entryPrice),
      exit_price: parseFloat(entryPrice) + (direction === 'long' ? pnlNum : -pnlNum),
      entry_time: new Date().toISOString(),
      exit_time: new Date().toISOString(),
      status: 'closed',
      pnl: pnlNum,
      net_pnl: pnlNum,
      quantity: 1,
      import_source: 'quick_log',
    });
    setOpen(false);
    setSymbol('');
    setPnl('');
    setEntryPrice('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Log Trade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Symbol</Label>
            <Input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="NIFTY, RELIANCE..." className="h-9 mt-1" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Direction</Label>
              <Select value={direction} onValueChange={v => setDirection(v as 'long' | 'short')}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Entry Price</Label>
              <Input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.00" className="h-9 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">P&L (₹)</Label>
            <Input type="number" value={pnl} onChange={e => setPnl(e.target.value)} placeholder="+500 or -200" className="h-9 mt-1" />
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            Log Trade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
