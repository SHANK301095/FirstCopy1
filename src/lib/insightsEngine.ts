/**
 * Offline Insights Engine V3.0
 * Rule-based trade analysis and suggestions (Tier 1 AI-like)
 * No external API calls - 100% offline
 */

export interface Trade {
  entryTime: number | string;
  exitTime: number | string;
  direction: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  symbol?: string;
}

export interface InsightResult {
  id: string;
  type: 'warning' | 'suggestion' | 'info' | 'success';
  category: 'session' | 'drawdown' | 'sizing' | 'exits' | 'entries' | 'pattern' | 'risk';
  title: string;
  description: string;
  confidence: number; // 0-100
  actionable: boolean;
  suggestedAction?: string;
}

export interface AnalysisInput {
  trades: Trade[];
  equity?: number[];
  metrics?: {
    winRate: number;
    profitFactor: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    avgWin?: number;
    avgLoss?: number;
  };
}

// Analyze trades and generate insights
export function generateInsights(input: AnalysisInput): InsightResult[] {
  const insights: InsightResult[] = [];
  const { trades, metrics } = input;

  if (trades.length === 0) return insights;

  // 1. Session Analysis - Find loss clustering by hour
  const sessionInsights = analyzeSessionPatterns(trades);
  insights.push(...sessionInsights);

  // 2. Drawdown Analysis
  const drawdownInsights = analyzeDrawdownPatterns(trades, metrics);
  insights.push(...drawdownInsights);

  // 3. Win/Loss Pattern Analysis
  const patternInsights = analyzeWinLossPatterns(trades);
  insights.push(...patternInsights);

  // 4. Risk/Reward Analysis
  const riskInsights = analyzeRiskReward(trades, metrics);
  insights.push(...riskInsights);

  // 5. Exit Analysis
  const exitInsights = analyzeExits(trades, metrics);
  insights.push(...exitInsights);

  // Sort by confidence and filter low-confidence
  return insights
    .filter(i => i.confidence >= 50)
    .sort((a, b) => b.confidence - a.confidence);
}

function analyzeSessionPatterns(trades: Trade[]): InsightResult[] {
  const insights: InsightResult[] = [];
  
  // Group trades by hour
  const hourStats: Record<number, { wins: number; losses: number; pnl: number }> = {};
  
  for (const trade of trades) {
    const hour = new Date(trade.entryTime).getHours();
    if (!hourStats[hour]) hourStats[hour] = { wins: 0, losses: 0, pnl: 0 };
    
    if (trade.pnl >= 0) hourStats[hour].wins++;
    else hourStats[hour].losses++;
    hourStats[hour].pnl += trade.pnl;
  }

  // Find worst performing hours
  const hourlyPnl = Object.entries(hourStats)
    .map(([hour, stats]) => ({ hour: parseInt(hour), ...stats }))
    .sort((a, b) => a.pnl - b.pnl);

  const worstHours = hourlyPnl.filter(h => h.pnl < 0 && h.losses > h.wins);
  
  if (worstHours.length > 0) {
    const worst = worstHours[0];
    const tradesInWorst = worst.wins + worst.losses;
    const confidence = Math.min(90, 50 + tradesInWorst * 5);
    
    insights.push({
      id: 'session-worst-hour',
      type: 'warning',
      category: 'session',
      title: `Losses cluster at ${worst.hour}:00`,
      description: `${worst.losses} losing trades vs ${worst.wins} winning trades during hour ${worst.hour}:00. Net loss: ₹${Math.abs(worst.pnl).toFixed(0)}`,
      confidence,
      actionable: true,
      suggestedAction: `Consider adding a time filter to avoid trading between ${worst.hour}:00 and ${worst.hour + 1}:00`,
    });
  }

  // Find best performing hours
  const bestHours = hourlyPnl.filter(h => h.pnl > 0 && h.wins > h.losses).reverse();
  
  if (bestHours.length > 0) {
    const best = bestHours[0];
    const tradesInBest = best.wins + best.losses;
    const confidence = Math.min(85, 50 + tradesInBest * 5);
    
    insights.push({
      id: 'session-best-hour',
      type: 'success',
      category: 'session',
      title: `Strong performance at ${best.hour}:00`,
      description: `${best.wins} winning trades vs ${best.losses} losing trades during hour ${best.hour}:00. Net profit: ₹${best.pnl.toFixed(0)}`,
      confidence,
      actionable: true,
      suggestedAction: `Focus more trading capital during ${best.hour}:00 - ${best.hour + 1}:00`,
    });
  }

  // Day of week analysis
  const dayStats: Record<number, { wins: number; losses: number; pnl: number }> = {};
  for (const trade of trades) {
    const day = new Date(trade.entryTime).getDay();
    if (!dayStats[day]) dayStats[day] = { wins: 0, losses: 0, pnl: 0 };
    if (trade.pnl >= 0) dayStats[day].wins++;
    else dayStats[day].losses++;
    dayStats[day].pnl += trade.pnl;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const worstDay = Object.entries(dayStats)
    .map(([day, stats]) => ({ day: parseInt(day), ...stats }))
    .sort((a, b) => a.pnl - b.pnl)[0];

  if (worstDay && worstDay.pnl < 0 && worstDay.losses > worstDay.wins * 1.5) {
    insights.push({
      id: 'session-worst-day',
      type: 'warning',
      category: 'session',
      title: `${dayNames[worstDay.day]}s underperform`,
      description: `Net loss of ₹${Math.abs(worstDay.pnl).toFixed(0)} on ${dayNames[worstDay.day]}s with ${worstDay.losses} losses vs ${worstDay.wins} wins`,
      confidence: 70,
      actionable: true,
      suggestedAction: `Consider reducing position size or avoiding trades on ${dayNames[worstDay.day]}`,
    });
  }

  return insights;
}

function analyzeDrawdownPatterns(trades: Trade[], metrics?: AnalysisInput['metrics']): InsightResult[] {
  const insights: InsightResult[] = [];

  if (!metrics) return insights;

  // High drawdown warning
  if (metrics.maxDrawdownPercent > 20) {
    insights.push({
      id: 'dd-high',
      type: 'warning',
      category: 'drawdown',
      title: 'High maximum drawdown detected',
      description: `Max drawdown of ${metrics.maxDrawdownPercent.toFixed(1)}% exceeds recommended 20% threshold`,
      confidence: 90,
      actionable: true,
      suggestedAction: 'Reduce position sizing or add a drawdown stop rule (e.g., pause trading after 15% DD)',
    });
  }

  // Analyze consecutive losses
  let maxConsecLosses = 0;
  let currentConsecLosses = 0;
  
  for (const trade of trades) {
    if (trade.pnl < 0) {
      currentConsecLosses++;
      maxConsecLosses = Math.max(maxConsecLosses, currentConsecLosses);
    } else {
      currentConsecLosses = 0;
    }
  }

  if (maxConsecLosses >= 5) {
    insights.push({
      id: 'dd-consec-losses',
      type: 'warning',
      category: 'drawdown',
      title: `${maxConsecLosses} consecutive losses detected`,
      description: `Strategy experienced ${maxConsecLosses} losses in a row. This can cause significant psychological and capital strain.`,
      confidence: 85,
      actionable: true,
      suggestedAction: 'Add a cooldown rule: pause trading for N bars after 4 consecutive losses',
    });
  }

  return insights;
}

function analyzeWinLossPatterns(trades: Trade[]): InsightResult[] {
  const insights: InsightResult[] = [];

  // Analyze trade size consistency
  const pnls = trades.map(t => Math.abs(t.pnl));
  const avgPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const stdPnl = Math.sqrt(pnls.reduce((sum, p) => sum + Math.pow(p - avgPnl, 2), 0) / pnls.length);
  
  if (stdPnl > avgPnl * 2) {
    insights.push({
      id: 'pattern-inconsistent-sizing',
      type: 'warning',
      category: 'sizing',
      title: 'Inconsistent trade sizing detected',
      description: `High variance in trade P&L (σ = ₹${stdPnl.toFixed(0)}, avg = ₹${avgPnl.toFixed(0)}). This suggests inconsistent position sizing.`,
      confidence: 75,
      actionable: true,
      suggestedAction: 'Consider using fixed percentage risk per trade (e.g., 1-2% of account)',
    });
  }

  // Analyze win/loss ratio
  const wins = trades.filter(t => t.pnl >= 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  if (losses.length > wins.length * 1.5 && wins.length > 0) {
    const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length);
    
    if (avgWin > avgLoss * 1.5) {
      insights.push({
        id: 'pattern-low-winrate-high-rr',
        type: 'info',
        category: 'pattern',
        title: 'Low win rate compensated by high R:R',
        description: `Win rate is ${(wins.length / trades.length * 100).toFixed(0)}% but average win (₹${avgWin.toFixed(0)}) is ${(avgWin / avgLoss).toFixed(1)}x average loss`,
        confidence: 80,
        actionable: false,
      });
    } else {
      insights.push({
        id: 'pattern-low-winrate-low-rr',
        type: 'warning',
        category: 'entries',
        title: 'Low win rate with unfavorable R:R',
        description: `Only ${(wins.length / trades.length * 100).toFixed(0)}% win rate with avg win (₹${avgWin.toFixed(0)}) vs avg loss (₹${avgLoss.toFixed(0)})`,
        confidence: 85,
        actionable: true,
        suggestedAction: 'Improve entry criteria or widen profit targets',
      });
    }
  }

  return insights;
}

function analyzeRiskReward(trades: Trade[], metrics?: AnalysisInput['metrics']): InsightResult[] {
  const insights: InsightResult[] = [];

  if (!metrics) return insights;

  // Profit factor analysis
  if (metrics.profitFactor < 1.2 && metrics.profitFactor > 0) {
    insights.push({
      id: 'risk-low-pf',
      type: 'warning',
      category: 'risk',
      title: 'Profit factor is marginal',
      description: `Profit factor of ${metrics.profitFactor.toFixed(2)} leaves little room for slippage and commission changes`,
      confidence: 80,
      actionable: true,
      suggestedAction: 'Target profit factor > 1.5 for robustness. Improve entries or exits.',
    });
  } else if (metrics.profitFactor >= 2.5) {
    insights.push({
      id: 'risk-high-pf',
      type: 'success',
      category: 'risk',
      title: 'Strong profit factor',
      description: `Profit factor of ${metrics.profitFactor.toFixed(2)} indicates robust edge`,
      confidence: 85,
      actionable: false,
    });
  }

  // Sharpe analysis
  if (metrics.sharpeRatio < 0.5) {
    insights.push({
      id: 'risk-low-sharpe',
      type: 'warning',
      category: 'risk',
      title: 'Low risk-adjusted returns',
      description: `Sharpe ratio of ${metrics.sharpeRatio.toFixed(2)} indicates returns may not justify the risk taken`,
      confidence: 75,
      actionable: true,
      suggestedAction: 'Reduce volatility of returns or improve consistency',
    });
  } else if (metrics.sharpeRatio >= 2) {
    insights.push({
      id: 'risk-high-sharpe',
      type: 'success',
      category: 'risk',
      title: 'Excellent risk-adjusted returns',
      description: `Sharpe ratio of ${metrics.sharpeRatio.toFixed(2)} is institutional grade`,
      confidence: 90,
      actionable: false,
    });
  }

  return insights;
}

function analyzeExits(trades: Trade[], metrics?: AnalysisInput['metrics']): InsightResult[] {
  const insights: InsightResult[] = [];

  // Analyze if winners are cut short
  const wins = trades.filter(t => t.pnl >= 0);
  const losses = trades.filter(t => t.pnl < 0);

  if (wins.length > 0 && losses.length > 0) {
    const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length);

    if (avgWin < avgLoss && metrics && metrics.winRate > 50) {
      insights.push({
        id: 'exit-cut-winners',
        type: 'suggestion',
        category: 'exits',
        title: 'Winners cut short vs losers',
        description: `Average win (₹${avgWin.toFixed(0)}) is smaller than average loss (₹${avgLoss.toFixed(0)}) despite ${metrics.winRate.toFixed(0)}% win rate`,
        confidence: 80,
        actionable: true,
        suggestedAction: 'Consider trailing stops or wider profit targets to let winners run',
      });
    }

    // Check for letting losses run
    const bigLosses = losses.filter(t => Math.abs(t.pnl) > avgLoss * 2);
    if (bigLosses.length > losses.length * 0.2) {
      insights.push({
        id: 'exit-big-losses',
        type: 'warning',
        category: 'exits',
        title: 'Too many outsized losses',
        description: `${bigLosses.length} trades (${(bigLosses.length / losses.length * 100).toFixed(0)}% of losses) exceeded 2x average loss`,
        confidence: 85,
        actionable: true,
        suggestedAction: 'Implement strict stop-loss or max loss per trade rule',
      });
    }
  }

  return insights;
}

// Get summary stats
export function getInsightsSummary(insights: InsightResult[]): {
  total: number;
  warnings: number;
  suggestions: number;
  successes: number;
  topCategories: string[];
} {
  const warnings = insights.filter(i => i.type === 'warning').length;
  const suggestions = insights.filter(i => i.type === 'suggestion').length;
  const successes = insights.filter(i => i.type === 'success').length;

  const categoryCounts: Record<string, number> = {};
  for (const insight of insights) {
    categoryCounts[insight.category] = (categoryCounts[insight.category] || 0) + 1;
  }

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  return {
    total: insights.length,
    warnings,
    suggestions,
    successes,
    topCategories,
  };
}
