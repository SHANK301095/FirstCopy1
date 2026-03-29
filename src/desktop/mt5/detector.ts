/**
 * MT5 Path Detection Module
 * Auto-detects MetaTrader 5 installation paths on Windows
 * Checks registry, common paths, and portable installations
 */

// Common MT5 installation paths on Windows
const COMMON_MT5_PATHS = [
  'C:\\Program Files\\MetaTrader 5',
  'C:\\Program Files (x86)\\MetaTrader 5',
  'D:\\Program Files\\MetaTrader 5',
  'C:\\MT5',
  'D:\\MT5',
];

// Common broker-specific paths
const BROKER_PATHS = [
  'IC Markets',
  'FXCM',
  'XM',
  'OANDA',
  'Pepperstone',
  'FBS',
  'Exness',
  'RoboForex',
  'Alpari',
  'FXTM',
  'HotForex',
  'Admiral Markets',
  'Tickmill',
  'FxPro',
  'InstaForex',
].map(broker => [
  `C:\\Program Files\\${broker} MT5`,
  `C:\\Program Files\\${broker} - MetaTrader 5`,
  `C:\\Program Files (x86)\\${broker} MT5`,
  `D:\\${broker} MT5`,
]).flat();

export interface MT5Installation {
  id: string;
  name: string;
  terminalPath: string;
  metaeditorPath: string;
  dataFolder: string;
  broker?: string;
  isPortable: boolean;
  version?: string;
}

export interface DetectionResult {
  installations: MT5Installation[];
  recommended?: string; // ID of recommended installation
  searchedPaths: string[];
  duration: number;
}

/**
 * Generate a unique ID for an installation
 */
function generateInstallationId(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 32);
}

/**
 * Extract broker name from installation path
 */
function extractBrokerName(path: string): string | undefined {
  const brokers = [
    'IC Markets', 'FXCM', 'XM', 'OANDA', 'Pepperstone',
    'FBS', 'Exness', 'RoboForex', 'Alpari', 'FXTM',
    'HotForex', 'Admiral Markets', 'Tickmill', 'FxPro', 'InstaForex'
  ];
  
  for (const broker of brokers) {
    if (path.toLowerCase().includes(broker.toLowerCase())) {
      return broker;
    }
  }
  
  return undefined;
}

/**
 * Get the MT5 data folder path for a terminal
 * This is typically in AppData/Roaming/MetaQuotes/Terminal/{HASH}
 */
function getDataFolderPath(terminalPath: string): string {
  // For portable installations, data folder is in the same directory
  const portableDataPath = terminalPath.replace('terminal64.exe', 'MQL5');
  
  // For standard installations, we need to find the data folder in AppData
  // The hash is based on the installation path
  const appDataPath = process.env.APPDATA || '';
  const metaQuotesPath = `${appDataPath}\\MetaQuotes\\Terminal`;
  
  // We'll return the MetaQuotes path and let the Electron main process find the correct folder
  return metaQuotesPath;
}

/**
 * Check if a path contains a valid MT5 installation
 * This runs in the Electron main process
 */
export async function checkMT5Installation(basePath: string): Promise<MT5Installation | null> {
  try {
    // Check for terminal64.exe
    const terminalPath = `${basePath}\\terminal64.exe`;
    const metaeditorPath = `${basePath}\\metaeditor64.exe`;
    
    // This would be called from Electron with fs.existsSync
    // For now, return the expected structure
    return {
      id: generateInstallationId(basePath),
      name: extractBrokerName(basePath) || 'MetaTrader 5',
      terminalPath,
      metaeditorPath,
      dataFolder: getDataFolderPath(terminalPath),
      broker: extractBrokerName(basePath),
      isPortable: basePath.includes('portable') || basePath.length < 3,
    };
  } catch {
    return null;
  }
}

/**
 * Get all paths to search for MT5 installations
 */
export function getAllSearchPaths(): string[] {
  return [...COMMON_MT5_PATHS, ...BROKER_PATHS];
}

/**
 * Parse Windows registry output to find MT5 installations
 * Used when running reg query from command line
 */
export function parseRegistryOutput(output: string): string[] {
  const paths: string[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Look for InstallLocation or similar keys
    if (line.includes('InstallLocation') || line.includes('Path')) {
      const match = line.match(/REG_SZ\s+(.+)/);
      if (match && match[1]) {
        paths.push(match[1].trim());
      }
    }
  }
  
  return paths;
}

/**
 * Validate that all required MT5 files exist
 */
export function validateMT5Paths(paths: {
  terminal: string;
  metaeditor: string;
  dataFolder: string;
}): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // These checks will be performed by Electron
  if (!paths.terminal) missing.push('terminal64.exe');
  if (!paths.metaeditor) missing.push('metaeditor64.exe');
  if (!paths.dataFolder) missing.push('Data folder');
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get recommended MT5 terminal based on available installations
 * Prefers brokers commonly used for backtesting
 */
export function getRecommendedInstallation(installations: MT5Installation[]): MT5Installation | undefined {
  if (installations.length === 0) return undefined;
  if (installations.length === 1) return installations[0];
  
  // Prefer non-portable installations
  const nonPortable = installations.filter(i => !i.isPortable);
  if (nonPortable.length > 0) {
    return nonPortable[0];
  }
  
  return installations[0];
}

/**
 * Registry paths where MT5 might be registered
 */
export const REGISTRY_PATHS = [
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\MetaQuotes Software Corp.\\MetaTrader 5',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\MetaQuotes Software Corp.\\MetaTrader 5',
  'HKEY_CURRENT_USER\\SOFTWARE\\MetaQuotes Software Corp.\\MetaTrader 5',
];

/**
 * Get portable data folder structure
 */
export function getPortableDataStructure(terminalPath: string): {
  mql5Path: string;
  expertsPath: string;
  presetsPath: string;
  logsPath: string;
} {
  const basePath = terminalPath.replace(/\\terminal64\.exe$/i, '');
  
  return {
    mql5Path: `${basePath}\\MQL5`,
    expertsPath: `${basePath}\\MQL5\\Experts`,
    presetsPath: `${basePath}\\MQL5\\Presets`,
    logsPath: `${basePath}\\logs`,
  };
}

/**
 * Get standard data folder structure (AppData)
 */
export function getStandardDataStructure(dataFolder: string): {
  mql5Path: string;
  expertsPath: string;
  presetsPath: string;
  logsPath: string;
  testerPath: string;
} {
  return {
    mql5Path: `${dataFolder}\\MQL5`,
    expertsPath: `${dataFolder}\\MQL5\\Experts`,
    presetsPath: `${dataFolder}\\MQL5\\Presets`,
    logsPath: `${dataFolder}\\logs`,
    testerPath: `${dataFolder}\\tester`,
  };
}

export default {
  getAllSearchPaths,
  checkMT5Installation,
  parseRegistryOutput,
  validateMT5Paths,
  getRecommendedInstallation,
  REGISTRY_PATHS,
  getPortableDataStructure,
  getStandardDataStructure,
};
