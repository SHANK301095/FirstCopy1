/**
 * TradingView Embed — Lightweight chart embed for trade visualization
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, ExternalLink } from 'lucide-react';

const TIMEFRAMES = ['1', '5', '15', '30', '60', '240', 'D', 'W'];

export function TradingViewEmbed({ defaultSymbol = 'NSE:NIFTY' }: { defaultSymbol?: string }) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState('15');
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);

  const widgetUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=${encodeURIComponent(symbol)}&interval=${timeframe}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=&theme=dark&style=1&timezone=Asia%2FKolkata&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&showSymbolLogo=0&locale=en&utm_source=mmc`;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Live Chart
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSymbol(inputSymbol)}
              placeholder="Symbol..."
              className="h-7 w-28 text-xs"
            />
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map(tf => (
                  <SelectItem key={tf} value={tf}>{tf === 'D' ? '1D' : tf === 'W' ? '1W' : `${tf}m`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full h-[400px] rounded-b-lg overflow-hidden">
          <iframe
            src={widgetUrl}
            className="w-full h-full border-0"
            allowFullScreen
            title="TradingView Chart"
          />
        </div>
      </CardContent>
    </Card>
  );
}
