/**
 * Notification Service
 * Phase L184-193: Email, Push, Telegram, Discord, SMS alerts
 */

export type NotificationChannel = 'email' | 'push' | 'telegram' | 'discord' | 'sms' | 'in-app';

export interface NotificationConfig {
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, string>;
}

export interface AlertCondition {
  id: string;
  name: string;
  type: 'drawdown' | 'profit' | 'trade-complete' | 'backtest-complete' | 
        'daily-pnl' | 'risk-breach' | 'system' | 'custom';
  threshold?: number;
  comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  channels: NotificationChannel[];
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: string;
}

export interface Notification {
  id: string;
  type: AlertCondition['type'];
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  actions?: { label: string; action: string }[];
}

export const DEFAULT_ALERT_CONDITIONS: AlertCondition[] = [
  {
    id: 'drawdown-warning',
    name: 'Drawdown Warning',
    type: 'drawdown',
    threshold: 10,
    comparison: 'gt',
    channels: ['in-app', 'push'],
    enabled: true,
    cooldownMinutes: 60,
  },
  {
    id: 'drawdown-critical',
    name: 'Drawdown Critical',
    type: 'drawdown',
    threshold: 20,
    comparison: 'gt',
    channels: ['in-app', 'push', 'email'],
    enabled: true,
    cooldownMinutes: 30,
  },
  {
    id: 'backtest-complete',
    name: 'Backtest Complete',
    type: 'backtest-complete',
    channels: ['in-app', 'push'],
    enabled: true,
    cooldownMinutes: 0,
  },
  {
    id: 'daily-profit-target',
    name: 'Daily Profit Target Hit',
    type: 'daily-pnl',
    threshold: 2,
    comparison: 'gte',
    channels: ['in-app'],
    enabled: false,
    cooldownMinutes: 1440,
  },
  {
    id: 'daily-loss-cap',
    name: 'Daily Loss Cap Hit',
    type: 'daily-pnl',
    threshold: -3,
    comparison: 'lte',
    channels: ['in-app', 'push', 'email'],
    enabled: true,
    cooldownMinutes: 1440,
  },
];

export const QUIET_HOURS_PRESETS = [
  { id: 'none', label: 'No Quiet Hours', start: '', end: '' },
  { id: 'night', label: 'Night (10 PM - 7 AM)', start: '22:00', end: '07:00' },
  { id: 'weekend', label: 'Weekends Only', start: 'sat-00:00', end: 'sun-23:59' },
  { id: 'custom', label: 'Custom', start: '', end: '' },
];

class NotificationServiceClass {
  private static instance: NotificationServiceClass;
  private notifications: Notification[] = [];
  private conditions: AlertCondition[] = DEFAULT_ALERT_CONDITIONS;
  private channels: Map<NotificationChannel, NotificationConfig> = new Map();
  private quietHoursStart: string = '';
  private quietHoursEnd: string = '';
  
  private constructor() {
    this.loadFromStorage();
  }
  
  static getInstance(): NotificationServiceClass {
    if (!NotificationServiceClass.instance) {
      NotificationServiceClass.instance = new NotificationServiceClass();
    }
    return NotificationServiceClass.instance;
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mmc_notifications');
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications = data.notifications || [];
        this.conditions = data.conditions || DEFAULT_ALERT_CONDITIONS;
        this.quietHoursStart = data.quietHoursStart || '';
        this.quietHoursEnd = data.quietHoursEnd || '';
      }
    } catch {
      // Use defaults
    }
  }
  
  private saveToStorage(): void {
    try {
      localStorage.setItem('mmc_notifications', JSON.stringify({
        notifications: this.notifications.slice(0, 100), // Keep last 100
        conditions: this.conditions,
        quietHoursStart: this.quietHoursStart,
        quietHoursEnd: this.quietHoursEnd,
      }));
    } catch {
      // Storage full, clear old notifications
      this.notifications = this.notifications.slice(0, 50);
    }
  }
  
  // Check if within quiet hours
  private isQuietHours(): boolean {
    if (!this.quietHoursStart || !this.quietHoursEnd) return false;
    
    const now = new Date();
    const [startH, startM] = this.quietHoursStart.split(':').map(Number);
    const [endH, endM] = this.quietHoursEnd.split(':').map(Number);
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Quiet hours span midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }
  
  // Check cooldown
  private isCooldownActive(condition: AlertCondition): boolean {
    if (!condition.lastTriggered || condition.cooldownMinutes === 0) return false;
    
    const lastTriggered = new Date(condition.lastTriggered).getTime();
    const cooldownMs = condition.cooldownMinutes * 60 * 1000;
    
    return Date.now() - lastTriggered < cooldownMs;
  }
  
  // Trigger alert
  async triggerAlert(
    type: AlertCondition['type'],
    data: { title: string; message: string; value?: number; priority?: Notification['priority']; metadata?: Record<string, unknown> }
  ): Promise<boolean> {
    // Find matching conditions
    const matchingConditions = this.conditions.filter(c => 
      c.type === type && c.enabled && !this.isCooldownActive(c)
    );
    
    if (matchingConditions.length === 0) return false;
    
    // Check threshold if applicable
    const validConditions = matchingConditions.filter(c => {
      if (!c.threshold || data.value === undefined) return true;
      
      switch (c.comparison) {
        case 'gt': return data.value > c.threshold;
        case 'lt': return data.value < c.threshold;
        case 'gte': return data.value >= c.threshold;
        case 'lte': return data.value <= c.threshold;
        case 'eq': return data.value === c.threshold;
        default: return true;
      }
    });
    
    if (validConditions.length === 0) return false;
    
    // Create notification
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: data.title,
      message: data.message,
      timestamp: new Date().toISOString(),
      read: false,
      priority: data.priority || 'medium',
      data: data.metadata,
    };
    
    // Add to in-app notifications
    this.notifications.unshift(notification);
    
    // Update last triggered
    validConditions.forEach(c => {
      c.lastTriggered = new Date().toISOString();
    });
    
    this.saveToStorage();
    
    // Check quiet hours for external notifications
    const isQuiet = this.isQuietHours();
    
    // Send to channels
    const channels = new Set(validConditions.flatMap(c => c.channels));
    
    for (const channel of channels) {
      if (channel === 'in-app') continue; // Already handled
      
      // Skip external channels during quiet hours for non-urgent
      if (isQuiet && notification.priority !== 'urgent') continue;
      
      await this.sendToChannel(channel, notification);
    }
    
    // Trigger browser notification if available
    if (channels.has('push') && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.png',
          tag: notification.id,
        });
      }
    }
    
    return true;
  }
  
  private async sendToChannel(channel: NotificationChannel, notification: Notification): Promise<void> {
    const config = this.channels.get(channel);
    if (!config?.enabled) return;
    
    // Log to secure logger instead of console - external API calls coming soon
    const { secureLogger } = await import('@/lib/secureLogger');
    switch (channel) {
      case 'email':
        secureLogger.info('system', `Notification queued: Email - ${notification.title}`, { type: notification.type });
        break;
      case 'telegram':
        secureLogger.info('system', `Notification queued: Telegram - ${notification.title}`, { type: notification.type });
        break;
      case 'discord':
        secureLogger.info('system', `Notification queued: Discord - ${notification.title}`, { type: notification.type });
        break;
      case 'sms':
        secureLogger.info('system', `Notification queued: SMS - ${notification.title}`, { type: notification.type });
        break;
      default:
        break;
    }
  }
  
  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
  
  // Get all notifications
  getNotifications(limit: number = 50): Notification[] {
    return this.notifications.slice(0, limit);
  }
  
  // Mark as read
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
    }
  }
  
  // Mark all as read
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
  }
  
  // Clear notifications
  clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
  }
  
  // Update condition
  updateCondition(id: string, updates: Partial<AlertCondition>): void {
    const condition = this.conditions.find(c => c.id === id);
    if (condition) {
      Object.assign(condition, updates);
      this.saveToStorage();
    }
  }
  
  // Get conditions
  getConditions(): AlertCondition[] {
    return [...this.conditions];
  }
  
  // Set quiet hours
  setQuietHours(start: string, end: string): void {
    this.quietHoursStart = start;
    this.quietHoursEnd = end;
    this.saveToStorage();
  }
  
  // Request push permission
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
}

export const NotificationService = NotificationServiceClass.getInstance();
