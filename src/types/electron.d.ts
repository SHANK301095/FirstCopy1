// Type declarations for Electron API exposed via preload script
// This file is only used when running in Electron desktop mode

export interface ElectronAPI {
  getConfig: () => Promise<{
    timezone: string;
    currency: string;
    exportsPath: string;
    lastDataPaths: string[];
  }>;
  setConfig: (config: Record<string, unknown>) => Promise<boolean>;
  getBackendPort: () => Promise<number>;
  getExportsPath: () => Promise<string>;
  getPaths: () => Promise<{
    userData: string;
    documents: string;
    exports: string;
    temp: string;
  }>;
  openCSVDialog: () => Promise<string[]>;
  selectFolderDialog: () => Promise<string | null>;
  readFile: (filePath: string) => Promise<{
    success: boolean;
    content?: string;
    path?: string;
    name?: string;
    error?: string;
  }>;
  writeFile: (filePath: string, content: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  saveExport: (filename: string, content: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
  openPath: (path: string) => Promise<void>;
  openExportsFolder: () => Promise<void>;
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    version: string;
    isPackaged: boolean;
    nodeVersion: string;
  }>;
  getBackendStatus: () => Promise<{
    online: boolean;
    port: number;
    error?: string;
    cpu_percent?: number;
    memory_available_gb?: number;
    memory_total_gb?: number;
  }>;
  runDiagnostic: (check: string) => Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }>;
  onMenuOpenCSV: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
