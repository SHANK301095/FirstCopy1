/**
 * Investor Mode — Strategy Detail (Screen C)
 * Plain language, risk guardrails, CTA: Paper Trading Start
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Play, AlertTriangle, CheckCircle2, Settings, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PageTitle } from '@/components/ui/PageTitle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function InvestorStrategyDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { recommendation } = (location.state || {}) as { recommendation: any };
  const [loading, setLoading] = useState(false);

  // Risk guardrails — default ON
  const defaultRules = recommendation?.recommended_settings?.risk_rules || {};
  const [riskRules, setRiskRules] = useState({
    maxDailyLossPct: defaultRules.maxDailyLossPct || 3,
    maxOpenTrades: defaultRules.maxOpenTrades || 3,
    cooldownAfterLossMin: defaultRules.cooldownAfterLossMin || 30,
    killSwitch: false,
  });

  if (!recommendation) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-muted-foreground">Strategy nahi mili. Pehle recommendations dekhein.</p>
        <Button onClick={() => navigate('/investor/goal')}>Goal Wizard →</Button>
      </div>
    );
  }

  const startPaperTrading = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Create chosen_strategy_instance
      const { data: instance, error } = await supabase
        .from('chosen_strategy_instances')
        .insert({
          user_id: user.id,
          base_strategy_id: recommendation.strategy_id,
          name: recommendation.name,
          overrides: {},
          risk_ruleset: riskRules,
          mode: 'paper',
          status: 'active',
          paper_started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log execution start event
      await supabase.from('investor_executions').insert({
        user_id: user.id,
        instance_id: instance.id,
        event_type: 'paper_started',
        payload: { strategy: recommendation.name, risk_rules: riskRules },
      });

      toast({ title: '🎉 Paper Trading Started!', description: `${recommendation.name} paper mode me active hai` });
      navigate('/investor/console', { state: { instanceId: instance.id } });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageTitle title={recommendation.name} subtitle="Strategy Details" />
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-profit" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{recommendation.description}</p>
          <Badge variant="outline" className="text-sm">
            Score: {recommendation.score}/100
          </Badge>
        </CardContent>
      </Card>

      {/* Risk Guardrails */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Risk Guardrails
            <Badge className="bg-profit/10 text-profit text-xs ml-2">DEFAULT ON</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Max Daily Loss %</Label>
              <Input
                type="number"
                value={riskRules.maxDailyLossPct}
                onChange={e => setRiskRules(r => ({ ...r, maxDailyLossPct: Number(e.target.value) }))}
                min={1}
                max={20}
              />
              <p className="text-xs text-muted-foreground">Isse zyada loss hone pe trading ruk jayegi</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Max Open Trades</Label>
              <Input
                type="number"
                value={riskRules.maxOpenTrades}
                onChange={e => setRiskRules(r => ({ ...r, maxOpenTrades: Number(e.target.value) }))}
                min={1}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cooldown after Loss (min)</Label>
              <Input
                type="number"
                value={riskRules.cooldownAfterLossMin}
                onChange={e => setRiskRules(r => ({ ...r, cooldownAfterLossMin: Number(e.target.value) }))}
                min={0}
                max={120}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <div>
                <Label className="text-sm font-medium">Kill Switch</Label>
                <p className="text-xs text-muted-foreground">Emergency stop</p>
              </div>
              <Switch
                checked={riskRules.killSwitch}
                onCheckedChange={v => setRiskRules(r => ({ ...r, killSwitch: v }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What to expect */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kya expect karein</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm">📊 <span className="font-medium">Expected range:</span> Returns vary karenge — koi guarantee nahi hai</p>
            <p className="text-sm">⏱️ <span className="font-medium">Paper trading pehle:</span> Kam se kam 3 din ya 10 trades paper me complete karo</p>
            <p className="text-sm">🛡️ <span className="font-medium">Risk protection:</span> Guardrails automatically trades block karenge agar limits exceed ho</p>
          </div>
        </CardContent>
      </Card>

      {/* What can go wrong */}
      <Card className="border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Kya galat ho sakta hai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendation.risks.map((r: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">⚠</span> {r}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex gap-3 sticky bottom-4">
        <Button
          className="flex-1 h-14 text-base"
          onClick={startPaperTrading}
          disabled={loading}
        >
          {loading ? 'Starting...' : (
            <><Play className="h-5 w-5 mr-2" /> Paper Trading Start</>
          )}
        </Button>
        <Button variant="outline" className="h-14 opacity-60" disabled>
          <Lock className="h-4 w-4 mr-2" /> Live
          <span className="text-xs ml-1">(Paper pehle)</span>
        </Button>
      </div>
    </div>
  );
}
