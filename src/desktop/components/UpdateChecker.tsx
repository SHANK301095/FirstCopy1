/**
 * Update Checker Card Component
 * Manual update check UI for Desktop Settings page
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type UpdateState = 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'ready' | 'error';

interface UpdateInfo {
  version?: string;
  percent?: number;
  error?: string;
}

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>('idle');
  const [info, setInfo] = useState<UpdateInfo>({});

  const isElectron = !!window.electronAPI;

  const handleCheck = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    
    setState('checking');
    setInfo({});

    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result.success) {
        // The actual result comes through the event listener
        // but we can set a temporary state
        setTimeout(() => {
          if (state === 'checking') {
            setState('up-to-date');
          }
        }, 3000);
      } else {
        setState('error');
        setInfo({ error: result.error });
      }
    } catch (err) {
      setState('error');
      setInfo({ error: String(err) });
    }
  };

  const handleDownload = async () => {
    if (!window.electronAPI?.downloadUpdate) return;
    setState('downloading');
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = async () => {
    if (!window.electronAPI?.installUpdate) return;
    await window.electronAPI.installUpdate();
  };

  // Subscribe to update events
  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;

    const unsubscribe = window.electronAPI.onUpdateStatus((data) => {
      switch (data.status) {
        case 'checking':
          setState('checking');
          break;
        case 'available':
          setState('available');
          setInfo({ version: (data.data as { version?: string })?.version });
          break;
        case 'not-available':
          setState('up-to-date');
          break;
        case 'downloading':
          setState('downloading');
          setInfo({ percent: (data.data as { percent?: number })?.percent });
          break;
        case 'downloaded':
          setState('ready');
          break;
        case 'error':
          setState('error');
          setInfo({ error: data.message });
          break;
      }
    });

    return () => unsubscribe?.();
  }, []);

  if (!isElectron) {
    return (
      <Card className="border-dashed opacity-60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Auto-Update
          </CardTitle>
          <CardDescription>
            Available in desktop app only
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Auto-Update
            </CardTitle>
            <CardDescription>
              Check for new versions automatically
            </CardDescription>
          </div>
          <Badge variant={state === 'up-to-date' ? 'secondary' : state === 'available' ? 'default' : 'outline'}>
            {state === 'idle' && 'Not Checked'}
            {state === 'checking' && 'Checking...'}
            {state === 'available' && `v${info.version || 'New'} Available`}
            {state === 'up-to-date' && 'Up to Date'}
            {state === 'downloading' && 'Downloading...'}
            {state === 'ready' && 'Ready to Install'}
            {state === 'error' && 'Error'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status display */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          {state === 'idle' && <RefreshCw className="h-5 w-5 text-muted-foreground" />}
          {state === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {state === 'available' && <Download className="h-5 w-5 text-primary" />}
          {state === 'up-to-date' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {state === 'downloading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {state === 'ready' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {state === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {state === 'idle' && 'Click to check for updates'}
              {state === 'checking' && 'Checking for updates...'}
              {state === 'available' && `Version ${info.version || 'new'} is available`}
              {state === 'up-to-date' && 'You have the latest version'}
              {state === 'downloading' && `Downloading update... ${info.percent ? Math.round(info.percent) + '%' : ''}`}
              {state === 'ready' && 'Update downloaded. Restart to install.'}
              {state === 'error' && (info.error || 'Failed to check for updates')}
            </p>
          </div>
        </div>

        {/* Download progress */}
        {state === 'downloading' && info.percent !== undefined && (
          <Progress value={info.percent} className="h-2" />
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {(state === 'idle' || state === 'up-to-date' || state === 'error' || state === 'checking') && (
            <Button 
              onClick={handleCheck} 
              disabled={state === 'checking'}
              className="flex-1"
            >
              {state === 'checking' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {state === 'checking' ? 'Checking...' : 'Check for Updates'}
            </Button>
          )}

          {state === 'available' && (
            <Button onClick={handleDownload} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download Update
            </Button>
          )}

          {state === 'ready' && (
            <Button onClick={handleInstall} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart & Install
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Updates are downloaded from GitHub releases automatically.
        </p>
      </CardContent>
    </Card>
  );
}

export default UpdateChecker;
