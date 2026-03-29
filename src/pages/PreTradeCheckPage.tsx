/**
 * Pre-Trade Check - Standalone page at /pre-trade-check
 */
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { PreTradeCheck } from '@/components/trading/PreTradeCheck';
import { AIPlaybookCards } from '@/components/trading/AIPlaybookCards';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Sparkles } from 'lucide-react';

export default function PreTradeCheckPage() {
  const { trades, loading } = useTradesDB();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle
        title="Pre-Trade Check"
        subtitle="Match your next trade against your historical edge"
      />

      {trades.filter(t => t.status === 'closed').length < 10 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Need 10+ closed trades to run pre-trade checks</p>
            <p className="text-xs text-muted-foreground mt-1">Import trades or use demo data to get started</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PreTradeCheck trades={trades} />
          <AIPlaybookCards trades={trades} />
        </>
      )}
    </div>
  );
}
