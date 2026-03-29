/**
 * Screenshot Gallery — thumbnail gallery of recent trade screenshots in dashboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Trade } from '@/hooks/useTradesDB';

interface ScreenshotEntry {
  tradeId: string;
  symbol: string;
  net_pnl: number;
  setup_url: string | null;
  result_url: string | null;
}

interface ScreenshotGalleryProps {
  trades: Trade[];
  limit?: number;
}

export function ScreenshotGallery({ trades, limit = 6 }: ScreenshotGalleryProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScreenshotEntry[]>([]);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  useEffect(() => {
    if (!user || trades.length === 0) return;
    // Find trades with screenshot URLs from DB
    const fetchScreenshots = async () => {
      const { data } = await supabase
        .from('trades')
        .select('id, symbol, net_pnl, setup_screenshot_url, result_screenshot_url')
        .eq('user_id', user.id)
        .or('setup_screenshot_url.neq.null,result_screenshot_url.neq.null')
        .order('entry_time', { ascending: false })
        .limit(limit);

      if (data) {
        setEntries(data.map((d: any) => ({
          tradeId: d.id,
          symbol: d.symbol,
          net_pnl: d.net_pnl ?? 0,
          setup_url: d.setup_screenshot_url,
          result_url: d.result_screenshot_url,
        })));
      }
    };
    fetchScreenshots();
  }, [user, trades.length, limit]);

  if (entries.length === 0) return null;

  const allImages = entries.flatMap(e => [
    e.setup_url ? { url: e.setup_url, symbol: e.symbol, pnl: e.net_pnl, type: 'Setup' } : null,
    e.result_url ? { url: e.result_url, symbol: e.symbol, pnl: e.net_pnl, type: 'Result' } : null,
  ].filter(Boolean)) as { url: string; symbol: string; pnl: number; type: string }[];

  if (allImages.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            Trade Screenshots
            <Badge variant="secondary" className="text-[10px]">{allImages.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {allImages.slice(0, 6).map((img, i) => (
              <div
                key={i}
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/50 hover:border-primary/40 transition-colors aspect-video bg-muted/30"
                onClick={() => setSelectedImg(img.url)}
              >
                <img
                  src={img.url}
                  alt={`${img.symbol} ${img.type}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white font-medium">{img.symbol}</span>
                    <span className={cn(
                      "text-[9px] font-mono",
                      img.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'
                    )}>
                      {img.pnl >= 0 ? '+' : ''}₹{img.pnl.toFixed(0)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 bg-black/40 text-white/80 border-white/20 mt-0.5">
                    {img.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedImg} onOpenChange={() => setSelectedImg(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedImg && (
            <img src={selectedImg} alt="Trade screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
