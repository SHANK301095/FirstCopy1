/**
 * Backend Setup Doctor
 * Diagnoses and helps fix common Python backend setup issues on Windows
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  Stethoscope,
  Wrench,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Types
interface CheckResult {
  id: string;
  name: string;
  status: 'pending' | 'checking' | 'pass' | 'warn' | 'fail';
  message?: string;
  detail?: string;
}

interface FixCommand {
  label: string;
  command: string;
  description?: string;
}

interface DiagnosticResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Extended ElectronAPI type for diagnostics
interface ElectronAPIWithDiagnostics {
  runDiagnostic: (check: string) => Promise<DiagnosticResult>;
}

// Check if running in Electron with diagnostic support
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

const getElectronAPI = (): ElectronAPIWithDiagnostics | null => {
  if (isElectron() && window.electronAPI) {
    return window.electronAPI as unknown as ElectronAPIWithDiagnostics;
  }
  return null;
};

// Copy to clipboard helper
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Failed to copy');
  }
};

// Status indicator component
const StatusIcon = ({ status }: { status: CheckResult['status'] }) => {
  switch (status) {
    case 'pass':
      return <CheckCircle className="h-5 w-5 text-chart-2" />;
    case 'fail':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'warn':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'checking':
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    default:
      return <div className="h-5 w-5 rounded-full bg-muted" />;
  }
};

// Command copy button
const CopyCommandButton = ({ command, label }: { command: string; label?: string }) => (
  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
    <code className="flex-1 text-xs font-mono break-all">{command}</code>
    <Button
      size="sm"
      variant="outline"
      onClick={() => copyToClipboard(command)}
      className="shrink-0"
    >
      <Copy className="h-3 w-3 mr-1" />
      {label || 'Copy'}
    </Button>
  </div>
);

export function BackendSetupDoctor() {
  const [checks, setChecks] = useState<CheckResult[]>([
    { id: 'python', name: 'Python Detected', status: 'pending' },
    { id: 'venv', name: 'Virtual Environment (.venv)', status: 'pending' },
    { id: 'pip', name: 'pip Installed in venv', status: 'pending' },
    { id: 'requirements', name: 'requirements.txt Found', status: 'pending' },
    { id: 'deps', name: 'Dependencies Installed', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [errorOutput, setErrorOutput] = useState('');
  const [detectedIssue, setDetectedIssue] = useState<string | null>(null);

  const inDesktopMode = isElectron();

  // Update a single check
  const updateCheck = useCallback((id: string, updates: Partial<CheckResult>) => {
    setChecks(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  // Run all diagnostics
  const runDiagnostics = async () => {
    if (!inDesktopMode) {
      toast.error('Diagnostics require desktop mode');
      return;
    }

    setIsRunning(true);
    setDetectedIssue(null);
    setErrorOutput('');

    // Reset all checks
    setChecks(prev => prev.map(c => ({ ...c, status: 'pending', message: undefined, detail: undefined })));

    try {
      const api = getElectronAPI();
      if (!api) {
        toast.error('Electron API not available');
        setIsRunning(false);
        return;
      }

      // Check 1: Python detected
      updateCheck('python', { status: 'checking' });
      const pythonResult = await api.runDiagnostic('python-version');
      if (pythonResult.success) {
        updateCheck('python', { 
          status: 'pass', 
          message: pythonResult.output?.trim() || 'Found',
          detail: pythonResult.output 
        });
      } else {
        updateCheck('python', { 
          status: 'fail', 
          message: 'Python not found in PATH',
          detail: pythonResult.error 
        });
        setDetectedIssue('python-missing');
        setIsRunning(false);
        return;
      }

      // Check 2: Virtual environment exists
      updateCheck('venv', { status: 'checking' });
      const venvResult = await api.runDiagnostic('venv-exists');
      if (venvResult.success) {
        updateCheck('venv', { 
          status: 'pass', 
          message: 'Found at backend/.venv' 
        });
      } else {
        updateCheck('venv', { 
          status: 'fail', 
          message: 'Virtual environment not found',
          detail: 'backend/.venv does not exist' 
        });
        setDetectedIssue('venv-missing');
        setIsRunning(false);
        return;
      }

      // Check 3: pip installed in venv
      updateCheck('pip', { status: 'checking' });
      const pipResult = await api.runDiagnostic('pip-check');
      if (pipResult.success) {
        updateCheck('pip', { 
          status: 'pass', 
          message: pipResult.output?.trim() || 'pip available' 
        });
      } else {
        updateCheck('pip', { 
          status: 'fail', 
          message: 'pip not found in venv',
          detail: pipResult.error 
        });
        setDetectedIssue('pip-missing');
        setErrorOutput(pipResult.error || '');
        setIsRunning(false);
        return;
      }

      // Check 4: requirements.txt exists
      updateCheck('requirements', { status: 'checking' });
      const reqResult = await api.runDiagnostic('requirements-exists');
      if (reqResult.success) {
        updateCheck('requirements', { 
          status: 'pass', 
          message: 'Found at backend/requirements.txt' 
        });
      } else {
        updateCheck('requirements', { 
          status: 'fail', 
          message: 'requirements.txt not found',
          detail: 'backend/requirements.txt does not exist' 
        });
        setDetectedIssue('requirements-missing');
        setIsRunning(false);
        return;
      }

      // Check 5: Dependencies installed (test import)
      updateCheck('deps', { status: 'checking' });
      const depsResult = await api.runDiagnostic('deps-check');
      if (depsResult.success) {
        updateCheck('deps', { 
          status: 'pass', 
          message: 'All core dependencies available' 
        });
      } else {
        updateCheck('deps', { 
          status: 'warn', 
          message: 'Some dependencies may be missing',
          detail: depsResult.error 
        });
        setDetectedIssue('deps-incomplete');
        setErrorOutput(depsResult.error || '');
      }

    } catch (error) {
      toast.error('Diagnostic failed');
      setErrorOutput(String(error));
    } finally {
      setIsRunning(false);
    }
  };

  // Fix commands for different issues
  const getFixCommands = (): { title: string; description: string; commands: FixCommand[] } | null => {
    switch (detectedIssue) {
      case 'python-missing':
        return {
          title: 'Install Python',
          description: 'Python is not installed or not in PATH. Download and install Python 3.10+.',
          commands: [
            { 
              label: 'Download Python', 
              command: 'https://www.python.org/downloads/',
              description: 'Open this URL in browser and install Python (check "Add to PATH")' 
            },
          ],
        };

      case 'venv-missing':
        return {
          title: 'Create Virtual Environment',
          description: 'The virtual environment does not exist. Run these commands in PowerShell:',
          commands: [
            { label: 'Step 1', command: 'cd backend', description: 'Navigate to backend folder' },
            { label: 'Step 2', command: 'python -m venv .venv', description: 'Create venv' },
            { label: 'Step 3', command: '.\.venv\Scripts\Activate.ps1', description: 'Activate venv' },
            { label: 'Step 4', command: 'pip install -r requirements.txt', description: 'Install deps' },
          ],
        };

      case 'pip-missing':
        return {
          title: 'Fix pip in Virtual Environment',
          description: 'pip is not available in the virtual environment. This is a known issue. Run these commands:',
          commands: [
            { label: 'Step 1', command: 'cd backend', description: 'Navigate to backend folder' },
            { label: 'Step 2', command: '.\.venv\Scripts\python.exe -m ensurepip --upgrade --default-pip', description: 'Install pip' },
            { label: 'Step 3', command: '.\.venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel', description: 'Upgrade pip' },
            { label: 'Step 4', command: '.\.venv\Scripts\python.exe -m pip install -r requirements.txt', description: 'Install dependencies' },
          ],
        };

      case 'deps-incomplete':
        return {
          title: 'Install Missing Dependencies',
          description: 'Some Python packages are missing. Run this command:',
          commands: [
            { label: 'Install deps', command: 'cd backend && .\.venv\Scripts\python.exe -m pip install -r requirements.txt' },
          ],
        };

      case 'requirements-missing':
        return {
          title: 'Missing requirements.txt',
          description: 'The requirements.txt file is missing from the backend folder. This should not happen if you cloned the repository correctly.',
          commands: [],
        };

      default:
        return null;
    }
  };

  const cleanRecreateCommands: FixCommand[] = [
    { label: 'Step 1', command: 'cd backend', description: 'Navigate to backend' },
    { label: 'Step 2', command: 'Remove-Item -Recurse -Force .\.venv', description: 'Delete old venv' },
    { label: 'Step 3', command: 'python -m venv .venv', description: 'Create fresh venv' },
    { label: 'Step 4', command: '.\.venv\Scripts\python.exe -m ensurepip --upgrade --default-pip', description: 'Ensure pip is installed' },
    { label: 'Step 5', command: '.\.venv\Scripts\python.exe -m pip install -r requirements.txt', description: 'Install all dependencies' },
  ];

  const fixInfo = getFixCommands();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Backend Setup Doctor</CardTitle>
              <CardDescription>
                Diagnose and fix Python backend setup issues
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning || !inDesktopMode}
            className="gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Run Checks
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info banner */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            This is a local environment issue; the app can guide you but cannot modify your system 
            without your permission. All commands are copy-paste friendly.
          </p>
        </div>

        {/* Not in desktop mode warning */}
        {!inDesktopMode && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Desktop Mode Required</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Backend diagnostics can only run in the desktop app where we have access to the local file system.
            </p>
          </div>
        )}

        {/* Status cards */}
        <div className="space-y-2">
          {checks.map(check => (
            <div 
              key={check.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                check.status === 'pass' && 'bg-chart-2/5 border-chart-2/30',
                check.status === 'fail' && 'bg-destructive/5 border-destructive/30',
                check.status === 'warn' && 'bg-amber-500/5 border-amber-500/30',
                check.status === 'pending' && 'bg-muted/30',
                check.status === 'checking' && 'bg-primary/5 border-primary/30'
              )}
            >
              <StatusIcon status={check.status} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{check.name}</div>
                {check.message && (
                  <div className="text-xs text-muted-foreground truncate">{check.message}</div>
                )}
              </div>
              <Badge variant={
                check.status === 'pass' ? 'default' :
                check.status === 'fail' ? 'destructive' :
                check.status === 'warn' ? 'secondary' : 'outline'
              }>
                {check.status === 'pending' ? 'Pending' :
                 check.status === 'checking' ? 'Checking...' :
                 check.status === 'pass' ? 'OK' :
                 check.status === 'warn' ? 'Warning' : 'Failed'}
              </Badge>
            </div>
          ))}
        </div>

        {/* Fix section */}
        {fixInfo && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <Wrench className="h-4 w-4" />
                <span className="font-semibold">{fixInfo.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">{fixInfo.description}</p>
              
              {fixInfo.commands.length > 0 && (
                <div className="space-y-2">
                  {fixInfo.commands.map((cmd, i) => (
                    <div key={i} className="space-y-1">
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.label}: {cmd.description}</div>
                      )}
                      <CopyCommandButton command={cmd.command} label={cmd.label} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Clean recreate fallback */}
        {detectedIssue && detectedIssue !== 'python-missing' && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Clean Recreate venv (Nuclear Option)
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                If the above doesn't work, try deleting and recreating the entire virtual environment:
              </p>
              {cleanRecreateCommands.map((cmd, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs text-muted-foreground">{cmd.label}: {cmd.description}</div>
                  <CopyCommandButton command={cmd.command} />
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Error output (expandable) */}
        {errorOutput && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Error Details
                </span>
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={errorOutput}
                readOnly
                className="font-mono text-xs h-32 resize-none"
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* All passed message */}
        {checks.every(c => c.status === 'pass') && !isRunning && (
          <div className="p-4 bg-chart-2/10 border border-chart-2/30 rounded-lg text-center">
            <CheckCircle className="h-8 w-8 text-chart-2 mx-auto mb-2" />
            <p className="font-medium text-chart-2">All checks passed!</p>
            <p className="text-sm text-muted-foreground">Backend is properly configured.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
