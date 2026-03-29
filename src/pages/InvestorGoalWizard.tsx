/**
 * Investor Mode — Goal Wizard (Screen A)
 * Hinglish, mobile-first, no charts
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight, Shield, DollarSign, Clock, Layers, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTitle } from '@/components/ui/PageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ASSET_OPTIONS = [
  { value: 'forex', label: 'Forex', emoji: '💱' },
  { value: 'indices', label: 'Indices', emoji: '📊' },
  { value: 'gold', label: 'Gold', emoji: '🥇' },
  { value: 'crypto', label: 'Crypto', emoji: '₿' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner — "Market me naya hoon"' },
  { value: 'intermediate', label: 'Intermediate — "Kuch experience hai"' },
  { value: 'advanced', label: 'Advanced — "Full-time trader hoon"' },
];

export default function InvestorGoalWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [capital, setCapital] = useState(100000);
  const [maxDD, setMaxDD] = useState(15);
  const [horizon, setHorizon] = useState('90');
  const [assets, setAssets] = useState<string[]>(['forex']);
  const [experience, setExperience] = useState('beginner');
  const [goalText, setGoalText] = useState('');

  const toggleAsset = (a: string) => {
    setAssets(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = {
        capital,
        horizon_days: parseInt(horizon),
        risk_level: maxDD <= 10 ? 'conservative' : maxDD <= 20 ? 'moderate' : 'aggressive',
        max_drawdown_pct: maxDD,
        preferred_assets: assets,
        experience,
        goal_text: goalText,
      };

      // Upsert investor profile
      const { error: profileErr } = await supabase
        .from('investor_profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          target_return_band: { min: maxDD <= 10 ? 3 : 5, max: maxDD <= 10 ? 10 : 20 },
        }, { onConflict: 'user_id' });

      if (profileErr) throw profileErr;

      // Get recommendations
      const { data, error } = await supabase.functions.invoke('investor-recommend', {
        body: { profile, goal_text: goalText },
      });

      if (error) throw error;

      // Navigate to recommendations with data
      navigate('/investor/recommendations', { state: { recommendations: data.recommendations, disclaimer: data.disclaimer } });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0: Capital
    <div key="capital" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <DollarSign className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Aapka capital kitna hai?</h2>
        <p className="text-sm text-muted-foreground">Starting amount — baad me change bhi kar sakte ho</p>
      </div>
      <div className="space-y-4">
        <Input
          type="number"
          value={capital}
          onChange={e => setCapital(Number(e.target.value))}
          className="text-2xl font-bold text-center h-14"
          min={1000}
        />
        <div className="flex gap-2 justify-center flex-wrap">
          {[10000, 50000, 100000, 500000, 1000000].map(v => (
            <Badge
              key={v}
              variant={capital === v ? 'default' : 'outline'}
              className="cursor-pointer text-sm px-3 py-1"
              onClick={() => setCapital(v)}
            >
              ₹{(v / 1000)}K
            </Badge>
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Max DD
    <div key="dd" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <Shield className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Kitna max loss tolerate kar sakte ho?</h2>
        <p className="text-sm text-muted-foreground">Maximum Drawdown % — ye aapki safety limit hai</p>
      </div>
      <div className="space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold">{maxDD}%</span>
          <p className="text-sm text-muted-foreground mt-1">
            = ₹{Math.round(capital * maxDD / 100).toLocaleString()} max loss
          </p>
        </div>
        <Slider
          value={[maxDD]}
          onValueChange={([v]) => setMaxDD(v)}
          min={5}
          max={40}
          step={1}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>🛡️ Conservative (5%)</span>
          <span>⚖️ Moderate (15%)</span>
          <span>🔥 Aggressive (40%)</span>
        </div>
      </div>
    </div>,

    // Step 2: Horizon + Assets
    <div key="horizon" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
          <Clock className="h-7 w-7 text-accent-foreground" />
        </div>
        <h2 className="text-xl font-bold">Time horizon aur assets</h2>
        <p className="text-sm text-muted-foreground">Kitne time ke liye invest karna hai?</p>
      </div>
      <div className="space-y-4">
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Time horizon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">1 week</SelectItem>
            <SelectItem value="30">1 month</SelectItem>
            <SelectItem value="90">3 months</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
            <SelectItem value="365">1 year</SelectItem>
          </SelectContent>
        </Select>

        <Label className="text-sm font-medium">Assets me interest</Label>
        <div className="grid grid-cols-2 gap-3">
          {ASSET_OPTIONS.map(a => (
            <button
              key={a.value}
              onClick={() => toggleAsset(a.value)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all text-left',
                assets.includes(a.value)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <span className="text-2xl">{a.emoji}</span>
              <p className="font-medium mt-1">{a.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 3: Experience + Goal
    <div key="goal" className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Aapka experience aur goal</h2>
        <p className="text-sm text-muted-foreground">Taaki hum best strategies match kar sakein</p>
      </div>
      <div className="space-y-4">
        <Select value={experience} onValueChange={setExperience}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-y-2">
          <Label>Goal (optional — Hinglish me bhi likh sakte ho)</Label>
          <Textarea
            value={goalText}
            onChange={e => setGoalText(e.target.value)}
            placeholder="e.g., Mujhe stable returns chahiye bina zyada risk ke..."
            rows={3}
          />
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in pb-20">
      <PageTitle
        title="Investor Mode"
        subtitle="No charts, no coding — sirf smart investing"
      />

      {/* Progress */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full flex-1 transition-all',
              i <= step ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 pb-8">
          {steps[step]}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
            Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1" onClick={() => setStep(s => s + 1)}>
            Aage Badhein <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSubmit} disabled={loading || assets.length === 0}>
            {loading ? 'Finding best strategies...' : (
              <>Best strategies dikhao <Sparkles className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
