import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle2, Loader2 
} from 'lucide-react';
import { useKiteConnect } from '@/hooks/useKiteConnect';
import { kiteApi, PlaceOrderParams } from '@/lib/kiteApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'MCX', 'CDS'] as const;
const ORDER_TYPES = ['MARKET', 'LIMIT', 'SL', 'SL-M'] as const;
const PRODUCTS = ['CNC', 'NRML', 'MIS'] as const;

export function ZerodhaOrderPanel() {
  const { isConnected, refreshPortfolio } = useKiteConnect();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [formData, setFormData] = useState({
    tradingsymbol: '',
    exchange: 'NSE' as typeof EXCHANGES[number],
    order_type: 'MARKET' as typeof ORDER_TYPES[number],
    product: 'MIS' as typeof PRODUCTS[number],
    quantity: '',
    price: '',
    trigger_price: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tradingsymbol.trim()) {
      setError('Please enter a trading symbol');
      return;
    }
    
    const qty = parseInt(formData.quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (formData.order_type === 'LIMIT' && !formData.price) {
      setError('Please enter a price for limit order');
      return;
    }

    if ((formData.order_type === 'SL' || formData.order_type === 'SL-M') && !formData.trigger_price) {
      setError('Please enter a trigger price for stop-loss order');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const params: PlaceOrderParams = {
        tradingsymbol: formData.tradingsymbol.toUpperCase(),
        exchange: formData.exchange,
        transaction_type: orderType,
        order_type: formData.order_type,
        quantity: qty,
        product: formData.product,
      };

      if (formData.price) {
        params.price = parseFloat(formData.price);
      }
      if (formData.trigger_price) {
        params.trigger_price = parseFloat(formData.trigger_price);
      }

      const result = await kiteApi.placeOrder(params);
      
      setSuccess(`Order placed successfully! Order ID: ${result.order_id}`);
      toast({
        title: 'Order Placed',
        description: `${orderType} order for ${formData.tradingsymbol} placed successfully`,
      });

      // Reset form
      setFormData(prev => ({
        ...prev,
        tradingsymbol: '',
        quantity: '',
        price: '',
        trigger_price: '',
      }));

      // Refresh portfolio
      refreshPortfolio();

    } catch (err) {
      console.error('Order failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setError(message);
      toast({
        title: 'Order Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Connect Zerodha to place orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Place Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy/Sell Toggle */}
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'BUY' | 'SELL')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="BUY" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                BUY
              </TabsTrigger>
              <TabsTrigger value="SELL" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                SELL
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Symbol & Exchange */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="e.g. RELIANCE"
                value={formData.tradingsymbol}
                onChange={(e) => handleChange('tradingsymbol', e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Exchange</Label>
              <Select value={formData.exchange} onValueChange={(v) => handleChange('exchange', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGES.map(ex => (
                    <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity & Product */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="1"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={formData.product} onValueChange={(v) => handleChange('product', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIS">MIS (Intraday)</SelectItem>
                  <SelectItem value="CNC">CNC (Delivery)</SelectItem>
                  <SelectItem value="NRML">NRML (F&O)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select value={formData.order_type} onValueChange={(v) => handleChange('order_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKET">Market</SelectItem>
                <SelectItem value="LIMIT">Limit</SelectItem>
                <SelectItem value="SL">Stop-Loss</SelectItem>
                <SelectItem value="SL-M">Stop-Loss Market</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Price Fields */}
          {(formData.order_type === 'LIMIT' || formData.order_type === 'SL') && (
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.05"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className="font-mono"
              />
            </div>
          )}

          {(formData.order_type === 'SL' || formData.order_type === 'SL-M') && (
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger Price</Label>
              <Input
                id="trigger"
                type="number"
                step="0.05"
                placeholder="0.00"
                value={formData.trigger_price}
                onChange={(e) => handleChange('trigger_price', e.target.value)}
                className="font-mono"
              />
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-profit/50 bg-profit/10">
              <CheckCircle2 className="h-4 w-4 text-profit" />
              <AlertDescription className="text-profit">{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading}
            className={cn(
              'w-full gap-2',
              orderType === 'BUY' ? 'bg-profit hover:bg-profit/90' : 'bg-loss hover:bg-loss/90'
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : orderType === 'BUY' ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {loading ? 'Placing Order...' : `${orderType} ${formData.tradingsymbol || 'Stock'}`}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Orders are executed via Kite Connect API. Market hours: 9:15 AM - 3:30 PM IST
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
