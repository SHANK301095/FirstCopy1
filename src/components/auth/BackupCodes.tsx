/**
 * Phase 3: 2FA Backup Codes Component
 * Generate, display, and manage backup recovery codes
 */

import { useState } from 'react';
import { Copy, Download, RefreshCw, Shield, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BackupCodesProps {
  codes?: string[];
  onRegenerate?: () => Promise<string[]>;
  className?: string;
}

/** Generate 8 random backup codes (format: XXXX-XXXX) */
function generateCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const a = Math.random().toString(36).substring(2, 6).toUpperCase();
    const b = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${a}-${b}`;
  });
}

export function BackupCodes({ codes: initialCodes, onRegenerate, className }: BackupCodesProps) {
  const { toast } = useToast();
  const [codes, setCodes] = useState<string[]>(initialCodes || []);
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleGenerate = async () => {
    setRegenerating(true);
    try {
      const newCodes = onRegenerate ? await onRegenerate() : generateCodes();
      setCodes(newCodes);
      setShowCodes(true);
      toast({ title: 'Backup codes generated', description: 'Save these codes in a safe place!' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied', description: 'Backup codes copied to clipboard' });
  };

  const handleDownload = () => {
    const text = `MMC Backup Recovery Codes\nGenerated: ${new Date().toISOString()}\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n⚠️ Each code can only be used once.\nStore these codes in a safe, offline location.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mmc-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Backup Recovery Codes
        </CardTitle>
        <CardDescription className="text-xs">
          Use these one-time codes if you lose access to your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {codes.length > 0 && showCodes ? (
          <>
            <Alert>
              <AlertTitle className="text-xs">⚠️ Save these codes now</AlertTitle>
              <AlertDescription className="text-xs">
                Each code can only be used once. Store them offline.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-1.5 p-3 bg-muted/50 rounded-lg font-mono text-xs">
              {codes.map((code, i) => (
                <div key={i} className="py-1 px-2 rounded bg-background/50">
                  {i + 1}. {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleDownload}>
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full text-xs">
                {codes.length > 0 ? 'View Backup Codes' : 'Generate Backup Codes'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Backup Codes</DialogTitle>
                <DialogDescription>
                  This will generate 8 new backup codes. Any existing codes will be invalidated.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={regenerating}>
                  {regenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {regenerating ? 'Generating...' : 'Generate Codes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
