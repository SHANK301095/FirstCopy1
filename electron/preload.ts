// IMPORTANT:
// Preload must run as a CommonJS-style script in many Electron configurations.
// Avoid top-level ESM `import` here to prevent: "Cannot use import statement outside a module".

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electron = require('electron') as typeof import('electron');
const { contextBridge, ipcRenderer } = electron;

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App configuration
  getConfig: () => ipcRenderer.invoke('app:getConfig'),
  setConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('app:setConfig', config),
  getBackendPort: () => ipcRenderer.invoke('app:getBackendPort'),
  getExportsPath: () => ipcRenderer.invoke('app:getExportsPath'),
  getPaths: () => ipcRenderer.invoke('app:getPaths'),

  // File dialogs
  openCSVDialog: () => ipcRenderer.invoke('dialog:openCSV'),
  selectFolderDialog: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }>; multiple?: boolean }) =>
    ipcRenderer.invoke('dialog:selectFile', options),

  // File system (sandboxed)
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  saveExport: (filename: string, content: string) => ipcRenderer.invoke('fs:saveExport', filename, content),
  exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),

  // Shell operations
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
  openExportsFolder: () => ipcRenderer.invoke('shell:openExportsFolder'),
  showItemInFolder: (path: string) => ipcRenderer.invoke('shell:openPath', path),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  getPerformance: () => ipcRenderer.invoke('system:getPerformance'),

  // Backend diagnostics
  runDiagnostic: (check: string) => ipcRenderer.invoke('diagnostic:run', check),

  // Backend status
  getBackendStatus: () => ipcRenderer.invoke('backend:getStatus'),

  // MT5 Operations
  detectMT5Paths: () => ipcRenderer.invoke('mt5:detectPaths'),
  setWorkerCount: (count: number) => ipcRenderer.invoke('mt5:setWorkerCount', count),
  compileEA: (eaPath: string) => ipcRenderer.invoke('mt5:compileEA', eaPath),
  runTester: (iniPath: string, workerId: string, runId: string) =>
    ipcRenderer.invoke('mt5:runTester', iniPath, workerId, runId),

  // Notifications (Phase 8)
  showNotification: (options: { title: string; body: string; silent?: boolean }) =>
    ipcRenderer.invoke('notification:show', options),
  setNotificationEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('notification:setEnabled', enabled),

  // Window controls (Phase 8)
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  isWindowVisible: () => ipcRenderer.invoke('window:isVisible'),

  // Event listeners
  onMenuOpenCSV: (callback: () => void) => {
    ipcRenderer.on('menu:open-csv', callback);
    return () => ipcRenderer.removeListener('menu:open-csv', callback);
  },

  // Tester progress events
  onTesterProgress: (callback: (data: { runId: string; progress: number; currentDate: string }) => void) => {
    ipcRenderer.on('tester:progress', (_evt, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('tester:progress');
  },

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),
  onUpdateStatus: (callback: (data: { status: string; message: string; data?: unknown }) => void) => {
    ipcRenderer.on('updater:status', (_evt, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('updater:status');
  },
});

// NOTE: Type declarations are already defined in src/types/*.d.ts.
