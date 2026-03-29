/**
 * StrategyResearchCharts — Equity, Drawdown, Monthly Returns, Distribution
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { StrategyChartData } from '@/types/strategyIntelligence';

interface StrategyResearchChartsProps {
  charts: StrategyChartData;
}

export function StrategyResearchCharts({ charts }: StrategyResearchChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Equity Curve */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.equityCurve}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 100%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 100%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(220, 25%, 8%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(220, 15%, 55%)' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(210, 100%, 55%)" fill="url(#eqGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Drawdown Curve */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm">Drawdown</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.drawdownCurve}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 85%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 85%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(220, 25%, 8%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']}
                />
                <ReferenceLine y={0} stroke="hsl(220, 15%, 30%)" />
                <Area type="monotone" dataKey="value" stroke="hsl(0, 85%, 60%)" fill="url(#ddGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Returns */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm">Monthly Returns</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(220, 25%, 8%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v.toFixed(2)}%`, 'Return']}
                />
                <ReferenceLine y={0} stroke="hsl(220, 15%, 30%)" />
                <Bar dataKey="return" radius={[3, 3, 0, 0]}>
                  {charts.monthlyReturns.map((entry, i) => (
                    <Cell key={i} fill={entry.return >= 0 ? 'hsl(145, 65%, 42%)' : 'hsl(0, 85%, 60%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <Card variant="glass">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm">Trade Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.distributionBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'hsl(220, 15%, 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 15%, 55%)' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(220, 25%, 8%)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="hsl(210, 100%, 55%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
