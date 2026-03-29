/**
 * System Check Page
 * Spec: Validate PWA installed, SW active, offline ready, Dexie ok, Workers ok
 */

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff,
  Download,
  Database,
  Cpu,
  HardDrive,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PageTitle } from '@/components/ui/PageTitle';
import { db } from '@/db';

interface CheckResult {
  name: string;
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: string;
}

export default function SystemCheck() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);

  const updateCheck = (name: string, update: Partial<CheckResult>) => {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  };

  const runChecks = async () => {
    setIsRunning(true);
    
    const initialChecks: CheckResult[] = [
      { name: 'Online Status', status: 'pending', message: 'Checking network...' },
      { name: 'Service Worker', status: 'pending', message: 'Checking service worker...' },
      { name: 'PWA Installed', status: 'pending', message: 'Checking installation...' },
      { name: 'IndexedDB (Dexie)', status: 'pending', message: 'Checking database...' },
      { name: 'Web Workers', status: 'pending', message: 'Checking workers...' },
      { name: 'Storage Quota', status: 'pending', message: 'Checking storage...' },
      { name: 'Offline Ready', status: 'pending', message: 'Checking offline capability...' },
    ];
    
    setChecks(initialChecks);

    // 1. Online Status
    updateCheck('Online Status', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    updateCheck('Online Status', {
      status: 'passed',
      message: navigator.onLine ? 'Online' : 'Offline',
      details: navigator.onLine ? 'Network connection available' : 'Working in offline mode'
    });

    // 2. Service Worker
    updateCheck('Service Worker', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) {
        updateCheck('Service Worker', {
          status: 'passed',
          message: 'Active',
          details: `Scope: ${registration.scope}`
        });
      } else if (registration) {
        updateCheck('Service Worker', {
          status: 'warning',
          message: 'Registered but not active',
          details: 'Service worker is installing or waiting'
        });
      } else {
        updateCheck('Service Worker', {
          status: 'failed',
          message: 'Not registered',
          details: 'Service worker not found'
        });
      }
    } else {
      updateCheck('Service Worker', {
        status: 'failed',
        message: 'Not supported',
        details: 'Browser does not support Service Workers'
      });
    }

    // 3. PWA Installed
    updateCheck('PWA Installed', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    updateCheck('PWA Installed', {
      status: isStandalone ? 'passed' : 'warning',
      message: isStandalone ? 'Installed' : 'Running in browser',
      details: isStandalone ? 'App is installed as PWA' : 'Install for best experience'
    });

    // 4. IndexedDB (Dexie)
    updateCheck('IndexedDB (Dexie)', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    try {
      const settings = await db.getSettings();
      const datasets = await db.datasets.count();
      const strategies = await db.strategies.count();
      updateCheck('IndexedDB (Dexie)', {
        status: 'passed',
        message: 'Connected',
        details: `${datasets} datasets, ${strategies} strategies stored`
      });
    } catch (error) {
      updateCheck('IndexedDB (Dexie)', {
        status: 'failed',
        message: 'Connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 5. Web Workers
    updateCheck('Web Workers', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    if (typeof Worker !== 'undefined') {
      try {
        // Test worker creation
        const testBlob = new Blob(['self.onmessage = (e) => self.postMessage("ok")'], { type: 'application/javascript' });
        const testWorker = new Worker(URL.createObjectURL(testBlob));
        
        const workerTest = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 1000);
          testWorker.onmessage = () => {
            clearTimeout(timeout);
            resolve(true);
          };
          testWorker.postMessage('test');
        });
        
        testWorker.terminate();
        
        updateCheck('Web Workers', {
          status: workerTest ? 'passed' : 'warning',
          message: workerTest ? 'Available' : 'Limited support',
          details: 'Backtests will run in background threads'
        });
      } catch {
        updateCheck('Web Workers', {
          status: 'warning',
          message: 'Creation failed',
          details: 'Workers may not work correctly'
        });
      }
    } else {
      updateCheck('Web Workers', {
        status: 'failed',
        message: 'Not supported',
        details: 'Backtests will run on main thread'
      });
    }

    // 6. Storage Quota
    updateCheck('Storage Quota', { status: 'checking' });
    await new Promise(r => setTimeout(r, 300));
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usedMB = (used / 1024 / 1024).toFixed(1);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      const percentUsed = quota > 0 ? ((used / quota) * 100).toFixed(1) : 0;
      
      setStorageInfo({ used, quota });
      
      updateCheck('Storage Quota', {
        status: Number(percentUsed) > 80 ? 'warning' : 'passed',
        message: `${usedMB} MB / ${quotaMB} MB`,
        details: `${percentUsed}% used`
      });
    } else {
      updateCheck('Storage Quota', {
        status: 'warning',
        message: 'Cannot estimate',
        details: 'Storage API not available'
      });
    }

    // 7. Offline Ready
    updateCheck('Offline Ready', { status: 'checking' });
    await new Promise(r => setTimeout(r, 500));
    
    const swActive = checks.find(c => c.name === 'Service Worker')?.status === 'passed';
    const dbActive = checks.find(c => c.name === 'IndexedDB (Dexie)')?.status === 'passed';
    
    // Re-check since state updates are async
    const registration = await navigator.serviceWorker?.getRegistration();
    const hasActiveSW = !!registration?.active;
    
    let dbOk = false;
    try {
      await db.getSettings();
      dbOk = true;
    } catch {}
    
    if (hasActiveSW && dbOk) {
      updateCheck('Offline Ready', {
        status: 'passed',
        message: 'Ready',
        details: 'App will work without internet connection'
      });
    } else {
      updateCheck('Offline Ready', {
        status: 'warning',
        message: 'Partial',
        details: 'Some features may require internet'
      });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const passedCount = checks.filter(c => c.status === 'passed').length;
  const totalCount = checks.length;
  const overallScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const getStatusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-chart-2" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <Shield className="h-5 w-5 text-chart-4" />;
      case 'checking':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const getCheckIcon = (name: string) => {
    switch (name) {
      case 'Online Status':
        return navigator.onLine ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />;
      case 'Service Worker':
        return <Shield className="h-4 w-4" />;
      case 'PWA Installed':
        return <Download className="h-4 w-4" />;
      case 'IndexedDB (Dexie)':
        return <Database className="h-4 w-4" />;
      case 'Web Workers':
        return <Cpu className="h-4 w-4" />;
      case 'Storage Quota':
        return <HardDrive className="h-4 w-4" />;
      case 'Offline Ready':
        return <WifiOff className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Check</h1>
          <p className="text-muted-foreground">Verify your app is ready for offline use</p>
        </div>
        <Button onClick={runChecks} disabled={isRunning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          Re-run Checks
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Overall Health</h3>
              <p className="text-sm text-muted-foreground">
                {passedCount} of {totalCount} checks passed
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{overallScore}%</div>
              <Badge variant={overallScore >= 80 ? 'default' : overallScore >= 50 ? 'secondary' : 'destructive'}>
                {overallScore >= 80 ? 'Healthy' : overallScore >= 50 ? 'Partial' : 'Issues Found'}
              </Badge>
            </div>
          </div>
          <Progress value={overallScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Check Results */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Results</CardTitle>
          <CardDescription>Detailed status of each system component</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check) => (
              <div
                key={check.name}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {getCheckIcon(check.name)}
                  </div>
                  <div>
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-muted-foreground">{check.details || check.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={
                    check.status === 'passed' ? 'default' :
                    check.status === 'warning' ? 'secondary' :
                    check.status === 'failed' ? 'destructive' : 'outline'
                  }>
                    {check.message}
                  </Badge>
                  {getStatusIcon(check.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage Details */}
      {storageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Used</span>
                <span className="font-mono">{(storageInfo.used / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <Progress value={(storageInfo.used / storageInfo.quota) * 100} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Available</span>
                <span className="font-mono">{(storageInfo.quota / 1024 / 1024 / 1024).toFixed(2)} GB quota</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
