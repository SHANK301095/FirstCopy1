import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plug, PlugZap, RefreshCw, LogOut, ExternalLink, 
  CheckCircle2, XCircle, Clock, AlertTriangle 
} from 'lucide-react';
import { useKiteConnect } from '@/hooks/useKiteConnect';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function ZerodhaConnectionCard() {
  const { 
    connection, 
    loading, 
    error, 
    isConnected, 
    initiateLogin, 
    disconnect,
    checkConnection 
  } = useKiteConnect();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isExpired = connection?.token_expiry && new Date(connection.token_expiry) < new Date();

  return (
    <Card className={cn(
      isConnected && !isExpired && 'border-profit/50 bg-profit/5',
      isExpired && 'border-warning/50 bg-warning/5',
      error && 'border-destructive/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              isConnected && !isExpired ? 'bg-profit/20' : 'bg-muted'
            )}>
              {isConnected ? (
                <PlugZap className={cn('h-5 w-5', isExpired ? 'text-warning' : 'text-profit')} />
              ) : (
                <Plug className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Zerodha Kite</CardTitle>
              <CardDescription>
                {isConnected 
                  ? `Connected as ${connection?.account_id}`
                  : 'Connect your Zerodha account for live trading'
                }
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConnected && !isExpired ? 'default' : isExpired ? 'secondary' : 'outline'}>
            {isConnected && !isExpired ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
            ) : isExpired ? (
              <><Clock className="h-3 w-3 mr-1" /> Expired</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Disconnected</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && connection && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Account ID</span>
              <p className="font-mono font-medium">{connection.account_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User</span>
              <p className="font-medium">{connection.metadata?.user_shortname || connection.metadata?.user_name || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Sync</span>
              <p className="font-medium">
                {connection.last_sync_at 
                  ? formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })
                  : 'Never'
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Token Expiry</span>
              <p className={cn('font-medium', isExpired && 'text-warning')}>
                {connection.token_expiry 
                  ? formatDistanceToNow(new Date(connection.token_expiry), { addSuffix: true })
                  : 'Unknown'
                }
              </p>
            </div>
            {connection.metadata?.exchanges && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Exchanges</span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {connection.metadata.exchanges.map(ex => (
                    <Badge key={ex} variant="secondary" className="text-xs">{ex}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {isConnected ? (
            <>
              {isExpired && (
                <Button onClick={initiateLogin} className="flex-1 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Re-authenticate
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => checkConnection()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </>
          ) : (
            <Button onClick={initiateLogin} className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Connect Zerodha
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Kite tokens expire daily at 6:00 AM IST. Re-authenticate each morning for live trading.
        </p>
      </CardContent>
    </Card>
  );
}
