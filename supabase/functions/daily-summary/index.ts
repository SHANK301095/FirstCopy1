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

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const todayKey = new Date().toISOString().slice(0, 10);

    const { data: todayTrades, error: tradesErr } = await supabase
      .from("trades")
      .select("user_id, pnl, net_pnl, status")
      .gte("entry_time", todayKey + "T00:00:00Z")
      .lte("entry_time", todayKey + "T23:59:59Z")
      .eq("status", "closed");

    if (tradesErr) throw tradesErr;
    if (!todayTrades || todayTrades.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No trades today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMap = new Map<string, { pnl: number; count: number; wins: number }>();
    for (const t of todayTrades) {
      const uid = t.user_id;
      if (!userMap.has(uid)) userMap.set(uid, { pnl: 0, count: 0, wins: 0 });
      const u = userMap.get(uid)!;
      const p = t.net_pnl ?? t.pnl ?? 0;
      u.pnl += p;
      u.count++;
      if (p > 0) u.wins++;
    }

    let created = 0;
    for (const [userId, stats] of userMap) {
      const winRate = stats.count > 0 ? Math.round((stats.wins / stats.count) * 100) : 0;
      const pnlStr = stats.pnl >= 0 ? `+₹${stats.pnl.toLocaleString("en-IN")}` : `-₹${Math.abs(stats.pnl).toLocaleString("en-IN")}`;

      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("alert_id", `daily_summary_${todayKey}`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("notifications").insert({
        user_id: userId,
        alert_id: `daily_summary_${todayKey}`,
        title: "📊 Today's Summary",
        message: `${pnlStr} | ${stats.count} trades | ${winRate}% WR`,
        type: stats.pnl >= 0 ? "success" : "warning",
      });
      created++;
    }

    return new Response(
      JSON.stringify({ ok: true, users: userMap.size, notificationsCreated: created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});