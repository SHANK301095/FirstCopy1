import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  Deno.env.get("SUPABASE_URL") || '',
  'https://mmc3010.lovable.app',
  'https://id-preview--9585abe7-4b28-4e9d-87d4-d095da7c3d10.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Constants
const SYMBOL_OPTIONS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "GBPJPY",
  "EURJPY",
  "AUDJPY",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "EURAUD",
  "EURCAD",
  "EURCHF",
  "EURGBP",
  "EURNZD",
  "GBPAUD",
  "GBPCAD",
  "GBPCHF",
  "GBPNZD",
  "AUDCAD",
  "AUDCHF",
  "AUDNZD",
  "CADCHF",
  "NZDCAD",
  "NZDCHF",
  "XAUUSD",
  "XAGUSD",
  "BTCUSD",
  "ETHUSD",
  "LTCUSD",
  "BNBUSD",
  "XRPUSD",
  "ADAUSD",
  "DOGEUSD",
  "SOLUSD",
  "DOTUSD",
  "MATICUSD",
  "LINKUSD",
  "AVAXUSD",
  "UNIUSD",
  "TRXUSD",
  "XLMUSD",
  "XMRUSD",
  "EOSUSD",
  "ZECUSD",
  "DASHUSD",
  "XTZUSD",
  "BCHUSD",
  "ETCUSD",
  "FILUSD",
  "ICPUSD",
  "WAVESUSD",
  "MKRUSD",
  "COMPUSD",
  "AAVEUSD",
  "SNXUSD",
  "YFIUSD",
  "CRVUSD",
  "SUSHIUSD",
  "BALUSD",
  "UMAUSD",
  "RENUSD",
  "KNCUSD",
  "ZRXUSD",
  "BATUSD",
  "OMGUSD",
  "SNTUSD",
  "ANTUSD",
  "CVCUSD",
  "DNTUSD",
  "MANAUSD",
  "SANDUSD",
  "ENJUSD",
  "CHZUSD",
  "GALAUSD",
  "APEUSD",
  "GMTUSD",
  "STEPNUSD",
  "LOOKSUSD",
  "SOSUSD",
  "ENSUSD",
  "BITUSD",
  "SHIBUSD",
  "ELONUSD",
  "SAMOUSD",
  "OXYUSD",
  "ATLASUSD",
  "POLISUSD",
  "STARLUSD",
  "DFLUSD",
  "GSTUSD",
  "BNXUSD",
  "WOOUSDT",
  "DYDXUSDT",
  "MASKUSDT",
  "RNDRUSDT",
  "ALICEUSDT",
  "REEFUSDT",
  "NEARUSDT",
  "IOTAUSDT",
  "HBARUSDT",
  "EGLDUSDT",
  "FLOWUSDT",
  "THETAUSDT",
  "AXSUSDT",
  "CHRUSDT",
  "FTMUSDT",
  "ONEUSDT",
  "ONTUSDT",
  "QTUMUSDT",
  "IOSTUSDT",
  "VETUSDT",
  "NEOUSDT",
  "ONTUSDT",
  "ICXUSDT",
  "NIFTY50",
  "BANKNIFTY",
];
const SYMBOLS = ['EURUSD', 'GBPJPY', 'NIFTY50', 'BANKNIFTY', 'USDJPY', 'AUDUSD', 'XAUUSD', 'BTCUSD'];
const STRATEGIES = ['Breakout', 'Pullback', 'Trend Following', 'Mean Reversion', 'Scalp', 'Swing'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend Following', 'Range', 'Scalp'];
const SESSIONS = ['asia', 'europe', 'us', 'overlap'];
const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'];
const EMOTIONS_LIST = ['Confident', 'Anxious', 'FOMO', 'Greedy', 'Patient', 'Frustrated', 'Calm', 'Disciplined'];

function randomChoice<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomFloat(min: number, max: number): number { return Math.random() * (max - min) + min; }
function randomInt(min: number, max: number): number { return Math.floor(randomFloat(min, max)); }
function randomSubset<T>(arr: T[], max: number): T[] {
  const n = randomInt(0, max + 1);
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const trades = [];
    const now = Date.now();
    
    for (let i = 0; i < 120; i++) {
      const daysAgo = randomInt(1, 90);
      const hourOffset = randomInt(0, 23);
      const entryTime = new Date(now - daysAgo * 86400000 + hourOffset * 3600000);
      const exitTime = new Date(entryTime.getTime() + randomInt(5, 480) * 60000);
      const symbol = randomChoice(SYMBOLS);
      const direction = Math.random() > 0.45 ? 'long' : 'short';
      
      let basePrice: number;
      switch (symbol) {
        case 'NIFTY50': basePrice = randomFloat(22000, 24000); break;
        case 'BANKNIFTY': basePrice = randomFloat(48000, 52000); break;
        case 'XAUUSD': basePrice = randomFloat(1900, 2100); break;
        case 'BTCUSD': basePrice = randomFloat(38000, 65000); break;
        default: basePrice = randomFloat(1.0, 1.5);
      }

      const entryPrice = parseFloat(basePrice.toFixed(symbol.includes('USD') && !symbol.includes('XAU') && !symbol.includes('BTC') ? 5 : 2));
      const pipSize = symbol.includes('JPY') ? 0.01 : symbol.includes('NIFTY') ? 1 : symbol.includes('XAU') ? 0.1 : symbol.includes('BTC') ? 10 : 0.0001;
      const moveRange = randomFloat(-80, 120) * pipSize;
      const exitPrice = parseFloat((entryPrice + (direction === 'long' ? moveRange : -moveRange)).toFixed(symbol.includes('USD') && !symbol.includes('XAU') && !symbol.includes('BTC') ? 5 : 2));
      const quantity = symbol.includes('NIFTY') ? randomChoice([25, 50, 75]) : randomFloat(0.1, 5);
      const pnl = direction === 'long' ? (exitPrice - entryPrice) * quantity : (entryPrice - exitPrice) * quantity;
      const fees = Math.abs(pnl) * randomFloat(0.001, 0.01);
      const sl = direction === 'long' ? entryPrice - randomFloat(10, 50) * pipSize : entryPrice + randomFloat(10, 50) * pipSize;
      const tp = direction === 'long' ? entryPrice + randomFloat(20, 100) * pipSize : entryPrice - randomFloat(20, 100) * pipSize;
      const riskPerUnit = Math.abs(entryPrice - sl);
      const rMultiple = riskPerUnit > 0 ? (direction === 'long' ? (exitPrice - entryPrice) : (entryPrice - exitPrice)) / riskPerUnit : null;

      trades.push({
        user_id: user.id, symbol, direction, entry_price: entryPrice, exit_price: exitPrice,
        quantity: parseFloat(quantity.toFixed(2)), entry_time: entryTime.toISOString(),
        exit_time: exitTime.toISOString(), status: 'closed', pnl: parseFloat(pnl.toFixed(2)),
        fees: parseFloat(fees.toFixed(2)), stop_loss: parseFloat(sl.toFixed(5)),
        take_profit: parseFloat(tp.toFixed(5)),
        r_multiple: rMultiple ? parseFloat(rMultiple.toFixed(2)) : null,
        risk_reward: rMultiple && rMultiple > 0 ? parseFloat((Math.abs(tp - entryPrice) / Math.abs(sl - entryPrice)).toFixed(2)) : null,
        strategy_tag: randomChoice(STRATEGIES), session_tag: randomChoice(SESSIONS),
        timeframe: randomChoice(TIMEFRAMES), setup_type: randomChoice(SETUPS),
        mindset_rating: randomInt(1, 6), quality_score: randomInt(1, 6),
        emotions: randomSubset(EMOTIONS_LIST, 3),
        tags: randomSubset(['trend-day', 'earnings', 'gap-up', 'high-vol', 'range-bound', 'news'], 2),
        import_source: 'csv', notes: null,
      });
    }

    for (let i = 0; i < trades.length; i += 50) {
      const batch = trades.slice(i, i + 50);
      const { error } = await supabase.from('trades').insert(batch);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ success: true, count: trades.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
