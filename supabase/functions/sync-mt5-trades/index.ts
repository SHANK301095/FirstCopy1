/**
 * sync-mt5-trades — Edge function for MT5 EA trade sync
 * Auth: X-MT5-Key header validated against mt5_accounts.sync_key
 * No JWT required — EA sends this key directly.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mt5-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number; // 0=buy, 1=sell
  open_time: number;
  close_time: number;
  open_price: number;
  close_price: number;
  lots: number;
  profit: number;
  commission: number;
  swap: number;
  magic_number?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Validate X-MT5-Key
  const syncKey = req.headers.get("X-MT5-Key");
  if (!syncKey) {
    return json({ error: "Missing X-MT5-Key header" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Look up account by sync_key
  const { data: account, error: accErr } = await supabase
    .from("mt5_accounts")
    .select("id, user_id, account_number, broker_name")
    .eq("sync_key", syncKey)
    .eq("is_active", true)
    .maybeSingle();

  if (accErr || !account) {
    return json({ error: "Invalid or inactive sync key" }, 403);
  }

  // Parse payload
  let payload: {
    account_number: string;
    broker_name: string;
    server_name: string;
    trades: MT5Trade[];
  };

  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(payload.trades)) {
    return json({ error: "trades must be an array" }, 400);
  }

  const tradesReceived = payload.trades.length;
  let tradesNew = 0;
  let tradesSkipped = 0;
  const errors: string[] = [];

  for (const t of payload.trades) {
    if (!t.ticket || !t.symbol) {
      tradesSkipped++;
      continue;
    }

    const direction = t.type === 0 ? "long" : "short";
    const brokerTradeId = `mt5_${account.account_number}_${t.ticket}`;
    const netPnl = (t.profit || 0) - Math.abs(t.commission || 0) + (t.swap || 0);

    const tradeRecord = {
      user_id: account.user_id,
      broker_trade_id: brokerTradeId,
      symbol: t.symbol,
      direction,
      entry_price: t.open_price || 0,
      entry_time: t.open_time
        ? new Date(t.open_time * 1000).toISOString()
        : new Date().toISOString(),
      exit_price: t.close_price || 0,
      exit_time: t.close_time
        ? new Date(t.close_time * 1000).toISOString()
        : new Date().toISOString(),
      quantity: t.lots || 1,
      lot_size: t.lots || 0,
      pnl: t.profit || 0,
      net_pnl: netPnl,
      fees: Math.abs(t.commission || 0),
      status: "closed",
      import_source: "mt5_auto",
      metadata: {
        mt5_ticket: t.ticket,
        mt5_account: account.account_number,
        mt5_swap: t.swap || 0,
        mt5_magic: t.magic_number || 0,
      },
    };

    const { error: upsertErr } = await supabase.from("trades").upsert(
      tradeRecord,
      { onConflict: "user_id,broker_trade_id" },
    );

    if (upsertErr) {
      tradesSkipped++;
      errors.push(`Ticket ${t.ticket}: ${upsertErr.message}`);
    } else {
      tradesNew++;
    }
  }

  // Update mt5_accounts last_sync_at & connection status
  await supabase.from("mt5_accounts").update({
    last_sync_at: new Date().toISOString(),
    connection_status: "connected",
    last_heartbeat_at: new Date().toISOString(),
  }).eq("id", account.id);

  // Log to mt5_sync_log
  await supabase.from("mt5_sync_log").insert({
    account_id: account.id,
    user_id: account.user_id,
    sync_type: "ea_trades",
    status: errors.length > 0 ? "partial" : "success",
    records_synced: tradesReceived,
    records_created: tradesNew,
    error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
    completed_at: new Date().toISOString(),
  });

  return json({
    success: true,
    trades_received: tradesReceived,
    trades_new: tradesNew,
    trades_skipped: tradesSkipped,
  });
});
