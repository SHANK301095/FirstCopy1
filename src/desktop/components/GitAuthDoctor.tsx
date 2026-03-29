/**
 * Git Auth Doctor
 * Diagnoses and guides Git authentication setup on Windows for Auto Pull features
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  GitBranch,
  Key,
  Shield,
  FolderOpen,
  Terminal,
  ExternalLink,
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
  openPath: (path: string) => Promise<void>;
}

// Check if running in Electron
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

const getElectronAPI = (): ElectronAPIWithDiagnostics | null => {
  if (isElectron() && window.electronAPI) {
    return window.electronAPI as unknown as ElectronAPIWithDiagnostics;
  }
  return null;
};

// Redact secrets from output
const redactSecrets = (text: string): string => {
  if (!text) return '';
  return text
    // GitHub tokens
    .replace(/ghp_[a-zA-Z0-9]{36,}/g, '[REDACTED_GH_TOKEN]')
    .replace(/github_pat_[a-zA-Z0-9_]{20,}/g, '[REDACTED_GH_PAT]')
    // SSH private keys
    .replace(/-----BEGIN[^-]+PRIVATE KEY-----[\s\S]*?-----END[^-]+PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    // Long base64-looking strings (potential tokens)
    .replace(/[a-zA-Z0-9+/]{40,}={0,2}/g, (match) => {
      // Only redact if it looks like a token (no spaces, specific length)
      if (match.length > 60) return '[REDACTED_TOKEN]';
      return match;
    })
    // Password in URLs
    .replace(/:\/\/[^:]+:[^@]+@/g, '://[REDACTED_CREDS]@');
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
    <code className="flex-1 text-xs font-mono break-all whitespace-pre-wrap">{command}</code>
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

export function GitAuthDoctor() {
  const [checks, setChecks] = useState<CheckResult[]>([
    { id: 'git-version', name: 'Git Installed', status: 'pending' },
    { id: 'remote-type', name: 'Remote Type (HTTPS/SSH)', status: 'pending' },
    { id: 'gcm', name: 'Git Credential Manager', status: 'pending' },
    { id: 'ssh-ready', name: 'SSH Readiness', status: 'pending' },
    { id: 'auth-test', name: 'Authentication Test', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [remoteType, setRemoteType] = useState<'https' | 'ssh' | 'unknown'>('unknown');
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
    setRawOutput('');
    setRemoteType('unknown');

    // Reset all checks
    setChecks(prev => prev.map(c => ({ ...c, status: 'pending', message: undefined, detail: undefined })));

    let logs = '';
    const appendLog = (text: string) => {
      logs += text + '\n';
      setRawOutput(redactSecrets(logs));
    };

    try {
      const api = getElectronAPI();
      if (!api) {
        toast.error('Electron API not available');
        setIsRunning(false);
        return;
      }

      // Check 1: Git version
      updateCheck('git-version', { status: 'checking' });
      const gitResult = await api.runDiagnostic('git-version');
      appendLog(`[git --version]\n${gitResult.output || gitResult.error || ''}`);
      
      if (gitResult.success) {
        const version = gitResult.output?.trim().replace('git version ', '') || 'Found';
        updateCheck('git-version', { status: 'pass', message: version });
      } else {
        updateCheck('git-version', { status: 'fail', message: 'Git not installed' });
        setDetectedIssue('git-missing');
        setIsRunning(false);
        return;
      }

      // Check 2: Remote type
      updateCheck('remote-type', { status: 'checking' });
      const remoteResult = await api.runDiagnostic('git-remote');
      appendLog(`[git remote -v]\n${redactSecrets(remoteResult.output || remoteResult.error || '')}`);

      if (remoteResult.success && remoteResult.output) {
        const output = remoteResult.output.toLowerCase();
        if (output.includes('git@') || output.includes('ssh://')) {
          setRemoteType('ssh');
          updateCheck('remote-type', { status: 'pass', message: 'SSH remote detected' });
        } else if (output.includes('https://')) {
          setRemoteType('https');
          updateCheck('remote-type', { status: 'pass', message: 'HTTPS remote detected' });
        } else {
          setRemoteType('unknown');
          updateCheck('remote-type', { status: 'warn', message: 'Could not determine remote type' });
        }
      } else {
        updateCheck('remote-type', { status: 'warn', message: 'No remote configured or not a git repo' });
      }

      // Check 3: Git Credential Manager (for HTTPS)
      updateCheck('gcm', { status: 'checking' });
      const gcmResult = await api.runDiagnostic('git-gcm');
      appendLog(`[git config --global credential.helper]\n${gcmResult.output || gcmResult.error || ''}`);

      if (gcmResult.success && gcmResult.output) {
        const helper = gcmResult.output.trim();
        if (helper.includes('manager') || helper.includes('wincred')) {
          updateCheck('gcm', { status: 'pass', message: `Configured: ${helper}` });
        } else {
          updateCheck('gcm', { status: 'warn', message: `Using: ${helper || 'none'}` });
          if (remoteType === 'https') {
            setDetectedIssue('gcm-missing');
          }
        }
      } else {
        updateCheck('gcm', { 
          status: remoteType === 'https' ? 'warn' : 'pass', 
          message: remoteType === 'https' ? 'Not configured (recommended for HTTPS)' : 'Not needed for SSH'
        });
        if (remoteType === 'https') {
          setDetectedIssue('gcm-missing');
        }
      }

      // Check 4: SSH readiness
      updateCheck('ssh-ready', { status: 'checking' });
      const sshResult = await api.runDiagnostic('git-ssh-check');
      appendLog(`[SSH check]\n${redactSecrets(sshResult.output || sshResult.error || '')}`);

      if (sshResult.success) {
        updateCheck('ssh-ready', { status: 'pass', message: sshResult.output?.trim() || 'SSH keys found' });
      } else {
        updateCheck('ssh-ready', { 
          status: remoteType === 'ssh' ? 'fail' : 'warn', 
          message: sshResult.error?.split('\n')[0] || 'SSH not configured'
        });
        if (remoteType === 'ssh') {
          setDetectedIssue('ssh-missing');
        }
      }

      // Check 5: Authentication test
      updateCheck('auth-test', { status: 'checking' });
      const authResult = await api.runDiagnostic(remoteType === 'ssh' ? 'git-ssh-auth-test' : 'git-https-auth-test');
      appendLog(`[Auth test]\n${redactSecrets(authResult.output || authResult.error || '')}`);

      if (authResult.success) {
        updateCheck('auth-test', { status: 'pass', message: 'Authentication successful' });
      } else {
        const errorMsg = authResult.error?.split('\n')[0] || 'Authentication failed';
        updateCheck('auth-test', { status: 'fail', message: errorMsg });
        
        // Determine specific issue
        if (authResult.error?.includes('Permission denied')) {
          setDetectedIssue(remoteType === 'ssh' ? 'ssh-permission-denied' : 'https-auth-required');
        } else if (authResult.error?.includes('Host key verification')) {
          setDetectedIssue('host-key-verification');
        } else if (!detectedIssue) {
          setDetectedIssue(remoteType === 'ssh' ? 'ssh-auth-failed' : 'https-auth-failed');
        }
      }

    } catch (error) {
      toast.error('Diagnostic failed');
      setRawOutput(redactSecrets(String(error)));
    } finally {
      setIsRunning(false);
    }
  };

  // HTTPS + GCM setup commands
  const httpsGcmCommands: FixCommand[] = [
    { 
      label: 'Step 1', 
      command: 'git config --global credential.helper manager', 
      description: 'Configure Git to use Credential Manager' 
    },
    { 
      label: 'Step 2', 
      command: 'git credential-manager configure', 
      description: 'Initialize Credential Manager (optional, may not exist on older GCM versions)' 
    },
    { 
      label: 'Step 3', 
      command: 'git pull', 
      description: 'Run once in terminal - opens browser for authentication' 
    },
  ];

  // SSH setup commands
  const sshSetupCommands: FixCommand[] = [
    { 
      label: 'Generate Key', 
      command: 'ssh-keygen -t ed25519 -C "your_email@example.com"', 
      description: 'Create new SSH key (replace email)' 
    },
    { 
      label: 'Start Agent', 
      command: 'powershell -Command "Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent"', 
      description: 'Start SSH agent service' 
    },
    { 
      label: 'Add Key', 
      command: 'ssh-add $env:USERPROFILE\\.ssh\\id_ed25519', 
      description: 'Add key to agent' 
    },
    { 
      label: 'Show Public Key', 
      command: 'type $env:USERPROFILE\\.ssh\\id_ed25519.pub', 
      description: 'Copy this to GitHub SSH keys' 
    },
    { 
      label: 'Test Connection', 
      command: 'ssh -T git@github.com', 
      description: 'Verify SSH works with GitHub' 
    },
  ];

  // Host key fix
  const hostKeyFixCommands: FixCommand[] = [
    { 
      label: 'Remove Old Key', 
      command: 'ssh-keygen -R github.com', 
      description: 'Remove old GitHub host key' 
    },
    { 
      label: 'Retry Connection', 
      command: 'ssh -T git@github.com', 
      description: 'Reconnect and accept new host key' 
    },
  ];

  // Switch to SSH commands
  const switchToSshCommands: FixCommand[] = [
    { 
      label: 'View Current Remote', 
      command: 'git remote -v', 
      description: 'Check current remote URL' 
    },
    { 
      label: 'Switch to SSH', 
      command: 'git remote set-url origin git@github.com:USERNAME/REPO.git', 
      description: 'Replace USERNAME/REPO with your repo' 
    },
  ];

  const openSshFolder = async () => {
    const api = getElectronAPI();
    if (api) {
      try {
        await api.openPath(`${process.env.USERPROFILE || ''}/.ssh`);
      } catch {
        // Fallback: copy path
        copyToClipboard('%USERPROFILE%\\.ssh');
        toast.info('Path copied - open manually in Explorer');
      }
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Git Auth Doctor</CardTitle>
              <CardDescription>
                Diagnose and fix Git authentication for Auto Pull
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
            This tool diagnoses Git authentication issues. It cannot modify your system 
            without permission. All commands are copy-paste friendly.
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
              Git diagnostics can only run in the desktop app.
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

        {/* Recommended path based on remote type */}
        {remoteType !== 'unknown' && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">
                Recommended: {remoteType === 'https' ? 'HTTPS + Git Credential Manager' : 'SSH Key Authentication'}
              </span>
            </div>
          </>
        )}

        {/* Issue-specific guidance */}
        {detectedIssue && (
          <>
            <Separator />
            
            {/* GCM Missing */}
            {(detectedIssue === 'gcm-missing' || detectedIssue === 'https-auth-failed' || detectedIssue === 'https-auth-required') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Key className="h-4 w-4" />
                  <span className="font-semibold">HTTPS + Git Credential Manager Setup</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Git Credential Manager stores your credentials securely in Windows Credential Manager. 
                  It's included with Git for Windows.
                </p>
                <div className="space-y-2">
                  {httpsGcmCommands.map((cmd, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{cmd.label}: {cmd.description}</div>
                      <CopyCommandButton command={cmd.command} />
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(httpsGcmCommands.map(c => c.command).join('\n'))}
                  className="gap-2"
                >
                  <Copy className="h-3 w-3" />
                  Copy All HTTPS Setup Steps
                </Button>
              </div>
            )}

            {/* SSH Missing or Failed */}
            {(detectedIssue === 'ssh-missing' || detectedIssue === 'ssh-auth-failed' || detectedIssue === 'ssh-permission-denied') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Key className="h-4 w-4" />
                  <span className="font-semibold">SSH Key Setup</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  SSH keys provide secure authentication without entering passwords. 
                  After generating, add your public key to GitHub Settings → SSH Keys.
                </p>
                <div className="space-y-2">
                  {sshSetupCommands.map((cmd, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{cmd.label}: {cmd.description}</div>
                      <CopyCommandButton command={cmd.command} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(sshSetupCommands.map(c => c.command).join('\n'))}
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Copy All SSH Setup Steps
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={openSshFolder}
                    className="gap-2"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Open .ssh Folder
                  </Button>
                </div>
              </div>
            )}

            {/* Host Key Verification */}
            {detectedIssue === 'host-key-verification' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Host Key Verification Failed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  GitHub's SSH host key may have changed or you haven't connected before. 
                  This is usually safe to fix.
                </p>
                <div className="space-y-2">
                  {hostKeyFixCommands.map((cmd, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{cmd.label}: {cmd.description}</div>
                      <CopyCommandButton command={cmd.command} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Git Missing */}
            {detectedIssue === 'git-missing' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="font-semibold">Git Not Installed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Download and install Git for Windows. Make sure to include Git Credential Manager during installation.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast.info('Download Git from: https://git-scm.com/download/win');
                    copyToClipboard('https://git-scm.com/download/win');
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Copy Download URL
                </Button>
              </div>
            )}
          </>
        )}

        {/* Switch to SSH option */}
        {remoteType === 'https' && !detectedIssue && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Switch Remote to SSH (Optional)
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                SSH is often more reliable for automated pulls. These commands show you how to switch:
              </p>
              {switchToSshCommands.map((cmd, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs text-muted-foreground">{cmd.label}: {cmd.description}</div>
                  <CopyCommandButton command={cmd.command} />
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Quick actions */}
        {checks.some(c => c.status !== 'pending') && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={isRunning}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Test Auth Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openSshFolder}
                className="gap-2"
              >
                <FolderOpen className="h-3 w-3" />
                Open .ssh Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info('Open Windows Credential Manager: Control Panel → User Accounts → Credential Manager → Windows Credentials');
                  copyToClipboard('control /name Microsoft.CredentialManager');
                }}
                className="gap-2"
              >
                <Shield className="h-3 w-3" />
                Credential Manager Help
              </Button>
            </div>
          </>
        )}

        {/* Raw output (expandable) */}
        {rawOutput && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Command Output Details
                </span>
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={rawOutput}
                readOnly
                className="font-mono text-xs h-40 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Secrets and tokens are automatically redacted for safety.
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Security warning */}
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <strong className="text-amber-600 dark:text-amber-400">Never share private keys or tokens.</strong>
              {' '}If you accidentally pasted a secret, rotate/revoke it immediately. 
              This tool does not store or transmit any credentials.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
