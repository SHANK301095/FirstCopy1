/**
 * Alerts & Notifications Page - real implementation with notification history tab
 */
import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Trash2, RefreshCw, History, TestTube, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTitle } from '@/components/ui/PageTitle';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string | null;
  severity: string | null;
  channel: string;
  is_read: boolean | null;
  created_at: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  last_triggered_day: string | null;
  last_triggered_at: string | null;
}

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { notifications, unreadCount, markAsRead: markNotifRead, markAllAsRead: markAllNotifsRead, deleteNotification } = useNotifications();

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trade_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setAlerts((data || []) as Alert[]);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id: string) => {
    await supabase.from('trade_alerts').update({ is_read: true } as any).eq('id', id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('trade_alerts').update({ is_read: true } as any).eq('user_id', user.id).eq('is_read', false);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    toast.success('All alerts marked as read');
  };

  const deleteAlert = async (id: string) => {
    await supabase.from('trade_alerts').delete().eq('id', id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const testAlert = async (alert: Alert) => {
    if (!user) return;
    await supabase.from('notifications').insert({
      user_id: user.id,
      alert_id: alert.id,
      title: `🧪 Test: ${alert.title}`,
      message: `Test notification for "${alert.title}" alert`,
      type: 'info',
    } as any);
    toast.info(`🔔 Test alert fired: ${alert.title}`);
  };

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'critical') return a.severity === 'critical' || a.severity === 'high';
    return true;
  });

  const alertUnreadCount = alerts.filter(a => !a.is_read).length;

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'high': return 'bg-warning/10 border-warning/30 text-warning';
      case 'medium': return 'bg-primary/10 border-primary/30 text-primary';
      default: return 'bg-muted/40 border-border text-muted-foreground';
    }
  };

  const getLastTriggered = (alert: Alert) => {
    if (!alert.last_triggered_at) return 'Never';
    return formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title="Alerts & Notifications" subtitle="Risk alerts, pattern matches, and trade notifications" />
        <div className="flex items-center gap-2">
          {alertUnreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{alertUnreadCount} unread</Badge>
          )}
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={alertUnreadCount === 0}>
            <Check className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Alerts
            {alertUnreadCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1">{alertUnreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Notification History
            {unreadCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1">{unreadCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">{filtered.length} alerts</Badge>
          </div>

          <Card>
            <ScrollArea className="h-[600px]">
              <CardContent className="p-2">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Loading alerts...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No alerts yet</p>
                    <p className="text-xs mt-1">Alerts from drawdown warnings, streak detections, and risk limits will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map(alert => (
                      <div
                        key={alert.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                          !alert.is_read ? getSeverityColor(alert.severity) : 'bg-transparent border-transparent hover:bg-muted/30',
                        )}
                      >
                        <Bell className={cn("h-4 w-4 mt-0.5 shrink-0", !alert.is_read ? '' : 'text-muted-foreground/50')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm font-medium", alert.is_read && 'text-muted-foreground')}>{alert.title}</p>
                            {alert.severity && <Badge variant="outline" className="text-[9px]">{alert.severity}</Badge>}
                          </div>
                          {alert.message && <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                              Last triggered: {getLastTriggered(alert)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Test Alert" onClick={() => testAlert(alert)}>
                            <TestTube className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          {!alert.is_read && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(alert.id)}>
                              <Check className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAlert(alert.id)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">{notifications.length} notifications</Badge>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllNotifsRead}>
                <Check className="h-4 w-4 mr-1" /> Mark All Read
              </Button>
            )}
          </div>

          <Card>
            <ScrollArea className="h-[600px]">
              <CardContent className="p-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No notification history</p>
                    <p className="text-xs mt-1">Triggered alerts and daily summaries will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                          !notif.read
                            ? notif.type === 'success' ? 'bg-profit/5 border-profit/20' : notif.type === 'warning' ? 'bg-warning/5 border-warning/20' : 'bg-primary/5 border-primary/20'
                            : 'bg-transparent border-transparent hover:bg-muted/30'
                        )}
                        onClick={() => markNotifRead(notif.id)}
                      >
                        <div className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          notif.type === 'success' ? 'bg-profit/10' : notif.type === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
                        )}>
                          {notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium", notif.read && 'text-muted-foreground')}>{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
