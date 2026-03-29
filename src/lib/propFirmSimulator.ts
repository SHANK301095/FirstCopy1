/**
 * Phase 6: Prop Firm Challenge Simulator
 * Simulates prop firm challenge outcomes using backtest results
 */

export interface PropFirmRules {
  firmName: string;
  phase: string;
  initialBalance: number;
  profitTargetPct: number;
  maxDailyDDPct: number;
  maxTotalDDPct: number;
  minTradingDays: number;
  ddMode: 'balance' | 'equity'; // Balance-based vs equity-based DD
  timeLimit?: number; // days
}

export interface SimulationTrade {
  day: number;
  pnl: number;
  runningBalance: number;
  dailyPnl: number;
}

export interface PropSimResult {
  passed: boolean;
  failReason?: string;
  finalBalance: number;
  tradingDays: number;
  maxDailyDD: number;
  maxTotalDD: number;
  profitPct: number;
  dayByDay: { day: number; balance: number; dailyPnl: number; dailyDDPct: number; totalDDPct: number }[];
  passRate?: number; // For Monte Carlo
}

/** Simulate a single prop firm challenge run */
export function simulateChallenge(
  rules: PropFirmRules,
  dailyPnls: number[]
): PropSimResult {
  const { initialBalance, profitTargetPct, maxDailyDDPct, maxTotalDDPct, minTradingDays, ddMode } = rules;
  
  let balance = initialBalance;
  let peakBalance = initialBalance;
  let maxDailyDD = 0;
  let maxTotalDD = 0;
  let failReason: string | undefined;
  const dayByDay: PropSimResult['dayByDay'] = [];

  for (let i = 0; i < dailyPnls.length; i++) {
    const dailyPnl = dailyPnls[i];
    balance += dailyPnl;
    
    // Daily DD check
    const dayStartBalance = balance - dailyPnl;
    const dailyDDPct = dayStartBalance > 0 ? Math.max(0, -dailyPnl / dayStartBalance * 100) : 0;
    maxDailyDD = Math.max(maxDailyDD, dailyDDPct);
    
    // Total DD check
    peakBalance = ddMode === 'equity' ? Math.max(peakBalance, balance) : Math.max(peakBalance, balance);
    const totalDDPct = peakBalance > 0 ? Math.max(0, (peakBalance - balance) / peakBalance * 100) : 0;
    maxTotalDD = Math.max(maxTotalDD, totalDDPct);
    
    dayByDay.push({ day: i + 1, balance, dailyPnl, dailyDDPct, totalDDPct });
    
    // Check violations
    if (dailyDDPct > maxDailyDDPct && !failReason) {
      failReason = `Daily DD limit breached: ${dailyDDPct.toFixed(2)}% > ${maxDailyDDPct}%`;
    }
    if (totalDDPct > maxTotalDDPct && !failReason) {
      failReason = `Total DD limit breached: ${totalDDPct.toFixed(2)}% > ${maxTotalDDPct}%`;
    }
  }

  const profitPct = ((balance - initialBalance) / initialBalance) * 100;
  const tradingDays = dailyPnls.length;
  
  if (!failReason && tradingDays < minTradingDays) {
    failReason = `Minimum trading days not met: ${tradingDays} < ${minTradingDays}`;
  }
  if (!failReason && profitPct < profitTargetPct) {
    failReason = `Profit target not reached: ${profitPct.toFixed(2)}% < ${profitTargetPct}%`;
  }

  return {
    passed: !failReason,
    failReason,
    finalBalance: balance,
    tradingDays,
    maxDailyDD,
    maxTotalDD,
    profitPct,
    dayByDay,
  };
}

/** Monte Carlo prop firm simulation — shuffle daily PnLs N times */
export function monteCarloChallengeSim(
  rules: PropFirmRules,
  dailyPnls: number[],
  simCount: number = 1000
): { passRate: number; results: PropSimResult[] } {
  const results: PropSimResult[] = [];
  let passes = 0;

  for (let s = 0; s < simCount; s++) {
    // Fisher-Yates shuffle
    const shuffled = [...dailyPnls];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const result = simulateChallenge(rules, shuffled);
    if (result.passed) passes++;
    results.push(result);
  }

  return { passRate: (passes / simCount) * 100, results };
}

/** Common prop firm presets */
export const PROP_FIRM_PRESETS: Record<string, PropFirmRules> = {
  'FTMO Phase 1': {
    firmName: 'FTMO', phase: 'Challenge', initialBalance: 100000,
    profitTargetPct: 10, maxDailyDDPct: 5, maxTotalDDPct: 10,
    minTradingDays: 4, ddMode: 'balance', timeLimit: 30,
  },
  'FTMO Phase 2': {
    firmName: 'FTMO', phase: 'Verification', initialBalance: 100000,
    profitTargetPct: 5, maxDailyDDPct: 5, maxTotalDDPct: 10,
    minTradingDays: 4, ddMode: 'balance', timeLimit: 60,
  },
  'MyForexFunds Rapid': {
    firmName: 'MyForexFunds', phase: 'Rapid', initialBalance: 50000,
    profitTargetPct: 8, maxDailyDDPct: 5, maxTotalDDPct: 12,
    minTradingDays: 3, ddMode: 'equity',
  },
  'FundedNext Express': {
    firmName: 'FundedNext', phase: 'Express', initialBalance: 25000,
    profitTargetPct: 25, maxDailyDDPct: 5, maxTotalDDPct: 10,
    minTradingDays: 0, ddMode: 'balance',
  },
};
