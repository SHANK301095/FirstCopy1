/**
 * Debug Bundle Creator
 * Creates a ZIP file with logs, configs, and system info for troubleshooting
 */

import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

interface DebugInfo {
  timestamp: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  platform: string;
  arch: string;
  osVersion: string;
  totalMemory: string;
  freeMemory: string;
  cpuModel: string;
  cpuCores: number;
  env: Record<string, string>;
  mt5Detected: boolean;
  backendStatus: string;
}

/**
 * Initialize debug bundle IPC handlers
 */
export function initDebugBundle() {
  ipcMain.handle('debug:createBundle', async () => {
    return await createDebugBundle();
  });

  ipcMain.handle('debug:getSystemInfo', async () => {
    return getSystemInfo();
  });
}

/**
 * Get comprehensive system information
 */
function getSystemInfo(): DebugInfo {
  const cpus = os.cpus();
  
  return {
    timestamp: new Date().toISOString(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    osVersion: os.release(),
    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    cpuModel: cpus[0]?.model || 'Unknown',
    cpuCores: cpus.length,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      HOME: process.env.HOME || process.env.USERPROFILE || 'unknown',
    },
    mt5Detected: false, // Will be updated
    backendStatus: 'unknown', // Will be updated
  };
}

/**
 * Create debug bundle ZIP file
 */
async function createDebugBundle(): Promise<string> {
  const bundleDir = path.join(app.getPath('temp'), `debug-bundle-${Date.now()}`);
  const bundlePath = path.join(app.getPath('documents'), 'EA-Backtests', 'debug-bundles');
  
  // Create directories
  fs.mkdirSync(bundleDir, { recursive: true });
  fs.mkdirSync(bundlePath, { recursive: true });

  try {
    // 1. Write system info
    const sysInfo = getSystemInfo();
    fs.writeFileSync(
      path.join(bundleDir, 'system-info.json'),
      JSON.stringify(sysInfo, null, 2)
    );

    // 2. Copy app config
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      // Sanitize sensitive data
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      delete config.apiKeys;
      delete config.tokens;
      fs.writeFileSync(
        path.join(bundleDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );
    }

    // 3. Copy electron logs
    const logsPath = path.join(app.getPath('userData'), 'logs');
    if (fs.existsSync(logsPath)) {
      const logFiles = fs.readdirSync(logsPath).slice(-5); // Last 5 log files
      for (const logFile of logFiles) {
        const content = fs.readFileSync(path.join(logsPath, logFile), 'utf-8');
        fs.writeFileSync(path.join(bundleDir, `log-${logFile}`), content);
      }
    }

    // 4. Get installed software versions
    const versions: Record<string, string> = {};
    try {
      if (process.platform === 'win32') {
        try {
          versions.python = execSync('python --version 2>&1', { encoding: 'utf-8' }).trim();
        } catch { versions.python = 'Not found'; }
        
        try {
          versions.node = execSync('node --version', { encoding: 'utf-8' }).trim();
        } catch { versions.node = 'Not found'; }
      }
    } catch {
      // Ignore version check errors
    }
    fs.writeFileSync(
      path.join(bundleDir, 'versions.json'),
      JSON.stringify(versions, null, 2)
    );

    // 5. Create the ZIP file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipPath = path.join(bundlePath, `debug-bundle-${timestamp}.zip`);

    // Use native compression (Windows)
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Compress-Archive -Path '${bundleDir}\\*' -DestinationPath '${zipPath}'"`,
        { encoding: 'utf-8' }
      );
    } else {
      // Unix-like systems
      execSync(`cd "${bundleDir}" && zip -r "${zipPath}" .`);
    }

    // Cleanup temp directory
    fs.rmSync(bundleDir, { recursive: true, force: true });

    return zipPath;
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(bundleDir)) {
      fs.rmSync(bundleDir, { recursive: true, force: true });
    }
    throw error;
  }
}

export default {
  initDebugBundle,
  getSystemInfo,
  createDebugBundle,
};
