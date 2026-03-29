import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone } from 'lucide-react';
import mmcLogo from '@/assets/mmc-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { mapAuthError } from '@/lib/authErrorMapper';

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^[+]?[\d\s-]+$/, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Signup = forwardRef<HTMLDivElement>(function Signup(_, ref) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; displayName?: string; email?: string; phone?: string; password?: string; confirmPassword?: string }>({});
  
  const { signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Store referral code and affiliate code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('mmc_ref_code', refCode);
    }
    const affCode = searchParams.get('aff');
    if (affCode) {
      localStorage.setItem('mmc_aff_code', affCode);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate inputs
    const result = signupSchema.safeParse({ username, displayName, email, phone, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    
    setLoading(true);
    
    const { error, needsEmailConfirmation } = await signUp(email, password, displayName, username, phone);

    if (error) {
      const mapped = mapAuthError(error.message);

      // Set field-specific error if applicable
      if (mapped.field === 'password') {
        setErrors(prev => ({ ...prev, password: mapped.message }));
      } else if (mapped.field === 'email') {
        setErrors(prev => ({ ...prev, email: mapped.message }));
      }

      toast({
        title: 'Error',
        description: mapped.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (needsEmailConfirmation) {
      toast({
        title: 'Account created',
        description: 'Aapke email par confirmation link gaya hai. Pehle confirm karke phir sign in karein.',
      });
      setLoading(false);
      navigate('/login', { replace: true });
      return;
    }

    // Process referral code after successful signup
    try {
      const storedRef = localStorage.getItem('mmc_ref_code');
      if (storedRef) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('referral_code', storedRef)
          .maybeSingle();

        if (referrer && user) {
          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: user.id,
            referral_code: storedRef,
            status: 'converted',
            converted_at: new Date().toISOString(),
          } as any);

          localStorage.removeItem('mmc_ref_code');
          toast({
            title: '🎁 Welcome bonus!',
            description: `You got 2 weeks Pro free! Courtesy of ${referrer.display_name || 'a friend'}.`,
          });
        }
      }
    } catch {
      // Don't block signup on referral failure
    }

    // Process affiliate tracking after successful signup
    try {
      const storedAff = localStorage.getItem('mmc_aff_code');
      if (storedAff && user) {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('affiliate_code', storedAff)
          .eq('status', 'approved')
          .maybeSingle();

        if (affiliate) {
          await supabase.from('affiliate_clicks').insert({
            affiliate_id: affiliate.id,
            converted: true,
            referred_user_id: user.id,
          });
          localStorage.removeItem('mmc_aff_code');
        }
      }
    } catch {
      // Don't block signup on affiliate tracking failure
    }

    navigate('/', { replace: true });
  };

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
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
          <CardTitle className="text-2xl font-bold cyber-title-glow">Welcome to MMC</CardTitle>
          <CardDescription className="text-muted-foreground">Build your edge. Own your process.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium cyber-label">Username</Label>
              <div className="relative group cyber-input-wrapper">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none">@</span>
                <Input
                  id="username"
                  type="text"
                  placeholder="trader_pro"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="pl-11 pr-4 h-12 cyber-input"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              {errors.username && <p className="text-sm text-destructive animate-fade-in">{errors.username}</p>}
              <p className="text-xs text-muted-foreground">You can login with this username or email</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium cyber-label">Display Name</Label>
              <div className="relative group cyber-input-wrapper">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-11 pr-4 h-12 cyber-input"
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              {errors.displayName && <p className="text-sm text-destructive animate-fade-in">{errors.displayName}</p>}
            </div>
            
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
                  className="pl-11 pr-4 h-12 cyber-input"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-sm text-destructive animate-fade-in">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium cyber-label">Mobile Number <span className="text-destructive">*</span></Label>
              <div className="relative group cyber-input-wrapper">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-11 pr-4 h-12 cyber-input"
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>
              {errors.phone && <p className="text-sm text-destructive animate-fade-in">{errors.phone}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium cyber-label">Password</Label>
              <div className="relative group cyber-input-wrapper">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-14 h-12 cyber-input"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary focus:text-primary focus:outline-none transition-colors p-2 rounded-md hover:bg-primary/10 min-w-[44px] min-h-[44px] flex items-center justify-center z-10 touch-manipulation"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                  className="pl-11 pr-4 h-12 cyber-input"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive animate-fade-in">{errors.confirmPassword}</p>}
            </div>
            
            <Button 
              type="submit" 
              variant="default"
              className="w-full h-12 gap-2 text-base mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="cyber-spinner h-4 w-4" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:text-primary/80 hover:underline underline-offset-4 font-medium transition-colors cyber-link">
              Sign in
            </Link>
          </div>
          
          <div className="mt-4 text-center">
            <Link to="/landing" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cyber-link">
              <ArrowRight className="h-3 w-3 rotate-180" />
              Back to landing page
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default Signup;
