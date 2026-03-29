/**
 * Two-Factor Authentication Setup
 * Phase 5: 2FA with TOTP support
 */

import { useState } from 'react';
import { 
  Shield, Smartphone, Key, Copy, Check, 
  AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';
import { BackupCodes } from './BackupCodes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TwoFactorSetupProps {
  isEnabled?: boolean;
  onEnable?: (code: string) => Promise<boolean>;
  onDisable?: (code: string) => Promise<boolean>;
  className?: string;
}

export function TwoFactorSetup({ 
  isEnabled = false, 
  onEnable,
  onDisable,
  className 
}: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mock secret key - in production, this comes from the backend
  const secretKey = 'JBSWY3DPEHPK3PXP';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/MMC:user@example.com?secret=${secretKey}&issuer=MMC`;

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied', description: 'Secret key copied to clipboard' });
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) return;
    
    setIsLoading(true);
    try {
      const success = await onEnable?.(verifyCode);
      if (success !== false) {
        toast({ 
          title: '2FA Enabled', 
          description: 'Two-factor authentication is now active' 
        });
        setIsSetupOpen(false);
        setStep('qr');
        setVerifyCode('');
      } else {
        toast({ 
          title: 'Invalid Code', 
          description: 'Please try again',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (verifyCode.length !== 6) return;
    
    setIsLoading(true);
    try {
      const success = await onDisable?.(verifyCode);
      if (success !== false) {
        toast({ 
          title: '2FA Disabled', 
          description: 'Two-factor authentication has been removed' 
        });
        setIsDisableOpen(false);
        setVerifyCode('');
      } else {
        toast({ 
          title: 'Invalid Code', 
          description: 'Please try again',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isEnabled ? 'bg-profit/20' : 'bg-muted'
            )}>
              {isEnabled ? (
                <CheckCircle className="h-5 w-5 text-profit" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">Authenticator App</p>
              <p className="text-sm text-muted-foreground">
                {isEnabled ? 'Enabled' : 'Not configured'}
              </p>
            </div>
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'}>
            {isEnabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {!isEnabled ? (
          <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Smartphone className="h-4 w-4 mr-2" />
                Set Up 2FA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  {step === 'qr' 
                    ? 'Scan the QR code with your authenticator app'
                    : 'Enter the 6-digit code from your app'
                  }
                </DialogDescription>
              </DialogHeader>

              {step === 'qr' ? (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img 
                      src={qrCodeUrl} 
                      alt="2FA QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                  
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>Manual Entry</AlertTitle>
                    <AlertDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {secretKey}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={copySecret}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSetupOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setStep('verify')}>
                      Continue
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={6} 
                      value={verifyCode}
                      onChange={setVerifyCode}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setStep('qr')}>
                      Back
                    </Button>
                    <Button 
                      onClick={handleVerify}
                      disabled={verifyCode.length !== 6 || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Enable 2FA'
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={isDisableOpen} onOpenChange={setIsDisableOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Manage 2FA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                <DialogDescription>
                  Enter your 2FA code to disable authentication
                </DialogDescription>
              </DialogHeader>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Disabling 2FA will make your account less secure
                </AlertDescription>
              </Alert>

              <div className="flex justify-center py-4">
                <InputOTP 
                  maxLength={6} 
                  value={verifyCode}
                  onChange={setVerifyCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDisableOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={verifyCode.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Disable 2FA'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <p className="text-xs text-muted-foreground">
          Use an authenticator app like Google Authenticator, Authy, or 1Password to generate codes
        </p>

        {/* Phase 3: Backup Recovery Codes */}
        {isEnabled && (
          <div className="pt-2 border-t border-border/50">
            <BackupCodes />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
