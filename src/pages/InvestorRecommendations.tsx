/**
 * Investor Mode — Strategy Recommendations (Screen B)
 * Top 7 cards with explainability
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, Shield, AlertTriangle, Play, Info, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageTitle } from '@/components/ui/PageTitle';
import { cn } from '@/lib/utils';

interface Recommendation {
  strategy_id: string;
  name: string;
  description: string;
  score: number;
  reasons: string[];
  risks: string[];
  ideal_for: string;
  recommended_settings: {
    mode: string;
    risk_rules: Record<string, unknown>;
  };
}

export default function InvestorRecommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendations = [], disclaimer = '' } = (location.state || {}) as {
    recommendations: Recommendation[];
    disclaimer: string;
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in text-center py-20">
        <p className="text-muted-foreground">Koi recommendations nahi mili. Pehle Goal Wizard complete karein.</p>
        <Button onClick={() => navigate('/investor/goal')}>Goal Wizard →</Button>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-profit bg-profit/10 border-profit/30';
    if (score >= 50) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-muted-foreground bg-muted border-border';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/investor/goal')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageTitle
          title="Recommended Strategies"
          subtitle="Aapke profile ke hisaab se top matches"
        />
      </div>

      {/* Disclaimer */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{disclaimer}</p>
        </CardContent>
      </Card>

      {/* Strategy Cards */}
      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <Card
            key={rec.strategy_id}
            className={cn(
              'transition-all hover:shadow-md',
              idx === 0 && 'ring-2 ring-primary/30'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {idx === 0 && <Badge className="bg-primary text-primary-foreground text-xs">Best Match</Badge>}
                    <Badge variant="outline" className={cn('text-xs font-bold', getScoreColor(rec.score))}>
                      {rec.score}/100
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{rec.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{rec.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reasons */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-profit" /> Kisliye recommend
                </p>
                <ul className="space-y-1">
                  {rec.reasons.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-profit mt-0.5">✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /> Kya risk hai
                </p>
                <ul className="space-y-1">
                  {rec.risks.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">⚠</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ideal for */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm"><span className="font-medium">Ideal for you if:</span> {rec.ideal_for}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => navigate('/investor/strategy-detail', {
                    state: { recommendation: rec }
                  })}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Paper Start
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/investor/strategy-detail', {
                    state: { recommendation: rec }
                  })}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
