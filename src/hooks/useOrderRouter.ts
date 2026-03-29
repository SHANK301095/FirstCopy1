/**
 * Hook for order routing — connects UI to the order router service.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { routeOrder, emergencyKillAll, checkAdapterHealth, type RouteResult } from '@/services/orderRouter';
import { type BrokerOrderRequest, type BrokerHealthStatus } from '@/services/brokerAdapter';
import { useToast } from '@/hooks/use-toast';

export interface OrderRouterState {
  lastRoute: RouteResult | null;
  routing: boolean;
  healthChecking: boolean;
}

export function useOrderRouter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<OrderRouterState>({
    lastRoute: null,
    routing: false,
    healthChecking: false,
  });

  const sendOrder = useCallback(async (
    deploymentId: string,
    brokerType: string,
    connectionId: string,
    accountId: string,
    order: BrokerOrderRequest
  ): Promise<RouteResult | null> => {
    if (!user) return null;
    setState(prev => ({ ...prev, routing: true }));

    try {
      const result = await routeOrder(deploymentId, user.id, brokerType, connectionId, accountId, order);

      setState(prev => ({ ...prev, lastRoute: result, routing: false }));

      if (result.decision === 'blocked') {
        toast({
          title: '⛔ Order Blocked by Risk',
          description: result.reason || 'Pre-trade risk check failed',
          variant: 'destructive',
        });
      } else if (result.decision === 'routed') {
        toast({
          title: '✅ Order Routed',
          description: `${order.side.toUpperCase()} ${order.quantity} ${order.symbol} → ${result.orderResult?.status}`,
        });
      } else if (result.decision === 'error') {
        toast({
          title: '❌ Order Failed',
          description: result.reason || 'Execution error',
          variant: 'destructive',
        });
      }

      return result;
    } catch (err) {
      setState(prev => ({ ...prev, routing: false }));
      toast({ title: 'Routing Error', description: String(err), variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  const killAll = useCallback(async () => {
    if (!user) return;
    await emergencyKillAll(user.id);
    toast({
      title: '🚨 Emergency Kill Executed',
      description: 'All adapters stopped, all positions closing',
      variant: 'destructive',
    });
  }, [user, toast]);

  const checkHealth = useCallback(async (
    brokerType: string,
    connectionId: string,
    accountId: string
  ): Promise<BrokerHealthStatus | null> => {
    if (!user) return null;
    setState(prev => ({ ...prev, healthChecking: true }));
    try {
      const result = await checkAdapterHealth(brokerType, connectionId, user.id, accountId);
      setState(prev => ({ ...prev, healthChecking: false }));
      return result;
    } catch {
      setState(prev => ({ ...prev, healthChecking: false }));
      return null;
    }
  }, [user]);

  return {
    ...state,
    sendOrder,
    killAll,
    checkHealth,
  };
}
