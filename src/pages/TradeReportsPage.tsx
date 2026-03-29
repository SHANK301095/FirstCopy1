/**
 * Trade Reports Page - 20+ metrics with export
 */
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { TradeReports } from '@/components/trading/TradeReports';
import { Skeleton } from '@/components/ui/skeleton';

export default function TradeReportsPage() {
  const { trades, loading, stats } = useTradesDB();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Trade Reports" subtitle="20+ metrics, period comparison, CSV & PDF export" />
      <TradeReports trades={trades} stats={stats} />
    </div>
  );
}
