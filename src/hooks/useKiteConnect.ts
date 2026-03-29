import { useState, useEffect, useCallback } from 'react';
import { kiteApi, KiteConnection, KitePortfolioSummary } from '@/lib/kiteApi';
import { useAuth } from '@/contexts/AuthContext';

export function useKiteConnect() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<KiteConnection | null>(null);
  const [portfolio, setPortfolio] = useState<KitePortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const conn = await kiteApi.getConnectionStatus();
      setConnection(conn);
      setError(null);
    } catch (err) {
      console.error('Failed to check Kite connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to check connection');
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const initiateLogin = useCallback(async () => {
    try {
      const currentUrl = window.location.origin + '/execution-bridge';
      const loginUrl = await kiteApi.getLoginUrl(currentUrl);
      window.location.href = loginUrl;
    } catch (err) {
      console.error('Failed to get login URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate login');
    }
  }, []);

  const handleCallback = useCallback(async (requestToken: string) => {
    try {
      setLoading(true);
      await kiteApi.handleCallback(requestToken);
      await checkConnection();
      return true;
    } catch (err) {
      console.error('Failed to complete OAuth:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete login');
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkConnection]);

  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      await kiteApi.disconnect();
      setConnection(null);
      setPortfolio(null);
      setError(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    if (!connection || connection.status !== 'connected') return;

    try {
      setPortfolioLoading(true);
      const data = await kiteApi.getPortfolioSummary();
      setPortfolio(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setPortfolioLoading(false);
    }
  }, [connection]);

  // Check connection on mount and when user changes
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle OAuth callback from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');
    
    if (requestToken && user) {
      handleCallback(requestToken).then((success) => {
        // Clear URL params after processing
        if (success) {
          const url = new URL(window.location.href);
          url.searchParams.delete('request_token');
          url.searchParams.delete('action');
          url.searchParams.delete('status');
          window.history.replaceState({}, '', url.pathname);
        }
      });
    }
  }, [user, handleCallback]);

  // Auto-refresh portfolio when connected
  useEffect(() => {
    if (connection?.status === 'connected') {
      refreshPortfolio();
    }
  }, [connection, refreshPortfolio]);

  return {
    connection,
    portfolio,
    loading,
    portfolioLoading,
    error,
    isConnected: connection?.status === 'connected',
    initiateLogin,
    disconnect,
    refreshPortfolio,
    checkConnection,
  };
}
