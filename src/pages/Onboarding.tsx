/**
 * Onboarding Wizard - 3-step flow: Profile → Trading Style → Import
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, BarChart2, Upload, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const TRADING_STYLES = [
  { id: 'scalper', label: 'Scalper', desc: '1m-5m trades, multiple per day' },
  { id: 'daytrader', label: 'Day Trader', desc: '5m-1H, intraday only' },
  { id: 'swing', label: 'Swing Trader', desc: '4H-1D, holds 1-5 days' },
  { id: 'positional', label: 'Positional', desc: '1D+, holds weeks-months' },
];

const IMPORT_OPTIONS = [
  { id: 'csv', label: 'Import CSV', desc: 'Upload your trade history CSV', path: '/trades' },
  { id: 'manual', label: 'Log Manually', desc: 'Start logging trades one by one', path: '/trades' },
  { id: 'demo', label: 'Try Demo Data', desc: 'Seed 120 sample trades to explore', path: '/trading-dashboard' },
  { id: 'skip', label: 'Skip for Now', desc: 'Jump straight to the dashboard', path: '/trading-dashboard' },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() } as any)
        .eq('id', user.id);
      if (error) throw error;
      setStep(1);
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async (option: typeof IMPORT_OPTIONS[0]) => {
    if (option.id === 'demo') {
      setSaving(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await supabase.functions.invoke('seed-demo-trades', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.error) throw res.error;
        toast.success('120 demo trades seeded!');
      } catch (err: any) {
        toast.error('Failed to seed', { description: err.message });
      } finally {
        setSaving(false);
      }
    }
    localStorage.setItem('mmc_onboarding_done', 'true');
    navigate(option.path);
  };

  const steps = [
    { icon: User, label: 'Profile' },
    { icon: BarChart2, label: 'Style' },
    { icon: Upload, label: 'Import' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all",
                i <= step ? 'border-primary bg-primary text-primary-foreground' : 'border-muted text-muted-foreground'
              )}>
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={cn("text-xs hidden sm:inline", i <= step ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
              {i < steps.length - 1 && <div className={cn("w-8 h-0.5", i < step ? 'bg-primary' : 'bg-muted')} />}
            </div>
          ))}
        </div>

        {/* Step 0: Profile */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to MMC 🎉</CardTitle>
              <CardDescription>Let's set up your trading profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Trader Raj"
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={handleSaveProfile} disabled={saving || !displayName.trim()}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Trading Style */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Trading Style</CardTitle>
              <CardDescription>This helps us tailor your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TRADING_STYLES.map(style => (
                <div
                  key={style.id}
                  className={cn(
                    "p-3 rounded-lg border-2 cursor-pointer transition-all",
                    selectedStyle === style.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  <p className="font-medium text-sm">{style.label}</p>
                  <p className="text-xs text-muted-foreground">{style.desc}</p>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)} disabled={!selectedStyle}>
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Import */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>How would you like to begin?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {IMPORT_OPTIONS.map(opt => (
                <Button
                  key={opt.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-3"
                  onClick={() => handleFinish(opt)}
                  disabled={saving}
                >
                  <div className="text-left">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
