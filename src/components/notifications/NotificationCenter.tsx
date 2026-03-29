/**
 * Notification Center Component
 * Real DB-backed notifications with bell badge
 */

import { useState } from 'react';
import { 
  Bell, BellOff, Mail, MessageSquare, Smartphone, 
  X, Check, Trash2, Settings, Clock, AlertCircle,
  CheckCircle, Info, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/hooks/useNotifications';

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors = {
  info: 'text-primary',
  success: 'text-profit',
  warning: 'text-warning',
  error: 'text-destructive',
};

const typeBgColors = {
  info: 'bg-primary/10',
  success: 'bg-profit/10',
  warning: 'bg-warning/10',
  error: 'bg-destructive/10',
};

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const [channels, setChannels] = useState({
    app: true,
    email: false,
    telegram: false,
    push: true,
  });

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Notification Settings</SheetTitle>
                    <SheetDescription>Configure how you receive notifications</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Channels</h4>
                      {[
                        { key: 'app' as const, icon: Bell, label: 'In-App Notifications' },
                        { key: 'email' as const, icon: Mail, label: 'Email Notifications' },
                        { key: 'telegram' as const, icon: MessageSquare, label: 'Telegram Bot' },
                        { key: 'push' as const, icon: Smartphone, label: 'Push Notifications' },
                      ].map(ch => (
                        <div key={ch.key} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ch.icon className="h-4 w-4" />
                            <Label>{ch.label}</Label>
                          </div>
                          <Switch
                            checked={channels[ch.key]}
                            onCheckedChange={(v) => setChannels(c => ({ ...c, [ch.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BellOff className="h-12 w-12 mb-4 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.slice(0, 10).map((notification) => {
                  const nType = notification.type as keyof typeof typeIcons;
                  const Icon = typeIcons[nType] || Info;
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group',
                        !notification.read && 'bg-primary/5'
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          typeBgColors[nType] || typeBgColors.info
                        )}>
                          <Icon className={cn('h-4 w-4', typeColors[nType] || typeColors.info)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'font-medium text-sm',
                              notification.read && 'text-muted-foreground'
                            )}>
                              {notification.title}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {!notification.read && (
                              <Badge variant="default" className="text-xs h-4">New</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
