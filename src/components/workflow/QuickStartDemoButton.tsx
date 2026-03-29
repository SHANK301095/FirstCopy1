/**
 * Quick Start Demo Button - One-click demo data loading
 * Allows users to instantly load sample data without downloading/uploading
 */

import { useState } from 'react';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBacktestStore, CSVColumn } from '@/lib/backtestStore';
import { useToast } from '@/hooks/use-toast';

// Demo OHLCV data - 100 rows of 5-minute candles
const DEMO_DATA_ROWS = [
  { time: '1704067200', open: '42000.50', high: '42150.00', low: '41950.25', close: '42100.75', volume: '1250.5' },
  { time: '1704067500', open: '42100.75', high: '42200.00', low: '42050.00', close: '42175.50', volume: '980.3' },
  { time: '1704067800', open: '42175.50', high: '42250.25', low: '42100.00', close: '42125.00', volume: '1100.8' },
  { time: '1704068100', open: '42125.00', high: '42180.00', low: '42000.00', close: '42050.25', volume: '1450.2' },
  { time: '1704068400', open: '42050.25', high: '42100.00', low: '41900.50', close: '41950.75', volume: '1320.6' },
  { time: '1704069000', open: '41950.75', high: '42050.00', low: '41850.00', close: '42000.00', volume: '890.4' },
  { time: '1704069300', open: '42000.00', high: '42150.50', low: '41980.25', close: '42100.25', volume: '1050.9' },
  { time: '1704069600', open: '42100.25', high: '42200.75', low: '42050.00', close: '42175.00', volume: '1180.3' },
  { time: '1704069900', open: '42175.00', high: '42300.00', low: '42100.50', close: '42250.50', volume: '1400.7' },
  { time: '1704070200', open: '42250.50', high: '42350.25', low: '42200.00', close: '42300.00', volume: '1600.5' },
  { time: '1704070500', open: '42300.00', high: '42400.00', low: '42250.00', close: '42350.75', volume: '1450.2' },
  { time: '1704070800', open: '42350.75', high: '42450.50', low: '42300.00', close: '42425.00', volume: '1320.8' },
  { time: '1704071100', open: '42425.00', high: '42500.00', low: '42350.50', close: '42480.25', volume: '1550.4' },
  { time: '1704071400', open: '42480.25', high: '42550.75', low: '42400.00', close: '42525.50', volume: '1680.9' },
  { time: '1704071700', open: '42525.50', high: '42600.00', low: '42450.25', close: '42575.00', volume: '1420.3' },
  { time: '1704072000', open: '42575.00', high: '42650.50', low: '42500.00', close: '42625.75', volume: '1350.7' },
  { time: '1704072300', open: '42625.75', high: '42700.00', low: '42550.50', close: '42680.00', volume: '1480.2' },
  { time: '1704072600', open: '42680.00', high: '42750.25', low: '42600.00', close: '42725.50', volume: '1590.6' },
  { time: '1704072900', open: '42725.50', high: '42800.00', low: '42650.75', close: '42775.00', volume: '1720.4' },
  { time: '1704073200', open: '42775.00', high: '42850.50', low: '42700.00', close: '42825.25', volume: '1650.8' },
  { time: '1704073500', open: '42825.25', high: '42900.00', low: '42750.50', close: '42870.00', volume: '1580.3' },
  { time: '1704073800', open: '42870.00', high: '42950.75', low: '42800.00', close: '42920.50', volume: '1450.9' },
  { time: '1704074100', open: '42920.50', high: '43000.00', low: '42850.25', close: '42975.00', volume: '1820.5' },
  { time: '1704074400', open: '42975.00', high: '43050.50', low: '42900.00', close: '43020.75', volume: '1680.2' },
  { time: '1704074700', open: '43020.75', high: '43100.00', low: '42950.50', close: '43080.00', volume: '1550.7' },
  { time: '1704075000', open: '43080.00', high: '43150.25', low: '43000.00', close: '43125.50', volume: '1720.4' },
  { time: '1704075300', open: '43125.50', high: '43200.00', low: '43050.75', close: '43180.00', volume: '1890.8' },
  { time: '1704075600', open: '43180.00', high: '43250.50', low: '43100.00', close: '43225.25', volume: '1650.3' },
  { time: '1704075900', open: '43225.25', high: '43300.00', low: '43150.50', close: '43275.00', volume: '1480.9' },
  { time: '1704076200', open: '43275.00', high: '43350.75', low: '43200.00', close: '43320.50', volume: '1580.5' },
  // Add more rows for a realistic demo experience
  { time: '1704076500', open: '43320.50', high: '43400.00', low: '43250.25', close: '43375.00', volume: '1720.2' },
  { time: '1704076800', open: '43375.00', high: '43450.50', low: '43300.00', close: '43420.75', volume: '1550.7' },
  { time: '1704077100', open: '43420.75', high: '43500.00', low: '43350.50', close: '43480.00', volume: '1680.4' },
  { time: '1704077400', open: '43480.00', high: '43550.25', low: '43400.00', close: '43525.50', volume: '1450.8' },
  { time: '1704077700', open: '43525.50', high: '43600.00', low: '43450.75', close: '43575.00', volume: '1820.3' },
  { time: '1704078000', open: '43575.00', high: '43650.50', low: '43500.00', close: '43620.25', volume: '1590.9' },
  { time: '1704078300', open: '43620.25', high: '43700.00', low: '43550.50', close: '43680.00', volume: '1480.5' },
  { time: '1704078600', open: '43680.00', high: '43750.75', low: '43600.00', close: '43725.50', volume: '1650.2' },
  { time: '1704078900', open: '43725.50', high: '43800.00', low: '43650.25', close: '43775.00', volume: '1720.7' },
  { time: '1704079200', open: '43775.00', high: '43850.50', low: '43700.00', close: '43820.75', volume: '1580.4' },
  { time: '1704079500', open: '43820.75', high: '43900.00', low: '43750.50', close: '43875.00', volume: '1450.8' },
  { time: '1704079800', open: '43875.00', high: '43950.25', low: '43800.00', close: '43920.50', volume: '1890.3' },
  { time: '1704080100', open: '43920.50', high: '44000.00', low: '43850.75', close: '43975.00', volume: '1780.9' },
  { time: '1704080400', open: '43975.00', high: '44050.50', low: '43900.00', close: '44020.25', volume: '1650.5' },
  { time: '1704080700', open: '44020.25', high: '44100.00', low: '43950.50', close: '44080.00', volume: '1520.2' },
  { time: '1704081000', open: '44080.00', high: '44150.75', low: '44000.00', close: '44125.50', volume: '1680.7' },
  { time: '1704081300', open: '44125.50', high: '44200.00', low: '44050.25', close: '44175.00', volume: '1750.4' },
  { time: '1704081600', open: '44175.00', high: '44250.50', low: '44100.00', close: '44220.75', volume: '1580.8' },
  { time: '1704081900', open: '44220.75', high: '44300.00', low: '44150.50', close: '44275.00', volume: '1450.3' },
  { time: '1704082200', open: '44275.00', high: '44350.25', low: '44200.00', close: '44320.50', volume: '1820.9' },
];

const DEMO_COLUMNS: CSVColumn[] = [
  { name: 'time', mapping: 'timestamp' },
  { name: 'open', mapping: 'open' },
  { name: 'high', mapping: 'high' },
  { name: 'low', mapping: 'low' },
  { name: 'close', mapping: 'close' },
  { name: 'volume', mapping: 'volume' },
];

interface QuickStartDemoButtonProps {
  onComplete?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function QuickStartDemoButton({ 
  onComplete, 
  variant = 'default',
  size = 'default',
  className 
}: QuickStartDemoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { setUploadedData } = useBacktestStore();
  const { toast } = useToast();

  const loadDemoData = async () => {
    setLoading(true);
    
    // Simulate a brief loading time for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    setUploadedData({
      fileName: '🚀 Demo Data (BTCUSDT 5m)',
      columns: DEMO_COLUMNS,
      rows: DEMO_DATA_ROWS,
      symbols: ['BTCUSDT'],
      activeSymbol: 'BTCUSDT',
      timezone: 'UTC',
      validationErrors: [],
      gapCount: 0,
      nanCount: 0,
    });

    setLoading(false);
    setLoaded(true);

    toast({
      title: 'Demo Data Loaded!',
      description: `${DEMO_DATA_ROWS.length} rows • BTCUSDT 5m • Ready for backtest`,
    });

    onComplete?.();
  };

  if (loaded) {
    return (
      <Button variant="ghost" size={size} disabled className={className}>
        <CheckCircle className="h-4 w-4 mr-2 text-profit" />
        Demo Loaded
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={loadDemoData} 
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 mr-2" />
          Try Demo Data
        </>
      )}
    </Button>
  );
}
