import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EquityChartProps {
  data: number[];
  title?: string;
  showCard?: boolean;
  className?: string;
  height?: number;
}

export function EquityChart({
  data,
  title = 'Equity Curve',
  showCard = true,
  className,
  height = 200,
}: EquityChartProps) {
  const chartData = data.map((value, index) => ({
    point: index,
    equity: value,
  }));

  const isPositive = data.length > 1 && data[data.length - 1] >= data[0];
  const strokeColor = isPositive ? 'hsl(142, 76%, 45%)' : 'hsl(0, 72%, 55%)';
  const fillColor = isPositive ? 'hsl(142, 76%, 45%)' : 'hsl(0, 72%, 55%)';

  const content = (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`equity-gradient-${isPositive}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
        <XAxis dataKey="point" hide />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(222, 47%, 8%)',
            border: '1px solid hsl(222, 30%, 18%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Equity']}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#equity-gradient-${isPositive})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{content}</CardContent>
    </Card>
  );
}

interface DrawdownChartProps {
  data: number[];
  title?: string;
  showCard?: boolean;
  className?: string;
  height?: number;
}

export function DrawdownChart({
  data,
  title = 'Drawdown',
  showCard = true,
  className,
  height = 150,
}: DrawdownChartProps) {
  const chartData = data.map((value, index) => ({
    point: index,
    drawdown: -Math.abs(value),
  }));

  const content = (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="dd-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0} />
            <stop offset="100%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
        <XAxis dataKey="point" hide />
        <YAxis
          domain={['auto', 0]}
          tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(222, 47%, 8%)',
            border: '1px solid hsl(222, 30%, 18%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="hsl(0, 72%, 55%)"
          strokeWidth={1.5}
          fill="url(#dd-gradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-loss">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{content}</CardContent>
    </Card>
  );
}
