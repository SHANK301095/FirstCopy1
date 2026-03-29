/**
 * Service Worker Registration
 * Spec: PWA Layer - register SW, track status, log success/failure
 */

import { db } from '@/db';

export interface SWStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  scope?: string;
  updateAvailable: boolean;
  error?: string;
}

let swStatus: SWStatus = {
  isSupported: false,
  isRegistered: false,
  isActive: false,
  updateAvailable: false,
};

let statusChangeCallbacks: Array<(status: SWStatus) => void> = [];

export function getSWStatus(): SWStatus {
  return { ...swStatus };
}

export function onSWStatusChange(callback: (status: SWStatus) => void): () => void {
  statusChangeCallbacks.push(callback);
  return () => {
    statusChangeCallbacks = statusChangeCallbacks.filter(cb => cb !== callback);
  };
}

function notifyStatusChange() {
  statusChangeCallbacks.forEach(cb => cb({ ...swStatus }));
}

export async function registerSW(): Promise<SWStatus> {
  // Check if SW is supported
  if (!('serviceWorker' in navigator)) {
    swStatus = {
      isSupported: false,
      isRegistered: false,
      isActive: false,
      updateAvailable: false,
      error: 'Service Workers not supported in this browser',
    };
    await db.log('warn', 'Service Worker not supported', { userAgent: window.navigator.userAgent });
    notifyStatusChange();
    return swStatus;
  }

  swStatus.isSupported = true;

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    swStatus.isRegistered = true;
    swStatus.scope = registration.scope;

    await db.log('info', 'Service Worker registered', { scope: registration.scope });

    // Check if active
    if (registration.active) {
      swStatus.isActive = true;
      await db.log('info', 'Service Worker is active');
    }

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            swStatus.updateAvailable = true;
            notifyStatusChange();
            db.log('info', 'Service Worker update available');
          }
        });
      }
    });

    // Listen for controlling SW
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      swStatus.isActive = true;
      swStatus.updateAvailable = false;
      notifyStatusChange();
      db.log('info', 'Service Worker now controlling page');
    });

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;
    swStatus.isActive = true;

    notifyStatusChange();
    return swStatus;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    swStatus = {
      isSupported: true,
      isRegistered: false,
      isActive: false,
      updateAvailable: false,
      error: errorMessage,
    };
    await db.log('error', 'Service Worker registration failed', { error: errorMessage });
    notifyStatusChange();
    return swStatus;
  }
}

export async function unregisterSW(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      if (success) {
        swStatus = {
          isSupported: true,
          isRegistered: false,
          isActive: false,
          updateAvailable: false,
        };
        notifyStatusChange();
        await db.log('info', 'Service Worker unregistered');
      }
      return success;
    }
    return false;
  } catch (error) {
    await db.log('error', 'Service Worker unregister failed', { error: String(error) });
    return false;
  }
}

export function skipWaiting(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' });
}
