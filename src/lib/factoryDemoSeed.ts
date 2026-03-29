/**
 * Demo data generator for Strategy Factory
 * Creates 10 strategies + versions + configs + cycle + jobs + results
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEMO_STRATEGIES = [
  { name: 'TrendRider Pro', category: 'trend', tags: ['moving-average', 'momentum'], default_symbol: 'EURUSD', timeframes: ['H1', 'H4'] },
  { name: 'RangeSniper v2', category: 'range', tags: ['mean-reversion', 'bollinger'], default_symbol: 'GBPUSD', timeframes: ['M15', 'H1'] },
  { name: 'Breakout Alpha', category: 'breakout', tags: ['volatility', 'channel'], default_symbol: 'XAUUSD', timeframes: ['H1', 'H4'] },
  { name: 'DefenseMatrix', category: 'defensive', tags: ['hedging', 'grid'], default_symbol: 'USDJPY', timeframes: ['H4', 'D1'] },
  { name: 'ScalpBot Express', category: 'trend', tags: ['scalp', 'tick'], default_symbol: 'EURUSD', timeframes: ['M1', 'M5'] },
  { name: 'SwingMaster Gold', category: 'trend', tags: ['swing', 'support-resistance'], default_symbol: 'XAUUSD', timeframes: ['H4', 'D1'] },
  { name: 'MeanRevert JPY', category: 'range', tags: ['rsi', 'oversold'], default_symbol: 'USDJPY', timeframes: ['H1'] },
  { name: 'VolBreak Cable', category: 'breakout', tags: ['atr', 'session'], default_symbol: 'GBPUSD', timeframes: ['H1', 'H4'] },
  { name: 'GridSafe EURUSD', category: 'defensive', tags: ['grid', 'dca'], default_symbol: 'EURUSD', timeframes: ['H4'] },
  { name: 'Momentum Burst', category: 'trend', tags: ['macd', 'volume'], default_symbol: 'GBPJPY', timeframes: ['H1', 'H4'] },
];

function randomBetween(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }

export async function generateFactoryDemoData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { toast.error('Login required'); return; }

  const uid = user.id;
  toast.loading('Generating demo data...', { id: 'demo-seed' });

  try {
    // 1. Create strategies
    const stratInserts = DEMO_STRATEGIES.map(s => ({
      user_id: uid, name: s.name, category: s.category, tags: s.tags,
      default_symbol: s.default_symbol, timeframes: s.timeframes,
      factory_status: 'active', description: `Auto-generated demo: ${s.name}`,
      code: '// Demo strategy stub', language: 'mql5',
    }));

    const { data: strats, error: sErr } = await supabase.from('strategies').insert(stratInserts).select('id, name');
    if (sErr) throw sErr;

    // 2. Create versions
    const versionInserts = strats!.map(s => ({
      user_id: uid, strategy_id: s.id, version: '1.0.0',
      code: '// v1.0 code',
      artifact_type: 'mt5_ea', artifact_path: `artifacts/${uid}/${s.id}/v1/demo.ex5`,
      sha256: 'demo_' + Math.random().toString(36).slice(2, 10),
    }));

    const { data: versions, error: vErr } = await supabase.from('strategy_versions').insert(versionInserts).select('id, strategy_id');
    if (vErr) throw vErr;

    // 3. Create broker profiles
    const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'GBPJPY'];
    const bpInserts = symbols.map(sym => ({
      user_id: uid, broker_name: 'IC Markets', symbol: sym,
      avg_spread: randomBetween(0.5, 2.5), spread_p95: randomBetween(2, 5),
      commission_per_lot: 3.5, slippage_normal: randomBetween(0.1, 0.5), slippage_worst: randomBetween(0.5, 2),
    }));

    const { data: bps, error: bpErr } = await supabase.from('broker_profiles').insert(bpInserts).select('id, symbol');
    if (bpErr) throw bpErr;

    // 4. Create data profiles
    const { data: dp, error: dpErr } = await supabase.from('data_profiles').insert({
      user_id: uid, name: 'IC Markets Historical', source: 'broker_download',
      notes: 'Full tick data 2020-2025',
    }).select('id').single();
    if (dpErr) throw dpErr;

    // 5. Create backtest configs (per symbol × timeframe)
    const timeframes = ['M15', 'H1', 'H4'];
    const cfgInserts: any[] = [];
    for (const bp of bps!) {
      for (const tf of timeframes) {
        cfgInserts.push({
          user_id: uid, symbol: bp.symbol, timeframe: tf,
          broker_profile_id: bp.id, data_profile_id: dp!.id,
          train_start: '2020-01-01', train_end: '2023-12-31',
          test_start: '2024-01-01', test_end: '2025-06-30',
          slippage_mode: 'normal', commission_mode: 'realistic', spread_mode: 'realistic',
        });
      }
    }

    const { data: configs, error: cfgErr } = await supabase.from('backtest_configs').insert(cfgInserts).select('id, symbol, timeframe');
    if (cfgErr) throw cfgErr;

    // 6. Create a cycle
    const { data: cycle, error: cycErr } = await supabase.from('rotation_cycles').insert({
      user_id: uid, cycle_type: 'monthly', as_of: '2025-12-01', status: 'running',
    }).select('id').single();
    if (cycErr) throw cycErr;

    // 7. Create jobs + mock results (30 jobs: 10 strategies × 3 configs)
    const jobInserts: any[] = [];
    for (const ver of versions!) {
      const strat = DEMO_STRATEGIES.find((_, i) => strats![i].id === ver.strategy_id);
      const matchingConfigs = configs!.filter(c => c.symbol === strat?.default_symbol).slice(0, 3);
      
      for (const cfg of matchingConfigs) {
        jobInserts.push({
          user_id: uid, cycle_id: cycle!.id,
          strategy_version_id: ver.id, backtest_config_id: cfg.id,
          priority: 50, status: 'succeeded',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        });
      }
    }

    const { data: jobs, error: jErr } = await supabase.from('backtest_jobs').insert(jobInserts).select('id, strategy_version_id');
    if (jErr) throw jErr;

    // 8. Insert mock results
    const resultInserts = jobs!.map(j => ({
      user_id: uid, job_id: j.id,
      net_profit: randomBetween(-2000, 15000),
      cagr: randomBetween(-5, 45),
      max_dd_pct: randomBetween(2, 20),
      profit_factor: randomBetween(0.8, 3.5),
      sharpe: randomBetween(-0.5, 3.0),
      sortino: randomBetween(-0.5, 4.0),
      win_rate: randomBetween(35, 75),
      avg_trade: randomBetween(-10, 80),
      trades: Math.round(randomBetween(50, 500)),
      worst_month: randomBetween(-15, -1),
      consistency_score: randomBetween(0.3, 0.95),
      robust_score: 0, // Will be computed by score-cycle
    }));

    const { error: rErr } = await supabase.from('factory_backtest_results').insert(resultInserts);
    if (rErr) throw rErr;

    // 9. Create demo terminal + account
    await supabase.from('factory_terminals').insert({ user_id: uid, name: 'VPS-1 Demo', type: 'mock', status: 'active' });
    await supabase.from('factory_accounts').insert({ user_id: uid, label: 'Demo Account', broker_name: 'IC Markets', account_number: '12345678', status: 'active' });

    toast.success(`Demo data created: ${strats!.length} strategies, ${jobs!.length} jobs, ready to score!`, { id: 'demo-seed' });
    return { cycle_id: cycle!.id };
  } catch (err: any) {
    toast.error(`Seed failed: ${err.message}`, { id: 'demo-seed' });
    throw err;
  }
}
