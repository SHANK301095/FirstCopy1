/**
 * Desktop Settings Page
 * Spec: MT5 path detection, worker configuration, export settings
 */

import { useState, useEffect } from 'react';
import {
  FolderOpen,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings2,
  HardDrive,
  Cpu,
  Database,
  Download,
  Trash2,
  Save,
  RotateCcw,
  Info,
  Loader2,
  Bell,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DEFAULT_DESKTOP_SETTINGS, type DesktopSettings } from '@/desktop/mt5/types';
import { secureLogger } from '@/lib/secureLogger';
import { PerformanceMonitor } from '@/desktop/components/PerformanceMonitor';
import { DesktopNotifications } from '@/desktop/components/DesktopNotifications';
import { BackendSetupDoctor } from '@/desktop/components/BackendSetupDoctor';
import { GitAuthDoctor } from '@/desktop/components/GitAuthDoctor';
import { UpdateChecker } from '@/desktop/components/UpdateChecker';

// Check if running in Electron
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

export default function DesktopSettingsPage() {
  const [settings, setSettings] = useState<DesktopSettings>(DEFAULT_DESKTOP_SETTINGS);
  const [isDetecting, setIsDetecting] = useState(false);
  const [pathsValid, setPathsValid] = useState({
    metaeditor: false,
    terminal: false,
    dataFolder: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const inDesktopMode = isElectron();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('desktop-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_DESKTOP_SETTINGS, ...parsed });
        validatePaths(parsed.mt5Paths);
      } catch {
        setSettings(DEFAULT_DESKTOP_SETTINGS);
      }
    }
  };

  const saveSettings = () => {
    localStorage.setItem('desktop-settings', JSON.stringify(settings));
    setHasChanges(false);
    toast.success('Settings saved');
  };

  const resetSettings = () => {
    setSettings(DEFAULT_DESKTOP_SETTINGS);
    setHasChanges(true);
    toast.info('Settings reset to defaults');
  };

  const updateSettings = <K extends keyof DesktopSettings>(
    section: K,
    updates: Partial<DesktopSettings[K]>
  ) => {
    setSettings(prev => {
      const currentSection = prev[section];
      if (typeof currentSection === 'object' && currentSection !== null) {
        return {
          ...prev,
          [section]: { ...currentSection, ...updates },
        };
      }
      return prev;
    });
    setHasChanges(true);
  };

  const validatePaths = async (paths: DesktopSettings['mt5Paths']) => {
    if (!inDesktopMode) return;

    const results = { metaeditor: false, terminal: false, dataFolder: false };

    try {
      if (paths.metaeditor) {
        results.metaeditor = await window.electronAPI?.exists(paths.metaeditor) || false;
      }
      if (paths.terminal) {
        results.terminal = await window.electronAPI?.exists(paths.terminal) || false;
      }
      if (paths.dataFolder) {
        results.dataFolder = await window.electronAPI?.exists(paths.dataFolder) || false;
      }
    } catch (error) {
      secureLogger.error('ui', 'Path validation failed', { error });
    }

    setPathsValid(results);
  };

  const handleDetectPaths = async () => {
    if (!inDesktopMode) {
      toast.error('Path detection requires desktop mode');
      return;
    }

    setIsDetecting(true);
    try {
      const detected = await window.electronAPI?.detectMT5Paths();
      
      if (detected) {
        updateSettings('mt5Paths', {
          metaeditor: detected.metaeditor || '',
          terminal: detected.terminal || '',
          dataFolder: detected.dataFolder || '',
          autoDetect: true,
        });
        
        if (detected.detected) {
          toast.success('MT5 paths detected successfully');
        } else {
          toast.warning('Could not auto-detect MT5. Please set paths manually.');
        }
        
        validatePaths({
          metaeditor: detected.metaeditor || '',
          terminal: detected.terminal || '',
          dataFolder: detected.dataFolder || '',
          autoDetect: true,
        });
      }
    } catch (error) {
      toast.error('Failed to detect MT5 paths');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleBrowse = async (field: 'metaeditor' | 'terminal' | 'dataFolder') => {
    if (!inDesktopMode) return;

    try {
      let result: string | null = null;

      if (field === 'dataFolder') {
        result = await window.electronAPI?.selectFolderDialog() || null;
      } else {
        const files = await window.electronAPI?.selectFile({
          filters: [{ name: 'Executable', extensions: ['exe'] }],
        });
        result = files?.[0] || null;
      }

      if (result) {
        updateSettings('mt5Paths', { [field]: result });
        validatePaths({ ...settings.mt5Paths, [field]: result });
      }
    } catch (error) {
      toast.error(`Failed to browse for ${field}`);
    }
  };

  const handleBrowseExportFolder = async () => {
    if (!inDesktopMode) return;

    try {
      const result = await window.electronAPI?.selectFolderDialog();
      if (result) {
        updateSettings('exports', { folder: result });
      }
    } catch (error) {
      toast.error('Failed to select export folder');
    }
  };

  const handleBrowseBackupFolder = async () => {
    if (!inDesktopMode) return;

    try {
      const result = await window.electronAPI?.selectFolderDialog();
      if (result) {
        updateSettings('backup', { folder: result });
      }
    } catch (error) {
      toast.error('Failed to select backup folder');
    }
  };

  const handleCreateDebugBundle = async () => {
    if (!inDesktopMode) return;

    try {
      const path = await window.electronAPI?.createDebugBundle();
      if (path) {
        toast.success(`Debug bundle created: ${path}`);
        window.electronAPI?.showItemInFolder(path);
      }
    } catch (error) {
      toast.error('Failed to create debug bundle');
    }
  };

  const PathStatusIcon = ({ valid }: { valid: boolean }) => (
    valid ? (
      <CheckCircle className="h-4 w-4 text-chart-2" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Desktop Settings</h1>
          <p className="text-muted-foreground">
            Configure MT5 integration and desktop features
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Desktop mode warning with download CTA */}
      {!inDesktopMode && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex-shrink-0 p-3 rounded-full bg-primary/10">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Get the Desktop App</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Unlock MT5 integration, automated backtesting, bulk runs, and full offline capabilities. 
                  The desktop app includes all features that require local file access.
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-chart-2" />
                    MT5 Strategy Tester automation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-chart-2" />
                    Bulk EA backtesting (1-4 workers)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-chart-2" />
                    Excel multi-sheet exports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-chart-2" />
                    100% offline operation
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={() => {
                    toast.info(
                      'Desktop app build instructions',
                      {
                        description: 'Run "npm run electron:build" in the project directory to create the Windows installer.',
                        duration: 8000,
                      }
                    );
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download for Windows
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Windows 10/11 • 64-bit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mt5" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="mt5">MT5 Paths</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* MT5 Paths Tab */}
        <TabsContent value="mt5" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>MetaTrader 5 Paths</CardTitle>
                  <CardDescription>
                    Configure paths to MT5 executables and data folder
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDetectPaths}
                  disabled={!inDesktopMode || isDetecting}
                >
                  {isDetecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Auto-Detect
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MetaEditor Path */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  MetaEditor Path
                  <PathStatusIcon valid={pathsValid.metaeditor} />
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.mt5Paths.metaeditor}
                    onChange={e => updateSettings('mt5Paths', { metaeditor: e.target.value })}
                    placeholder="C:\Program Files\MetaTrader 5\metaeditor64.exe"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleBrowse('metaeditor')}
                    disabled={!inDesktopMode}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Terminal Path */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Terminal Path
                  <PathStatusIcon valid={pathsValid.terminal} />
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.mt5Paths.terminal}
                    onChange={e => updateSettings('mt5Paths', { terminal: e.target.value })}
                    placeholder="C:\Program Files\MetaTrader 5\terminal64.exe"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleBrowse('terminal')}
                    disabled={!inDesktopMode}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Data Folder */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  MT5 Data Folder
                  <PathStatusIcon valid={pathsValid.dataFolder} />
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.mt5Paths.dataFolder}
                    onChange={e => updateSettings('mt5Paths', { dataFolder: e.target.value })}
                    placeholder="C:\Users\...\AppData\Roaming\MetaQuotes\Terminal\..."
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleBrowse('dataFolder')}
                    disabled={!inDesktopMode}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-detect on startup</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically detect MT5 paths when the app starts
                  </p>
                </div>
                <Switch
                  checked={settings.mt5Paths.autoDetect}
                  onCheckedChange={checked => updateSettings('mt5Paths', { autoDetect: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Worker Configuration
              </CardTitle>
              <CardDescription>
                Configure concurrent MT5 worker instances for bulk backtesting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Worker Count (1-4)</Label>
                <Select
                  value={String(settings.workers.count)}
                  onValueChange={v => updateSettings('workers', { count: parseInt(v) as 1 | 2 | 3 | 4 })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Worker (Sequential)</SelectItem>
                    <SelectItem value="2">2 Workers (Default)</SelectItem>
                    <SelectItem value="3">3 Workers</SelectItem>
                    <SelectItem value="4">4 Workers (Maximum)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Each worker runs an isolated MT5 instance. More workers = faster bulk runs but higher resource usage.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Worker Base Directory</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.workers.baseDir}
                    onChange={e => updateSettings('workers', { baseDir: e.target.value })}
                    placeholder="%APPDATA%/MMC/MT5Workers"
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const folder = await window.electronAPI?.selectFolderDialog();
                      if (folder) updateSettings('workers', { baseDir: folder });
                    }}
                    disabled={!inDesktopMode}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {['A', 'B', 'C', 'D'].map((letter, i) => (
                  <Card
                    key={letter}
                    className={cn(
                      'p-3 text-center',
                      i < settings.workers.count ? 'border-primary' : 'opacity-50'
                    )}
                  >
                    <div className="font-mono font-bold">Worker {letter}</div>
                    <Badge variant={i < settings.workers.count ? 'default' : 'secondary'}>
                      {i < settings.workers.count ? 'Active' : 'Inactive'}
                    </Badge>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exports Tab */}
        <TabsContent value="exports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Settings
              </CardTitle>
              <CardDescription>
                Configure default export folder and options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Export Folder</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.exports.folder}
                    onChange={e => updateSettings('exports', { folder: e.target.value })}
                    placeholder="Select export folder..."
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleBrowseExportFolder}
                    disabled={!inDesktopMode}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Data Quality Sheet</Label>
                  <p className="text-xs text-muted-foreground">
                    Add a Data_Quality sheet to Excel exports
                  </p>
                </div>
                <Switch
                  checked={settings.exports.includeDataQuality}
                  onCheckedChange={checked => updateSettings('exports', { includeDataQuality: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Settings Snapshot</Label>
                  <p className="text-xs text-muted-foreground">
                    Add a Settings_Snapshot sheet to Excel exports
                  </p>
                </div>
                <Switch
                  checked={settings.exports.includeSettings}
                  onCheckedChange={checked => updateSettings('exports', { includeSettings: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto-Backup</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically backup results and settings
                  </p>
                </div>
                <Switch
                  checked={settings.backup.enabled}
                  onCheckedChange={checked => updateSettings('backup', { enabled: checked })}
                />
              </div>

              {settings.backup.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Schedule</Label>
                      <Select
                        value={settings.backup.schedule}
                        onValueChange={v => updateSettings('backup', { schedule: v as 'daily' | 'weekly' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Keep Last N Backups</Label>
                      <Select
                        value={String(settings.backup.keepCount)}
                        onValueChange={v => updateSettings('backup', { keepCount: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 backups</SelectItem>
                          <SelectItem value="5">5 backups</SelectItem>
                          <SelectItem value="7">7 backups</SelectItem>
                          <SelectItem value="14">14 backups</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Backup Folder</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.backup.folder}
                        onChange={e => updateSettings('backup', { folder: e.target.value })}
                        placeholder="Select backup folder..."
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={handleBrowseBackupFolder}
                        disabled={!inDesktopMode}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Real-time Performance Monitor */}
          <PerformanceMonitor />

          {/* Notifications Settings */}
          <DesktopNotifications />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Performance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Performance Mode</Label>
                <Select
                  value={settings.performance.mode}
                  onValueChange={v => updateSettings('performance', { mode: v as 'fast' | 'accurate' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast (OHLC / Open Prices)</SelectItem>
                    <SelectItem value="accurate">Accurate (Every Tick)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Fast mode uses less precise tick modeling but runs much faster.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Result Caching</Label>
                  <p className="text-xs text-muted-foreground">
                    Skip re-running identical EA/preset/config combinations
                  </p>
                </div>
                <Switch
                  checked={settings.performance.cacheEnabled}
                  onCheckedChange={checked => updateSettings('performance', { cacheEnabled: checked })}
                />
              </div>

              {settings.performance.cacheEnabled && (
                <div className="space-y-2">
                  <Label>Cache Max Age (days)</Label>
                  <Select
                    value={String(settings.performance.cacheMaxAge)}
                    onValueChange={v => updateSettings('performance', { cacheMaxAge: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Backtest Settings</CardTitle>
              <CardDescription>
                Default values used for new backtests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Select
                    value={String(settings.defaults.batchSize)}
                    onValueChange={v => updateSettings('defaults', { batchSize: parseInt(v) as 10 | 20 | 50 })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Concurrency</Label>
                  <Select
                    value={String(settings.defaults.concurrency)}
                    onValueChange={v => updateSettings('defaults', { concurrency: parseInt(v) as 1 | 2 | 3 | 4 })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    value={settings.defaults.symbol}
                    onChange={e => updateSettings('defaults', { symbol: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={settings.defaults.period}
                    onValueChange={v => updateSettings('defaults', { period: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M1">M1</SelectItem>
                      <SelectItem value="M5">M5</SelectItem>
                      <SelectItem value="M15">M15</SelectItem>
                      <SelectItem value="H1">H1</SelectItem>
                      <SelectItem value="H4">H4</SelectItem>
                      <SelectItem value="D1">D1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deposit</Label>
                  <Input
                    type="number"
                    value={settings.defaults.deposit}
                    onChange={e => updateSettings('defaults', { deposit: parseInt(e.target.value) || 10000 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leverage</Label>
                  <Select
                    value={String(settings.defaults.leverage)}
                    onValueChange={v => updateSettings('defaults', { leverage: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">1:50</SelectItem>
                      <SelectItem value="100">1:100</SelectItem>
                      <SelectItem value="200">1:200</SelectItem>
                      <SelectItem value="500">1:500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fail Policy</Label>
                  <Select
                    value={settings.defaults.failPolicy}
                    onValueChange={v => updateSettings('defaults', { failPolicy: v as 'continue' | 'stop' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continue">Continue</SelectItem>
                      <SelectItem value="stop">Stop on Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-6">
          <UpdateChecker />
          <BackendSetupDoctor />
          <GitAuthDoctor />
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Log Level</Label>
                <Select
                  value={settings.logLevel}
                  onValueChange={v => setSettings(prev => ({ ...prev, logLevel: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug (Verbose)</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Debug Bundle</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Export logs, settings, and system info for troubleshooting
                </p>
                <Button
                  variant="outline"
                  onClick={handleCreateDebugBundle}
                  disabled={!inDesktopMode}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Create Debug Bundle
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-destructive">Danger Zone</Label>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      localStorage.removeItem('mt5-ea-store');
                      localStorage.removeItem('mt5-queue-state');
                      localStorage.removeItem('mt5-cache-entries');
                      toast.success('Cache cleared');
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Assumptions Used
              </CardTitle>
              <CardDescription>
                Default values used when not explicitly specified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Default Batch Size</span>
                  <span className="font-mono">20</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Default Concurrency</span>
                  <span className="font-mono">2</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Fail Policy</span>
                  <span className="font-mono">continue</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-mono">0.01%/side</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Slippage</span>
                  <span className="font-mono">1 tick</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-mono">INR</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-mono">IST</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
