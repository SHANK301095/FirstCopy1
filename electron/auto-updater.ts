/**
 * Auto-Updater Module for Desktop App
 * Handles checking for updates and applying them
 */

import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import type { UpdateInfo, UpdateDownloadedEvent, ProgressInfo } from 'electron-updater';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;

let mainWindow: BrowserWindow | null = null;
let updateAvailable = false;
let downloadProgress = 0;

/**
 * Initialize auto-updater with main window reference
 */
export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateAvailable = true;
    sendStatusToWindow('available', `Update ${info.version} available`, info);

    const releaseNotesText =
      typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : Array.isArray(info.releaseNotes)
          ? info.releaseNotes.map((n) => n.note).filter(Boolean).join('\n\n')
          : undefined;

    // Ask user if they want to download
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. Would you like to download it now?`,
      detail: releaseNotesText ? `Release notes:\n${releaseNotesText}` : undefined,
      buttons: ['Download', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    updateAvailable = false;
    sendStatusToWindow('not-available', 'You have the latest version');
  });

  autoUpdater.on('error', (err) => {
    sendStatusToWindow('error', `Update error: ${err.message}`);
  });

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    downloadProgress = progressObj.percent;
    sendStatusToWindow('downloading', `Downloading: ${Math.round(progressObj.percent)}%`, {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
    // event also contains version-like fields via UpdateInfo shape
    // but message can be generic without relying on optional fields
    sendStatusToWindow('downloaded', 'Update ready to install', event);

    // Ask user if they want to restart now
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart now to apply?',
      buttons: ['Restart', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // IPC handlers for renderer
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (updateAvailable) {
      autoUpdater.downloadUpdate();
      return { success: true };
    }
    return { success: false, error: 'No update available' };
  });

  ipcMain.handle('updater:install', async () => {
    autoUpdater.quitAndInstall();
    return { success: true };
  });

  ipcMain.handle('updater:getStatus', () => ({
    updateAvailable,
    downloadProgress,
  }));
}

/**
 * Check for updates (can be called manually or on schedule)
 */
export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

/**
 * Send update status to renderer window
 */
function sendStatusToWindow(status: string, message: string, data?: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, message, data });
  }
}

export default {
  initAutoUpdater,
  checkForUpdates,
};
