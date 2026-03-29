/**
 * Notification Settings Store
 * Manages user preferences for notifications
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationSettings {
  notifyOnCompletion: boolean;
  browserNotificationsEnabled: boolean;
  browserNotificationPermission: NotificationPermission | 'default';
}

interface NotificationSettingsStore extends NotificationSettings {
  setNotifyOnCompletion: (enabled: boolean) => void;
  requestBrowserPermission: () => Promise<boolean>;
  checkPermission: () => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsStore>()(
  persist(
    (set, get) => ({
      notifyOnCompletion: false,
      browserNotificationsEnabled: false,
      browserNotificationPermission: 'default',

      setNotifyOnCompletion: (enabled) => {
        set({ notifyOnCompletion: enabled });
        
        // If enabling and browser notifications not yet granted, request permission
        if (enabled && get().browserNotificationPermission !== 'granted') {
          get().requestBrowserPermission();
        }
      },

      requestBrowserPermission: async () => {
        if (!('Notification' in window)) {
          set({ browserNotificationsEnabled: false, browserNotificationPermission: 'denied' });
          return false;
        }

        try {
          const permission = await Notification.requestPermission();
          set({
            browserNotificationPermission: permission,
            browserNotificationsEnabled: permission === 'granted',
          });
          return permission === 'granted';
        } catch {
          set({ browserNotificationsEnabled: false });
          return false;
        }
      },

      checkPermission: () => {
        if ('Notification' in window) {
          set({
            browserNotificationPermission: Notification.permission,
            browserNotificationsEnabled: Notification.permission === 'granted',
          });
        }
      },
    }),
    { 
      name: 'notification-settings',
      onRehydrateStorage: () => (state) => {
        // Check current permission on rehydrate
        state?.checkPermission();
      }
    }
  )
);

/**
 * Send a browser notification if enabled
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  const { notifyOnCompletion, browserNotificationsEnabled } = useNotificationSettingsStore.getState();
  
  if (!notifyOnCompletion || !browserNotificationsEnabled) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      icon: '/favicon.png',
      badge: '/favicon.png',
      ...options,
    });
  } catch {
    // Notification failed silently (e.g., in service worker context)
  }
}
