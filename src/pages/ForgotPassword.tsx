import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import mmcLogo from '@/assets/mmc-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const ForgotPassword = forwardRef<HTMLDivElement>(function ForgotPassword(_, ref) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { resetPassword, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    
    try {
      // First verify if email exists in our system
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-email-exists', {
        body: { email: email.trim().toLowerCase() }
      });
      
      if (verifyError || !verifyData?.exists) {
        setError('No account found with this email address');
        toast({
          title: 'Email Not Found',
          description: 'No account exists with this email. Please check and try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Email exists, proceed with reset
      const { error: resetError } = await resetPassword(email);
      
      if (resetError) {
        toast({
          title: 'Error',
          description: 'Failed to send reset email. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
      } else {
        setSent(true);
        setLoading(false);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <Card variant="default" className="w-full max-w-md animate-scale-in border-border">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center border border-success/30 shadow-[0_0_20px_hsl(var(--success)/0.3)]">
                <CheckCircle className="h-8 w-8 text-success drop-shadow-[0_0_8px_hsl(var(--success)/0.6)]" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold cyber-title-glow">Check your email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We've sent a password reset link to <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => setSent(false)} className="w-full h-11 cyber-btn-outline">
                Try a different email
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full h-11 gap-2 cyber-link">
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <CardDescription className="text-muted-foreground">
            No worries. We'll get you back on track.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium cyber-label">Email</Label>
              <div className="relative group cyber-input-wrapper">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 pr-4 h-11 md:h-12 cyber-input text-base"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {error && (
                <div className="animate-fade-in space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  {error.includes('No account found') && (
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{' '}
                      <Link to="/signup" className="text-primary hover:text-primary/80 hover:underline underline-offset-4 font-medium transition-colors cyber-link">
                        Sign up now
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <Button type="submit" variant="default" className="w-full h-12 gap-2 text-base" disabled={loading}>
              {loading ? (
                <>
                  <span className="cyber-spinner h-4 w-4" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cyber-link">
              <ArrowLeft className="h-3 w-3" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
export default ForgotPassword;