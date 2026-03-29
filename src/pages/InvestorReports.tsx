/**
 * Investor Mode — Daily Reports (Screen E)
 * Investor-grade, no charts, card-based
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, AlertTriangle, Shield, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageTitle } from '@/components/ui/PageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function InvestorReports() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const instanceId = (location.state as any)?.instanceId;
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instanceId || !user) return;
    supabase
      .from('investor_daily_reports')
      .select('*')
      .eq('instance_id', instanceId)
      .order('report_date', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setReports(data || []);
        setLoading(false);
      });
  }, [instanceId, user]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Loading reports...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageTitle title="Daily Reports" subtitle="Investor-grade performance summary" />
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-medium">Abhi koi reports nahi</p>
            <p className="text-sm text-muted-foreground mt-1">
              Trading start hone ke baad daily reports yahan dikhenge
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[70vh]">
          <div className="space-y-4">
            {reports.map(report => (
              <Card key={report.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(report.report_date).toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-sm font-bold',
                        report.pnl >= 0 ? 'text-profit border-profit/30' : 'text-loss border-loss/30'
                      )}
                    >
                      {report.pnl >= 0 ? '+' : ''}₹{report.pnl?.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Return</p>
                      <p className={cn('font-bold', report.return_pct >= 0 ? 'text-profit' : 'text-loss')}>
                        {report.return_pct >= 0 ? '+' : ''}{report.return_pct?.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Drawdown</p>
                      <p className="font-bold text-yellow-500">{report.drawdown_pct?.toFixed(2)}%</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Trades</p>
                      <p className="font-bold">{report.trade_count}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Exposure: {report.exposure_pct?.toFixed(1)}%
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Fees: ₹{report.fees_estimate?.toFixed(2)}
                    </Badge>
                  </div>

                  {/* Red flags */}
                  {report.red_flags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {report.red_flags.map((flag: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {report.summary && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Aaj ka summary</p>
                      <p className="text-sm">{report.summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
