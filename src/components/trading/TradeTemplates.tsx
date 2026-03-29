/**
 * Trade Templates — Save and reuse common trade setups
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

interface TradeTemplate {
  id: string;
  name: string;
  symbol: string;
  direction: 'long' | 'short';
  setup_type: string;
  strategy_tag: string;
  session_tag: string;
  timeframe: string;
  stop_loss_pct: number;
  take_profit_pct: number;
}

const DEFAULT_TEMPLATES: TradeTemplate[] = [
  { id: '1', name: 'NIFTY Breakout Long', symbol: 'NIFTY50', direction: 'long', setup_type: 'Breakout', strategy_tag: 'Trend Following', session_tag: 'London', timeframe: '15m', stop_loss_pct: 0.5, take_profit_pct: 1.5 },
  { id: '2', name: 'BANKNIFTY Scalp Short', symbol: 'BANKNIFTY', direction: 'short', setup_type: 'Scalp', strategy_tag: 'Mean Reversion', session_tag: 'Asia', timeframe: '5m', stop_loss_pct: 0.3, take_profit_pct: 0.6 },
  { id: '3', name: 'Gold Swing', symbol: 'XAUUSD', direction: 'long', setup_type: 'Swing', strategy_tag: 'Trend Following', session_tag: 'New York', timeframe: '4h', stop_loss_pct: 1.0, take_profit_pct: 3.0 },
];

export function TradeTemplates({ onApplyTemplate }: { onApplyTemplate?: (t: Partial<TradeTemplate>) => void }) {
  const [templates, setTemplates] = useState<TradeTemplate[]>(() => {
    const saved = localStorage.getItem('mmc-trade-templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const save = (list: TradeTemplate[]) => {
    setTemplates(list);
    localStorage.setItem('mmc-trade-templates', JSON.stringify(list));
  };

  const deleteTemplate = (id: string) => {
    save(templates.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const applyTemplate = (t: TradeTemplate) => {
    onApplyTemplate?.(t);
    toast.success(`Applied "${t.name}"`);
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            Trade Templates
          </CardTitle>
          <Badge variant="secondary">{templates.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.name}</p>
              <div className="flex gap-1.5 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.symbol}</Badge>
                <Badge variant={t.direction === 'long' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                  {t.direction.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.timeframe}</Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">SL {t.stop_loss_pct}%</Badge>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => applyTemplate(t)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No templates yet. Create one from your best setups!</p>
        )}
      </CardContent>
    </Card>
  );
}
