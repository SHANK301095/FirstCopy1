import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, TrendingUp, TrendingDown, Wallet, 
  Package, BarChart3, ShoppingCart
} from 'lucide-react';
import { useKiteConnect } from '@/hooks/useKiteConnect';
import { cn } from '@/lib/utils';

export function ZerodhaPortfolioPanel() {
  const { portfolio, portfolioLoading, isConnected, refreshPortfolio } = useKiteConnect();

  if (!isConnected) {
    return null;
  }

  if (portfolioLoading && !portfolio) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  if (!portfolio) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalPnl = portfolio.holdings.pnl + portfolio.positions.pnl;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio - {portfolio.account_id}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshPortfolio}
            disabled={portfolioLoading}
          >
            <RefreshCw className={cn('h-4 w-4', portfolioLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="h-4 w-4" />
              Available
            </div>
            <div className="text-xl font-bold font-mono">
              {formatCurrency(portfolio.margins.available)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Package className="h-4 w-4" />
              Holdings
            </div>
            <div className="text-xl font-bold font-mono">
              {formatCurrency(portfolio.holdings.value)}
            </div>
            <div className={cn(
              'text-sm font-mono',
              portfolio.holdings.pnl >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {portfolio.holdings.pnl >= 0 ? '+' : ''}{formatCurrency(portfolio.holdings.pnl)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Positions
            </div>
            <div className="text-xl font-bold font-mono">
              {portfolio.positions.count}
            </div>
            <div className={cn(
              'text-sm font-mono',
              portfolio.positions.pnl >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {portfolio.positions.pnl >= 0 ? '+' : ''}{formatCurrency(portfolio.positions.pnl)}
            </div>
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            totalPnl >= 0 ? 'bg-profit/10' : 'bg-loss/10'
          )}>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {totalPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Total P&L
            </div>
            <div className={cn(
              'text-xl font-bold font-mono',
              totalPnl >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
            </div>
          </div>
        </div>

        {/* Tabs for Holdings, Positions, Orders */}
        <Tabs defaultValue="holdings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="holdings">
              Holdings ({portfolio.holdings.count})
            </TabsTrigger>
            <TabsTrigger value="positions">
              Positions ({portfolio.positions.count})
            </TabsTrigger>
            <TabsTrigger value="orders">
              Orders ({portfolio.orders.count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <ScrollArea className="h-[300px]">
              {portfolio.holdings.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No holdings found
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.holdings.items.map((holding, idx) => (
                    <div 
                      key={`${holding.tradingsymbol}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{holding.tradingsymbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {holding.quantity} qty @ ₹{holding.average_price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">₹{holding.last_price.toFixed(2)}</div>
                        <div className={cn(
                          'text-sm font-mono',
                          holding.pnl >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {holding.pnl >= 0 ? '+' : ''}₹{holding.pnl.toFixed(0)}
                          <span className="text-xs ml-1">
                            ({holding.day_change_percentage.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="positions">
            <ScrollArea className="h-[300px]">
              {portfolio.positions.net.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open positions
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.positions.net.map((position, idx) => (
                    <div 
                      key={`${position.tradingsymbol}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{position.tradingsymbol}</span>
                          <Badge variant={position.quantity > 0 ? 'default' : 'destructive'} className="text-xs">
                            {position.quantity > 0 ? 'LONG' : 'SHORT'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{position.product}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.abs(position.quantity)} qty @ ₹{position.average_price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">₹{position.last_price.toFixed(2)}</div>
                        <div className={cn(
                          'text-sm font-mono',
                          position.pnl >= 0 ? 'text-profit' : 'text-loss'
                        )}>
                          {position.pnl >= 0 ? '+' : ''}₹{position.pnl.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="orders">
            <ScrollArea className="h-[300px]">
              {portfolio.orders.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No orders today
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.orders.items.map((order, idx) => (
                    <div 
                      key={`${order.order_id}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.tradingsymbol}</span>
                          <Badge variant={order.transaction_type === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                            {order.transaction_type}
                          </Badge>
                          <Badge 
                            variant={
                              order.status === 'COMPLETE' ? 'default' :
                              order.status === 'REJECTED' ? 'destructive' :
                              'secondary'
                            } 
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.quantity} qty • {order.order_type} • {order.product}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">
                          {order.status === 'COMPLETE' 
                            ? `₹${order.average_price.toFixed(2)}`
                            : order.price > 0 ? `₹${order.price.toFixed(2)}` : 'MKT'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {order.order_id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
