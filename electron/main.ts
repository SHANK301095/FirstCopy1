import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  Tray,
  Notification,
  nativeImage,
  clipboard,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess, execSync } from 'child_process';
import net from 'net';
import os from 'os';
import { fileURLToPath } from 'url';

// ESM-safe __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import modules
import { initDebugBundle } from './debug-bundle.js';
import { initAutoUpdater, checkForUpdates } from './auto-updater.js';

// Tray and notifications
let tray: Tray | null = null;
let notificationsEnabled = true;

// Environment
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
const isPackaged = app.isPackaged;

// Paths
const getResourcePath = (...paths: string[]) => {
  if (isPackaged) {
    return path.join(process.resourcesPath, ...paths);
  }
  return path.join(__dirname, '..', ...paths);
};

const getExportsPath = () => {
  const defaultPath = path.join(app.getPath('documents'), 'EA-Backtests');
  const configPath = path.join(app.getPath('userData'), 'config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.exportsPath && fs.existsSync(config.exportsPath)) {
        return config.exportsPath;
      }
    }
  } catch (e) {
    console.error('Failed to read config:', e);
  }
  
  // Ensure default path exists
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
  }
  
  return defaultPath;
};

// Backend process management
let backendProcess: ChildProcess | null = null;
let backendPort: number = 32145;
let mainWindow: BrowserWindow | null = null;

// Find a free port
const findFreePort = (startPort: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      if (startPort < 65535) {
        resolve(findFreePort(startPort + 1));
      } else {
        reject(new Error('No free port found'));
      }
    });
  });
};

// Health check with retries
const waitForBackend = async (port: number, maxRetries = 30): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        console.log(`Backend healthy on port ${port}`);
        return true;
      }
    } catch {
      // Backend not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const getBackendPath = () => {
  if (isPackaged) return path.join(process.resourcesPath, 'backend');
  // When running `npx electron dist-electron/main.js`, cwd is typically repo root.
  // Using cwd avoids brittle __dirname assumptions.
  return path.join(process.cwd(), 'backend');
};

const getVenvPythonPath = (backendPath: string) => {
  if (process.platform === 'win32') {
    return path.join(backendPath, '.venv', 'Scripts', 'python.exe');
  }
  return path.join(backendPath, '.venv', 'bin', 'python');
};

const getBackendLogPath = () => {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  return path.join(logsDir, 'backend-stderr.log');
};

const appendBackendLog = (text: string) => {
  try {
    fs.appendFileSync(getBackendLogPath(), text);
  } catch {
    // ignore
  }
};

const runProcess = (
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<{ code: number; stdout: string; stderr: string }> => {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => (stdout += String(d)));
    child.stderr?.on('data', (d) => (stderr += String(d)));

    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: String(err) }));
  });
};

const extractMissingModule = (stderr: string): string | null => {
  const m = stderr.match(/ModuleNotFoundError: No module named ['"]([^'"]+)['"]/);
  return m?.[1] ?? null;
};

const showBackendSetupDialog = async (missingModule: string | null, details: string) => {
  const commands = [
    'cd backend',
    'py -m venv .venv',
    '.\\.venv\\Scripts\\Activate.ps1',
    'pip install -r requirements.txt',
  ].join('\n');

  const message = missingModule
    ? `Backend Python dependency missing: ${missingModule}`
    : 'Backend Python dependencies are not installed.';

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Backend setup required',
    message,
    detail:
      `Dev mode can auto-install dependencies, but it failed.\n\n` +
      `Next step (copy/paste in PowerShell):\n\n${commands}\n\n` +
      `Full error logged to: ${getBackendLogPath()}\n\n` +
      `Error details:\n${details}`,
    buttons: ['Copy setup commands', 'Open backend log', 'Continue without backend'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });

  if (response === 0) {
    clipboard.writeText(commands);
  }
  if (response === 1) {
    await shell.openPath(getBackendLogPath());
  }
};

const ensureDevBackendDeps = async (backendPath: string) => {
  const venvPython = getVenvPythonPath(backendPath);

  // Ensure venv exists with pip included
  if (!fs.existsSync(venvPython)) {
    const venvCmd = process.platform === 'win32' ? 'py' : 'python3';
    // Use --upgrade-deps to ensure pip is installed and up-to-date
    const venvRes = await runProcess(venvCmd, ['-m', 'venv', '.venv', '--upgrade-deps'], { cwd: backendPath });
    appendBackendLog(`\n[venv create] ${new Date().toISOString()}\n${venvRes.stdout}\n${venvRes.stderr}\n`);
    if (venvRes.code !== 0 || !fs.existsSync(venvPython)) {
      throw new Error(venvRes.stderr || 'Failed to create venv');
    }
  }

  // Ensure pip exists in venv (fallback for broken venvs)
  const pipCheck = await runProcess(venvPython, ['-m', 'pip', '--version'], { cwd: backendPath });
  if (pipCheck.code !== 0) {
    appendBackendLog(`\n[pip missing, running ensurepip] ${new Date().toISOString()}\n`);
    const ensurepip = await runProcess(venvPython, ['-m', 'ensurepip', '--upgrade'], { cwd: backendPath });
    appendBackendLog(`[ensurepip] ${ensurepip.stdout}\n${ensurepip.stderr}\n`);
    if (ensurepip.code !== 0) {
      throw new Error(ensurepip.stderr || 'Failed to install pip in venv. Try: py -m venv .venv --upgrade-deps');
    }
  }

  // Preflight import
  const preflight = await runProcess(venvPython, ['-c', 'import fastapi'], { cwd: backendPath });
  if (preflight.code === 0) return;

  // Upgrade pip first (helps with wheel issues on Python 3.13)
  await runProcess(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'], { cwd: backendPath });

  // Install deps
  const install = await runProcess(
    venvPython,
    ['-m', 'pip', 'install', '-r', 'requirements.txt'],
    { cwd: backendPath }
  );
  appendBackendLog(`\n[pip install] ${new Date().toISOString()}\n${install.stdout}\n${install.stderr}\n`);

  // Re-check
  const recheck = await runProcess(venvPython, ['-c', 'import fastapi'], { cwd: backendPath });
  appendBackendLog(`\n[preflight recheck] ${new Date().toISOString()}\n${recheck.stdout}\n${recheck.stderr}\n`);
  if (recheck.code !== 0) {
    const missing = extractMissingModule(preflight.stderr) ?? extractMissingModule(recheck.stderr);
    throw Object.assign(new Error(recheck.stderr || preflight.stderr || 'Backend deps missing'), {
      missingModule: missing,
    });
  }
};

// Start Python backend
const startBackend = async (): Promise<boolean> => {
  backendPort = await findFreePort(32145);
  console.log(`Starting backend on port ${backendPort}`);

  const backendPath = getBackendPath();

  const backendExecutable = process.platform === 'win32'
    ? path.join(backendPath, 'dist', 'backtest_server', 'backtest_server.exe')
    : path.join(backendPath, 'dist', 'backtest_server', 'backtest_server');

  // Check if bundled executable exists, otherwise use Python
  if (fs.existsSync(backendExecutable)) {
    backendProcess = spawn(backendExecutable, ['--port', String(backendPort)], {
      cwd: backendPath,
      env: { ...process.env, PORT: String(backendPort) },
      windowsHide: true,
    });
  } else {
    // In production we should not try to pip-install; packaged builds are expected
    // to ship with the bundled backend executable.
    if (isPackaged) {
      appendBackendLog(`\n[backend] ${new Date().toISOString()}\nMissing bundled backend executable at: ${backendExecutable}\n`);
      await showBackendSetupDialog(null, `Missing bundled backend executable at:\n${backendExecutable}`);
      return false;
    }

    // Dev mode: auto-create venv and install deps if needed.
    try {
      await ensureDevBackendDeps(backendPath);
    } catch (e) {
      const err = e as Error & { missingModule?: string };
      const details = String(err?.message || e);
      appendBackendLog(`\n[backend setup failed] ${new Date().toISOString()}\n${details}\n`);
      await showBackendSetupDialog(err.missingModule ?? null, details);
      return false;
    }

    const pythonExe = getVenvPythonPath(backendPath);
    const mainPy = path.join(backendPath, 'main.py');

    backendProcess = spawn(pythonExe, [mainPy, '--port', String(backendPort)], {
      cwd: backendPath,
      env: { ...process.env, PORT: String(backendPort) },
      windowsHide: true,
    });
  }

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    const text = String(data);
    console.error(`[Backend Error] ${text}`);
    appendBackendLog(text);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    backendProcess = null;
  });

  // Wait for backend to be ready
  const isHealthy = await waitForBackend(backendPort);
  if (!isHealthy) {
    appendBackendLog(`\n[backend] ${new Date().toISOString()}\nBackend failed health check on port ${backendPort}\n`);
    return false;
  }

  return true;
};

// Stop backend gracefully
const stopBackend = () => {
  if (backendProcess) {
    console.log('Stopping backend...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
      setTimeout(() => {
        if (backendProcess) {
          backendProcess.kill('SIGKILL');
        }
      }, 5000);
    }
    backendProcess = null;
  }
};

// Create main window
let isQuitting = false;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'EA Backtesting Studio',
    icon: path.join(__dirname, '../public/favicon.ico'),
    backgroundColor: '#0b0f17',
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const showLoadError = async (title: string, detail: string) => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body{font-family:system-ui;padding:40px;background:#0b0f17;color:#e6edf7;}
      h1{color:#ff6b6b;margin:0 0 12px;}
      code,pre{background:#111827;padding:10px 12px;border-radius:10px;display:block;overflow:auto;}
      a{color:#93c5fd}
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>${detail}</p>
    <h3>Quick fix</h3>
    <ol>
      <li>Terminal 1: <code>npm run dev</code> (wait for “ready”)</li>
      <li>Terminal 2: <code>npx tsc -p electron/tsconfig.json</code></li>
      <li>Terminal 2: <code>npx electron dist-electron/main.js</code></li>
    </ol>
    <h3>Debug</h3>
    <p>DevTools is opened automatically in dev mode. Check Console for errors.</p>
  </body>
</html>`;

    try {
      await mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    } catch {
      // ignore
    }
  };

  // Always open DevTools in dev mode so "blank window" has visible errors.
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('did-fail-load', async (_event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load', { errorCode, errorDescription, validatedURL });
    await showLoadError('Failed to load app', `<pre>${errorCode}: ${errorDescription}\n${validatedURL}</pre>`);
  });

  mainWindow.webContents.on('render-process-gone', async (_event, details) => {
    console.error('render-process-gone', details);
    await showLoadError('Renderer crashed', `<pre>${JSON.stringify(details, null, 2)}</pre>`);
  });

  // Block remote URLs
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // CSP Headers
  // NOTE: Desktop app needs to talk to the backend auth endpoints + (optionally) load Google Fonts.
  // Keep this as tight as possible while still supporting required network calls.
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            // Allow local dev + local python backend + Lovable Cloud backend (auth/db/functions)
            "connect-src 'self' http://127.0.0.1:* http://localhost:* https://*.supabase.co wss://*.supabase.co",
          ].join('; '),
        ],
      },
    });
  });

  // Load the app - try Vite dev server first, fallback to built files
  if (isDev) {
    try {
      const preferredUrl = process.env.VITE_DEV_SERVER_URL;
      const candidates = preferredUrl
        ? [preferredUrl]
        : [
            'http://localhost:5173',
            ...Array.from({ length: 11 }, (_, i) => `http://localhost:${8080 + i}`),
          ];

      let loaded = false;
      for (const url of candidates) {
        const u = url.replace(/\/$/, '');
        const ok = await fetch(`${u}/`, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
        if (ok) {
          await mainWindow.loadURL(u);
          loaded = true;
          break;
        }
      }

      if (!loaded) {
        // Vite not running, try built files
        const builtIndex = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(builtIndex)) {
          console.log('Vite not running, loading built files from:', builtIndex);
          await mainWindow.loadFile(builtIndex);
        } else {
          await showLoadError(
            'Dev server not running',
            'Vite dev server is not running and no built files were found in <code>dist/</code>.'
          );
        }
      }
    } catch (e) {
      console.error('Failed to load app:', e);
      const builtIndex = path.join(process.cwd(), 'dist', 'index.html');
      if (fs.existsSync(builtIndex)) {
        await mainWindow.loadFile(builtIndex);
      } else {
        await showLoadError('Failed to load app', `<pre>${String(e)}</pre>`);
      }
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Minimize to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();

      // Show notification that app is still running
      if (Notification.isSupported() && notificationsEnabled) {
        new Notification({
          title: 'EA Backtesting Studio',
          body: 'App minimized to tray. Click tray icon to restore.',
          silent: true,
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Build menu
const buildMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open CSV...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-csv'),
        },
        { type: 'separator' },
        {
          label: 'Open Exports Folder',
          click: () => shell.openPath(getExportsPath()),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            checkForUpdates();
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              title: 'EA Backtesting Studio',
              message: `EA Backtesting Studio v${app.getVersion()}`,
              detail: 'Offline desktop application for backtesting trading strategies.\n\nTimezone: Asia/Kolkata (IST)\nCurrency: INR\n\n© 2024',
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

// IPC Handlers
ipcMain.handle('app:getConfig', () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read config:', e);
  }
  return {
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    exportsPath: getExportsPath(),
    lastDataPaths: [],
  };
});

ipcMain.handle('app:setConfig', (_, config) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to write config:', e);
    return false;
  }
});

ipcMain.handle('app:getBackendPort', () => backendPort);

ipcMain.handle('app:getExportsPath', () => getExportsPath());

ipcMain.handle('app:getPaths', () => ({
  userData: app.getPath('userData'),
  documents: app.getPath('documents'),
  exports: getExportsPath(),
  temp: app.getPath('temp'),
}));

ipcMain.handle('dialog:openCSV', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select CSV Files',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile', 'multiSelections'],
  });
  return result.filePaths;
});

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content, path: filePath, name: path.basename(filePath) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('fs:saveExport', async (_, filename: string, content: string) => {
  try {
    const exportDir = getExportsPath();
    const filePath = path.join(exportDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

ipcMain.handle('shell:openPath', async (_, targetPath: string) => {
  await shell.openPath(targetPath);
});

ipcMain.handle('shell:openExportsFolder', async () => {
  await shell.openPath(getExportsPath());
});

ipcMain.handle('system:getInfo', () => ({
  platform: process.platform,
  arch: process.arch,
  version: app.getVersion(),
  isPackaged: app.isPackaged,
  nodeVersion: process.version,
}));

// Backend Setup Diagnostics (whitelisted commands only)
ipcMain.handle('diagnostic:run', async (_, check: string) => {
  const backendPath = getBackendPath();
  const venvPython = getVenvPythonPath(backendPath);
  const requirementsPath = path.join(backendPath, 'requirements.txt');

  const runCmd = (cmd: string, args: string[], cwd?: string): Promise<{ success: boolean; output?: string; error?: string }> => {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, { cwd, windowsHide: true });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d) => (stdout += String(d)));
      child.stderr?.on('data', (d) => (stderr += String(d)));
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout.trim() });
        } else {
          resolve({ success: false, error: stderr.trim() || stdout.trim() || `Exit code: ${code}` });
        }
      });
      child.on('error', (err) => resolve({ success: false, error: String(err) }));
    });
  };

  switch (check) {
    case 'python-version': {
      // Check if system Python is available
      const cmd = process.platform === 'win32' ? 'python' : 'python3';
      return runCmd(cmd, ['--version']);
    }

    case 'venv-exists': {
      if (fs.existsSync(venvPython)) {
        return { success: true, output: venvPython };
      }
      return { success: false, error: `Not found: ${venvPython}` };
    }

    case 'pip-check': {
      if (!fs.existsSync(venvPython)) {
        return { success: false, error: 'venv python not found' };
      }
      return runCmd(venvPython, ['-c', "import pip; print('pip ' + pip.__version__)"], backendPath);
    }

    case 'requirements-exists': {
      if (fs.existsSync(requirementsPath)) {
        return { success: true, output: requirementsPath };
      }
      return { success: false, error: `Not found: ${requirementsPath}` };
    }

    case 'deps-check': {
      if (!fs.existsSync(venvPython)) {
        return { success: false, error: 'venv python not found' };
      }
      // Check core dependencies
      return runCmd(venvPython, ['-c', "import fastapi, pandas, numpy; print('Core deps OK')"], backendPath);
    }

    // Git Auth Doctor checks
    case 'git-version': {
      return runCmd('git', ['--version']);
    }

    case 'git-remote': {
      return runCmd('git', ['remote', '-v'], process.cwd());
    }

    case 'git-gcm': {
      return runCmd('git', ['config', '--global', 'credential.helper']);
    }

    case 'git-ssh-check': {
      // Check if SSH is available and keys exist
      const userProfile = process.env.USERPROFILE || process.env.HOME || '';
      const sshDir = path.join(userProfile, '.ssh');
      const ed25519Key = path.join(sshDir, 'id_ed25519');
      const rsaKey = path.join(sshDir, 'id_rsa');
      
      const hasEd25519 = fs.existsSync(ed25519Key);
      const hasRsa = fs.existsSync(rsaKey);
      
      if (hasEd25519 || hasRsa) {
        const keyType = hasEd25519 ? 'ed25519' : 'rsa';
        return { success: true, output: `SSH key found: id_${keyType}` };
      }
      return { success: false, error: 'No SSH keys found in ~/.ssh (id_ed25519 or id_rsa)' };
    }

    case 'git-ssh-auth-test': {
      // Test SSH auth to GitHub (non-interactive)
      return new Promise((resolve) => {
        const child = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-T', 'git@github.com'], {
          windowsHide: true,
          timeout: 10000,
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (d) => (stdout += String(d)));
        child.stderr?.on('data', (d) => (stderr += String(d)));
        child.on('close', (code) => {
          // GitHub returns exit code 1 even on success with message "Hi username!"
          const output = stdout + stderr;
          if (output.includes('successfully authenticated') || output.includes('Hi ')) {
            resolve({ success: true, output: output.trim() });
          } else if (output.includes('Permission denied')) {
            resolve({ success: false, error: 'Permission denied - SSH key not added to GitHub or not in agent' });
          } else if (output.includes('Host key verification')) {
            resolve({ success: false, error: 'Host key verification failed - run: ssh-keygen -R github.com' });
          } else {
            resolve({ success: false, error: output.trim() || `Exit code: ${code}` });
          }
        });
        child.on('error', (err) => resolve({ success: false, error: String(err) }));
      });
    }

    case 'git-https-auth-test': {
      // Test HTTPS auth by listing remote refs (won't prompt in batch mode)
      return new Promise((resolve) => {
        const child = spawn('git', ['ls-remote', '--heads', 'origin'], {
          cwd: process.cwd(),
          windowsHide: true,
          timeout: 15000,
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }, // Disable credential prompt
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (d) => (stdout += String(d)));
        child.stderr?.on('data', (d) => (stderr += String(d)));
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, output: 'HTTPS authentication successful' });
          } else {
            const error = stderr.trim() || stdout.trim();
            if (error.includes('could not read Username') || error.includes('Authentication failed')) {
              resolve({ success: false, error: 'Authentication required - run "git pull" in terminal to authenticate' });
            } else {
              resolve({ success: false, error: error || `Exit code: ${code}` });
            }
          }
        });
        child.on('error', (err) => resolve({ success: false, error: String(err) }));
      });
    }

    default:
      return { success: false, error: `Unknown check: ${check}` };
  }
});
ipcMain.handle('mt5:detectPaths', async () => {
  const result = {
    metaeditor: null as string | null,
    terminal: null as string | null,
    dataFolder: null as string | null,
    detected: false,
    installations: [] as Array<{
      name: string;
      terminalPath: string;
      metaeditorPath: string;
      dataFolder: string;
    }>,
  };

  try {
    // Common installation paths to check
    const searchPaths = [
      'C:\\Program Files\\MetaTrader 5',
      'C:\\Program Files (x86)\\MetaTrader 5',
      'D:\\Program Files\\MetaTrader 5',
      'C:\\MT5',
      'D:\\MT5',
    ];

    // Add broker-specific paths
    const brokers = ['IC Markets', 'XM', 'OANDA', 'Pepperstone', 'Exness', 'FXTM', 'Alpari'];
    for (const broker of brokers) {
      searchPaths.push(`C:\\Program Files\\${broker} MT5`);
      searchPaths.push(`C:\\Program Files\\${broker} - MetaTrader 5`);
    }

    // Try to find from registry (Windows only)
    if (process.platform === 'win32') {
      try {
        const regQuery = execSync(
          'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "MetaTrader" 2>nul',
          { encoding: 'utf-8', timeout: 5000 }
        );
        
        const lines = regQuery.split('\n');
        for (const line of lines) {
          if (line.includes('InstallLocation')) {
            const match = line.match(/REG_SZ\s+(.+)/);
            if (match && match[1]) {
              searchPaths.unshift(match[1].trim());
            }
          }
        }
      } catch {
        // Registry query failed, continue with file system search
      }
    }

    // Check each path for MT5 installation
    for (const basePath of searchPaths) {
      const terminalPath = path.join(basePath, 'terminal64.exe');
      const metaeditorPath = path.join(basePath, 'metaeditor64.exe');

      if (fs.existsSync(terminalPath) && fs.existsSync(metaeditorPath)) {
        // Find data folder
        let dataFolder = '';
        const appDataPath = process.env.APPDATA || '';
        const metaQuotesPath = path.join(appDataPath, 'MetaQuotes', 'Terminal');

        if (fs.existsSync(metaQuotesPath)) {
          const folders = fs.readdirSync(metaQuotesPath);
          for (const folder of folders) {
            const originPath = path.join(metaQuotesPath, folder, 'origin.txt');
            if (fs.existsSync(originPath)) {
              try {
                const origin = fs.readFileSync(originPath, 'utf-8').trim();
                if (origin.toLowerCase() === basePath.toLowerCase()) {
                  dataFolder = path.join(metaQuotesPath, folder);
                  break;
                }
              } catch {
                // Continue searching
              }
            }
          }
          
          // If no matching origin found, use first folder with MQL5
          if (!dataFolder) {
            for (const folder of folders) {
              const mql5Path = path.join(metaQuotesPath, folder, 'MQL5');
              if (fs.existsSync(mql5Path)) {
                dataFolder = path.join(metaQuotesPath, folder);
                break;
              }
            }
          }
        }

        // Check for portable installation
        const portableMql5 = path.join(basePath, 'MQL5');
        if (!dataFolder && fs.existsSync(portableMql5)) {
          dataFolder = basePath;
        }

        const installation = {
          name: path.basename(basePath),
          terminalPath,
          metaeditorPath,
          dataFolder,
        };

        result.installations.push(installation);

        // Use first found as default
        if (!result.detected) {
          result.terminal = terminalPath;
          result.metaeditor = metaeditorPath;
          result.dataFolder = dataFolder;
          result.detected = true;
        }
      }
    }
  } catch (error) {
    console.error('MT5 detection error:', error);
  }

  return result;
});

ipcMain.handle('mt5:setWorkerCount', async (_, count: number) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    config = { ...config, workerCount: Math.min(Math.max(1, count), 4) };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

ipcMain.handle('dialog:selectFile', async (_, options?: { 
  filters?: Array<{ name: string; extensions: string[] }>;
  multiple?: boolean;
}) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select File',
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
  });
  return result.filePaths;
});

// EA Compilation
ipcMain.handle('mt5:compileEA', async (_, eaPath: string) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let metaeditorPath = '';
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      metaeditorPath = config.mt5Paths?.metaeditor || '';
    }
  } catch {
    // Use default
  }

  if (!metaeditorPath || !fs.existsSync(metaeditorPath)) {
    return {
      success: false,
      eaPath,
      errors: [{ line: 0, message: 'MetaEditor path not configured', file: '' }],
      warnings: [],
      logContent: '',
      duration: 0,
    };
  }

  const startTime = Date.now();
  const logPath = eaPath.replace('.mq5', '.log');

  return new Promise((resolve) => {
    const process = spawn(metaeditorPath, ['/compile', eaPath, '/log']);
    
    let timeout = setTimeout(() => {
      process.kill();
      resolve({
        success: false,
        eaPath,
        errors: [{ line: 0, message: 'Compilation timed out', file: '' }],
        warnings: [],
        logContent: '',
        duration: Date.now() - startTime,
      });
    }, 60000);

    process.on('close', (code) => {
      clearTimeout(timeout);
      
      let logContent = '';
      const errors: Array<{ line: number; message: string; file: string }> = [];
      const warnings: Array<{ line: number; message: string; file: string }> = [];

      try {
        if (fs.existsSync(logPath)) {
          logContent = fs.readFileSync(logPath, 'utf-8');
          
          // Parse log for errors and warnings
          const lines = logContent.split('\n');
          for (const line of lines) {
            if (line.includes('error')) {
              const match = line.match(/\((\d+),\d+\):\s*error\s*\d+:\s*(.+)/);
              if (match) {
                errors.push({ line: parseInt(match[1]), message: match[2], file: eaPath });
              }
            }
            if (line.includes('warning')) {
              const match = line.match(/\((\d+),\d+\):\s*warning\s*\d+:\s*(.+)/);
              if (match) {
                warnings.push({ line: parseInt(match[1]), message: match[2], file: eaPath });
              }
            }
          }
        }
      } catch {
        // Log read failed
      }

      const ex5Path = eaPath.replace('.mq5', '.ex5');
      const success = code === 0 && fs.existsSync(ex5Path);

      resolve({
        success,
        eaPath,
        exePath: success ? ex5Path : undefined,
        errors,
        warnings,
        logContent,
        duration: Date.now() - startTime,
      });
    });
  });
});

// Run Strategy Tester with Progress Monitoring
ipcMain.handle('mt5:runTester', async (_, iniPath: string, workerId: string, runId: string) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let terminalPath = '';
  let dataFolder = '';
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      terminalPath = config.mt5Paths?.terminal || '';
      dataFolder = config.mt5Paths?.dataFolder || '';
    }
  } catch {
    // Use default
  }

  if (!terminalPath || !fs.existsSync(terminalPath)) {
    return {
      success: false,
      runId,
      reportPath: '',
      error: 'MT5 terminal path not configured',
      duration: 0,
    };
  }

  const startTime = Date.now();

  // Start log file watcher for progress
  let logWatcher: fs.FSWatcher | null = null;
  let lastProgress = 0;

  const testerLogPath = dataFolder 
    ? path.join(dataFolder, 'tester', 'logs', `${runId}.log`)
    : '';

  if (testerLogPath && fs.existsSync(path.dirname(testerLogPath))) {
    try {
      // Watch for log file changes
      logWatcher = fs.watch(path.dirname(testerLogPath), (eventType, filename) => {
        if (filename && filename.includes(runId)) {
          try {
            const logContent = fs.readFileSync(path.join(path.dirname(testerLogPath), filename), 'utf-8');
            
            // Parse progress from log
            const progressMatch = logContent.match(/(\d+)%/);
            const dateMatch = logContent.match(/(\d{4}\.\d{2}\.\d{2})/g);
            
            if (progressMatch) {
              const progress = parseInt(progressMatch[1], 10);
              if (progress > lastProgress) {
                lastProgress = progress;
                mainWindow?.webContents.send('tester:progress', {
                  runId,
                  progress,
                  currentDate: dateMatch ? dateMatch[dateMatch.length - 1] : '',
                });
              }
            }
          } catch {
            // Log read failed, continue
          }
        }
      });
    } catch {
      // Watcher setup failed, continue without progress
    }
  }

  return new Promise((resolve) => {
    const process = spawn(terminalPath, ['/config', iniPath]);
    
    let timeout = setTimeout(() => {
      process.kill();
      logWatcher?.close();
      resolve({
        success: false,
        runId,
        reportPath: '',
        error: 'Strategy tester timed out',
        duration: Date.now() - startTime,
      });
    }, 600000); // 10 minute timeout

    process.on('close', (code) => {
      clearTimeout(timeout);
      logWatcher?.close();
      
      // Find the report file
      const reportsDir = path.dirname(iniPath);
      const reportPath = path.join(reportsDir, `${runId}.html`);

      // Send final progress
      mainWindow?.webContents.send('tester:progress', {
        runId,
        progress: 100,
        currentDate: '',
      });

      resolve({
        success: code === 0,
        runId,
        reportPath: fs.existsSync(reportPath) ? reportPath : '',
        duration: Date.now() - startTime,
      });
    });
  });
});

ipcMain.handle('backend:getStatus', async () => {
  try {
    const response = await fetch(`http://127.0.0.1:${backendPort}/health`);
    const data: unknown = await response.json();
    const extra = data && typeof data === 'object' ? (data as Record<string, unknown>) : { data };
    return { online: true, port: backendPort, ...extra };
  } catch (e) {
    return { online: false, port: backendPort, error: String(e) };
  }
});

// System Tray Notifications
ipcMain.handle('notification:show', async (_, options: { title: string; body: string; silent?: boolean }) => {
  if (!notificationsEnabled) return false;
  
  try {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
      icon: path.join(__dirname, '../public/favicon.ico'),
    });
    
    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
    
    notification.show();
    return true;
  } catch (e) {
    console.error('Failed to show notification:', e);
    return false;
  }
});

ipcMain.handle('notification:setEnabled', async (_, enabled: boolean) => {
  notificationsEnabled = enabled;
  return true;
});

// Performance monitoring
ipcMain.handle('system:getPerformance', async () => {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  // Calculate CPU usage (simplified)
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  
  const cpuUsage = ((totalTick - totalIdle) / totalTick) * 100;
  
  return {
    cpu: {
      usage: cpuUsage,
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usagePercent: (usedMemory / totalMemory) * 100,
    },
    process: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      uptime: os.uptime(),
      hostname: os.hostname(),
    },
  };
});

// Window controls for tray
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:hide', () => {
  mainWindow?.hide();
});

ipcMain.handle('window:show', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle('window:isVisible', () => {
  return mainWindow?.isVisible() ?? false;
});

// Create system tray
const createTray = () => {
  const iconPath = path.join(__dirname, '../public/favicon.ico');
  
  try {
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Show App', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Notifications', 
        type: 'checkbox',
        checked: notificationsEnabled,
        click: (menuItem) => {
          notificationsEnabled = menuItem.checked;
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          app.quit();
        }
      },
    ]);
    
    tray.setToolTip('EA Backtesting Studio');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (e) {
    console.error('Failed to create tray:', e);
  }
};

// App lifecycle
app.whenReady().then(async () => {
  // Initialize modules
  initDebugBundle();

  buildMenu();
  createTray();

  // Always create the window; backend can be started (or fixed) afterwards.
  await createWindow();

  const backendOk = await startBackend();
  if (!backendOk) {
    console.warn('Backend is not running. App will continue in limited mode.');
  }

  // Initialize auto-updater after window is created
  if (mainWindow && !isDev) {
    initAutoUpdater(mainWindow);
    // Check for updates after 5 seconds
    setTimeout(() => checkForUpdates(), 5000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when all windows are closed
  if (process.platform === 'darwin') {
    // Keep app running in background
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
