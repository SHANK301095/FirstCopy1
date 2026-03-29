import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, User, Wifi, WifiOff, RefreshCcw, Trash2, AlertTriangle, ChevronDown, ChevronUp, Copy, CheckCircle, TrendingUp, Shield, Zap } from 'lucide-react';
import mmcLogo from '@/assets/mmc-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { mapAuthError } from '@/lib/authErrorMapper';

// Define a schema for login form validation
const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter email or username (min 3 chars)'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ConnectionCheck =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; latencyMs: number }
  | { status: 'fail'; reason: string };

const SOCIAL_PROOF_STATS = [
  { icon: TrendingUp, label: 'Trades Analyzed', value: '2.4M+' },
  { icon: Shield, label: 'Risk Alerts Sent', value: '180K+' },
  { icon: Zap, label: 'AI Insights Generated', value: '500K+' },
];

const Login = forwardRef<HTMLDivElement>(function Login(_, ref) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [connection, setConnection] = useState<ConnectionCheck>({ status: 'idle' });

  const { signIn, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const runConnectionCheck = async (retryCount = 0): Promise<void> => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!baseUrl) {
      setConnection({ status: 'fail', reason: 'Backend config missing in this build.' });
      return;
    }

    if (navigator.onLine === false) {
      setConnection({ status: 'fail', reason: 'You appear to be offline.' });
      return;
    }

    setConnection({ status: 'checking' });

    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${baseUrl}/auth/v1/health`, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: {
          apikey: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''),
        },
      });

      const latencyMs = Math.round(performance.now() - started);

      if (res.ok) {
        setConnection({ status: 'ok', latencyMs });
      } else {
        setConnection({ status: 'fail', reason: `Backend responded (${res.status}).` });
      }
    } catch (e) {
      if (retryCount < 2) {
        window.clearTimeout(timeout);
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return runConnectionCheck(retryCount + 1);
      }
      const msg = e instanceof Error ? e.message : String(e);
      setConnection({ status: 'fail', reason: /abort/i.test(msg) ? 'Timeout reaching backend.' : 'Failed to reach backend.' });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  useEffect(() => {
    const savedIdentifier = localStorage.getItem('mmc-remembered-identifier');
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }
  }, []);

  const handleClearCacheAndRetry = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      sessionStorage.removeItem('chunk_retry');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      const fieldErrors: { identifier?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'identifier') fieldErrors.identifier = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    if (rememberMe) {
      localStorage.setItem('mmc-remembered-identifier', identifier);
    } else {
      localStorage.removeItem('mmc-remembered-identifier');
    }

    let email = identifier;

    if (!identifier.includes('@')) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', identifier.toLowerCase())
          .maybeSingle();

        if (error || !data) {
          toast({
            title: 'Error',
            description: 'Username not found. Please check and try again.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        toast({
          title: 'Username Login',
          description: 'Please use your email to login. Username login requires email in profile.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to lookup username',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    try {
      const { error } = await signIn(email, password);

      if (error) {
        const mapped = mapAuthError(error.message);
        toast({
          title: 'Error',
          description: mapped.message,
          variant: 'destructive',
        });
        void runConnectionCheck();
        setLoading(false);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const mapped = mapAuthError(message);
      toast({
        title: 'Error',
        description: mapped.message,
        variant: 'destructive',
      });
      void runConnectionCheck();
      setLoading(false);
    }
  };

  const ConnectionStatusRow = () => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [copiedStep, setCopiedStep] = useState<string | null>(null);
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

    const copyToClipboard = (text: string, step: string) => {
      navigator.clipboard?.writeText(text);
      setCopiedStep(step);
      setTimeout(() => setCopiedStep(null), 2000);
    };

    const icon = !online ? (
      <WifiOff className="h-4 w-4 text-destructive" />
    ) : connection.status === 'ok' ? (
      <Wifi className="h-4 w-4 text-chart-2" />
    ) : connection.status === 'fail' ? (
      <AlertTriangle className="h-4 w-4 text-warning" />
    ) : (
      <Wifi className="h-4 w-4" />
    );

    const text = !online
      ? 'Aap offline ho'
      : connection.status === 'checking'
        ? 'Connecting… (auto-retry active)'
        : connection.status === 'ok'
          ? `Connected (${connection.latencyMs}ms)`
          : connection.status === 'fail'
            ? 'Server tak nahi pahunch pa rahe'
            : 'Connection: idle';

    const isFail = connection.status === 'fail';

    return (
      <div className="mt-3 space-y-2">
        <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${isFail ? 'border-warning/50 bg-warning/5' : 'border-border bg-card/40'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{icon}</span>
            <span className={isFail ? 'text-warning font-medium' : ''}>{text}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => runConnectionCheck()}
            disabled={connection.status === 'checking'}
          >
            <RefreshCcw className={`h-4 w-4 ${connection.status === 'checking' ? 'animate-spin' : ''}`} />
            <span className="sr-only">Recheck</span>
          </Button>
        </div>

        {isFail && (
          <div className="space-y-2.5">
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground/90">
                ⚠️ Aapka internet provider (ISP) humare server ko block kar raha hai
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ye app ka issue nahi hai. Kuch Indian ISPs (Jio, Airtel, BSNL) kabhi-kabhi kuch domains block karte hain. Neeche one-tap fix hai:
              </p>
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary">⚡ Sabse Aasaan Fix (1 min)</p>
              {isMobile ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    Cloudflare ka <strong>1.1.1.1</strong> app install karo — ek button dabao, done!
                  </p>
                  <div className="flex gap-2">
                    <a href="https://apps.apple.com/app/1-1-1-1-faster-internet/id1423538627" target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-md border border-border bg-card px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors">📱 iPhone</a>
                    <a href="https://play.google.com/store/apps/details?id=com.cloudflare.onedotonedotonedotone" target="_blank" rel="noopener noreferrer" className="flex-1 text-center rounded-md border border-border bg-card px-3 py-2 text-[11px] font-medium text-foreground hover:bg-muted transition-colors">📱 Android</a>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">Install → Open → Big button tap karo → Done. Phir yahan retry karo.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Cloudflare ka <strong>1.1.1.1</strong> app install karo — ek click, sab fix:</p>
                  <a href="https://one.one.one.one/" target="_blank" rel="noopener noreferrer" className="block text-center rounded-md border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">🌐 Download 1.1.1.1 App (Free)</a>
                  <p className="text-[10px] text-muted-foreground/70">Install → Enable → Retry. Koi DNS manually change nahi karna padega.</p>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border bg-card/40 p-2.5">
              <p className="text-[11px] text-muted-foreground">💡 <strong>Quick test:</strong> Phone ka hotspot ON karo aur laptop connect karo. Agar kaam kare = ISP block confirmed.</p>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => runConnectionCheck()}>
                <RefreshCcw className="h-3 w-3" /> Retry Connection
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleClearCacheAndRetry}>
                <Trash2 className="h-3 w-3" /> Clear Cache
              </Button>
            </div>

            <button type="button" className="w-full flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-1.5 text-[11px] text-muted-foreground/70 hover:bg-card/60 transition-colors" onClick={() => setShowAdvanced(!showAdvanced)}>
              <span>Manual DNS fix (advanced)</span>
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showAdvanced && (
              <div className="rounded-md border border-border bg-card/60 p-3 space-y-2.5 text-[11px] text-muted-foreground">
                <div className="space-y-1 pl-2 border-l-2 border-border">
                  <p className="font-medium text-foreground/80">Windows:</p>
                  <p>Settings → Network → Wi-Fi → DNS → Manual</p>
                  <p>IPv4: <code className="bg-muted px-1 rounded text-foreground/90">1.1.1.1</code>, Alt: <code className="bg-muted px-1 rounded text-foreground/90">1.0.0.1</code></p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground/90 flex-1">ipconfig /flushdns</code>
                    <button type="button" onClick={() => copyToClipboard('ipconfig /flushdns', 'win')} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedStep === 'win' ? <CheckCircle className="h-3 w-3 text-chart-2" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-border">
                  <p className="font-medium text-foreground/80">Mac:</p>
                  <p>System Settings → Wi-Fi → Details → DNS</p>
                  <p>Add: <code className="bg-muted px-1 rounded text-foreground/90">1.1.1.1</code> aur <code className="bg-muted px-1 rounded text-foreground/90">1.0.0.1</code></p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground/90 flex-1 break-all">sudo dscacheutil -flushcache</code>
                    <button type="button" onClick={() => copyToClipboard('sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder', 'mac')} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedStep === 'mac' ? <CheckCircle className="h-3 w-3 text-chart-2" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/60 text-center pt-1 border-t border-border">DNS change ke baad browser restart karo, phir retry karo.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className="min-h-screen flex items-center justify-center bg-background px-4 py-6 relative overflow-hidden"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
      }}
    >
      {/* Background gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-chart-2/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 items-center relative z-10">
        {/* Left Panel — Social proof (desktop only) */}
        <div className="hidden lg:flex flex-col gap-6 flex-1 max-w-sm">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">India's #1 AI Trading Platform</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Join thousands of traders using AI-powered analytics, risk management, and automated journaling to grow their edge.
            </p>
          </div>

          <div className="space-y-3">
            {SOCIAL_PROOF_STATS.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-border/50 backdrop-blur-sm">
                <div className="p-2 rounded-md bg-primary/10">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border border-chart-2/20 bg-chart-2/5">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {['R', 'S', 'A', 'P'][i - 1]}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-chart-2">10,000+</span> traders trust MMC
            </p>
          </div>
        </div>

        {/* Right Panel — Login Form */}
        <Card variant="default" className="w-full max-w-md animate-fade-in border-border/60 backdrop-blur-sm bg-card/80">
          <CardHeader className="text-center pb-2 pt-4 md:pt-6">
            <div className="flex items-center justify-center mb-4 md:mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <img
                  src={mmcLogo}
                  alt="MMC Logo"
                  className="h-12 md:h-14 w-auto object-contain"
                  width="64"
                  height="64"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">Your edge awaits. Let's continue.</CardDescription>
          </CardHeader>
          <CardContent className="pt-3 md:pt-4 pb-4 md:pb-6 px-4 md:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-xs md:text-sm font-medium">
                  Email or Username
                </Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="you@example.com or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-11 pr-4 h-11 md:h-12 text-base"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                {errors.identifier && <p className="text-xs text-destructive animate-fade-in">{errors.identifier}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs md:text-sm font-medium">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-14 h-11 md:h-12 text-base"
                    disabled={loading}
                    autoComplete="current-password"
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
                {errors.password && <p className="text-xs text-destructive animate-fade-in">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={loading}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
                  />
                  <Label htmlFor="remember" className="text-xs md:text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    Remember me
                  </Label>
                </div>
                <Link to="/forgot-password" className="text-xs md:text-sm text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors touch-manipulation">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="default"
                className="w-full h-11 md:h-12 gap-2 text-sm md:text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {connection.status === 'fail' && <ConnectionStatusRow />}
            </form>

            <div className="mt-6 text-center text-xs md:text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:text-primary/80 hover:underline underline-offset-4 font-medium transition-colors touch-manipulation">
                Sign up
              </Link>
            </div>

            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link to="/premium">View Premium Features</Link>
              </Button>
            </div>

            <div className="mt-3 text-center">
              <Link to="/landing" className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 touch-manipulation">
                <ArrowRight className="h-3 w-3 rotate-180" />
                Back to landing
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default Login;
