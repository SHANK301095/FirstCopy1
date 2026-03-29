import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import mmcLogo from '@/assets/mmc-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = forwardRef<HTMLDivElement>(function ResetPassword(_, ref) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle the password recovery event from URL hash
  useEffect(() => {
    const handleRecovery = async () => {
      // Check if there's a hash in the URL (contains access_token for recovery)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        // Set the session from the recovery token
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (error) {
          toast({
            title: 'Invalid or expired link',
            description: 'Please request a new password reset link.',
            variant: 'destructive',
          });
          navigate('/forgot-password');
          return;
        }
        
        if (data.session) {
          setIsValidSession(true);
          setIsChecking(false);
          // Clear the hash from URL for cleaner look
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
      }
      
      // Also check for existing session (user might have refreshed the page)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
        setIsChecking(false);
        return;
      }
      
      // No valid session found
      setIsChecking(false);
      toast({
        title: 'Invalid or expired link',
        description: 'Please request a new password reset link.',
        variant: 'destructive',
      });
      navigate('/forgot-password');
    };

    handleRecovery();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    setLoading(true);
    
    const { error } = await updatePassword(password);
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  // Background component removed - using clean minimal background

  // Show loading state while checking session
  if (isChecking) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card variant="default" className="w-full max-w-md border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center mb-4 border border-primary/30">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Verifying your reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card variant="default" className="w-full max-w-md animate-fade-in border-border">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center border border-success/30">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Password updated!</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Link to="/" className="w-full">
              <Button variant="default" className="w-full h-12 gap-2 text-base">
                Continue to app
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return null; // Will redirect in useEffect
  }

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card variant="default" className="w-full max-w-md animate-fade-in border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <img 
                src={mmcLogo} 
                alt="MMC Logo" 
                className="h-14 w-auto object-contain" 
                width="64"
                height="64"
                loading="eager"
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Secure your edge. Choose a strong password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium cyber-label">New Password</Label>
              <div className="relative group cyber-input-wrapper">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-14 h-11 md:h-12 cyber-input text-base"
                  disabled={loading}
                  autoFocus
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-primary focus:text-primary focus:outline-none transition-colors p-1.5 rounded-md hover:bg-primary/10 z-10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive animate-fade-in">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium cyber-label">Confirm Password</Label>
              <div className="relative group cyber-input-wrapper">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-11 pr-4 h-11 md:h-12 cyber-input text-base"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive animate-fade-in">{errors.confirmPassword}</p>}
            </div>
            
            <Button type="submit" variant="default" className="w-full h-12 gap-2 text-base" disabled={loading}>
              {loading ? (
                <>
                  <span className="cyber-spinner h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
});
export default ResetPassword;