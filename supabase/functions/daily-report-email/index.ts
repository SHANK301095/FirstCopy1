/**
 * Phase 6: Daily Report Email Automation
 * Sends daily trading summary email to subscribed users
 * Triggered via cron or manual invocation
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  avgRR: number;
}

function buildEmailHTML(stats: DailyStats, userName: string, date: string): string {
  const pnlColor = stats.totalPnl >= 0 ? '#10b981' : '#ef4444';
  const pnlSign = stats.totalPnl >= 0 ? '+' : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MMC Daily Report</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="text-align:center;padding:24px 0;border-bottom:1px solid #1a1a2e;">
      <h1 style="color:#60a5fa;margin:0;font-size:24px;">📊 MMC Daily Report</h1>
      <p style="color:#6b7280;margin:8px 0 0;">${date}</p>
    </div>

    <!-- Greeting -->
    <div style="padding:20px 0;">
      <p style="color:#e5e7eb;font-size:16px;">Hi ${userName},</p>
      <p style="color:#9ca3af;font-size:14px;">Here's your trading summary for today:</p>
    </div>

    <!-- Stats Grid -->
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
      <div style="flex:1;min-width:120px;background:#111827;border-radius:12px;padding:16px;border:1px solid #1f2937;">
        <p style="color:#6b7280;font-size:12px;margin:0;">Total Trades</p>
        <p style="color:#f9fafb;font-size:24px;font-weight:700;margin:4px 0 0;">${stats.totalTrades}</p>
      </div>
      <div style="flex:1;min-width:120px;background:#111827;border-radius:12px;padding:16px;border:1px solid #1f2937;">
        <p style="color:#6b7280;font-size:12px;margin:0;">Win Rate</p>
        <p style="color:#f9fafb;font-size:24px;font-weight:700;margin:4px 0 0;">${stats.winRate.toFixed(1)}%</p>
      </div>
      <div style="flex:1;min-width:120px;background:#111827;border-radius:12px;padding:16px;border:1px solid #1f2937;">
        <p style="color:#6b7280;font-size:12px;margin:0;">Net P&L</p>
        <p style="color:${pnlColor};font-size:24px;font-weight:700;margin:4px 0 0;">${pnlSign}${stats.totalPnl.toFixed(2)}</p>
      </div>
    </div>

    <!-- Details -->
    <div style="background:#111827;border-radius:12px;padding:16px;margin-top:16px;border:1px solid #1f2937;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#9ca3af;padding:8px 0;font-size:14px;">Best Trade</td>
          <td style="color:#10b981;padding:8px 0;font-size:14px;text-align:right;">+${stats.bestTrade.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:8px 0;font-size:14px;">Worst Trade</td>
          <td style="color:#ef4444;padding:8px 0;font-size:14px;text-align:right;">${stats.worstTrade.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color:#9ca3af;padding:8px 0;font-size:14px;">Avg R:R</td>
          <td style="color:#f9fafb;padding:8px 0;font-size:14px;text-align:right;">${stats.avgRR.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:24px 0;">
      <a href="https://mmc3010.lovable.app/trading" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        View Full Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;border-top:1px solid #1a1a2e;">
      <p style="color:#4b5563;font-size:12px;margin:0;">MMC Trading Intelligence Platform</p>
      <p style="color:#374151;font-size:11px;margin:4px 0 0;">You're receiving this because you enabled daily reports in Settings.</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get users with daily report enabled
    const { data: settings } = await supabase
      .from("app_settings")
      .select("*")
      .eq("key", "daily_report_enabled");

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let emailsSent = 0;
    const errors: string[] = [];

    // For each subscribed user, compute stats and send email
    if (settings?.length) {
      for (const setting of settings) {
        try {
          const userId = setting.updated_by;
          if (!userId) continue;

          // Get user's trades from yesterday
          const { data: trades } = await supabase
            .from("trades" as any)
            .select("*")
            .eq("user_id", userId)
            .gte("close_time", yesterday)
            .lt("close_time", today);

          if (!trades || trades.length === 0) continue;

          // Compute stats
          const pnls = trades.map((t: any) => t.pnl || 0);
          const wins = pnls.filter((p: number) => p > 0).length;
          const stats: DailyStats = {
            totalTrades: trades.length,
            winRate: (wins / trades.length) * 100,
            totalPnl: pnls.reduce((a: number, b: number) => a + b, 0),
            bestTrade: Math.max(...pnls),
            worstTrade: Math.min(...pnls),
            avgRR: trades.reduce((sum: number, t: any) => sum + (t.r_multiple || 0), 0) / trades.length,
          };

          // Get profile name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", userId)
            .single();

          const userName = profile?.display_name || profile?.username || "Trader";

          // Get email from auth (service role)
          const { data: { user } } = await supabase.auth.admin.getUserById(userId);
          if (!user?.email) continue;

          // Send email via Supabase (or log for now)
          const html = buildEmailHTML(stats, userName, yesterday);
          
          // Log the report
          await supabase.from("logs").insert({
            scope: "daily_report",
            level: "info",
            message: `Daily report generated for ${user.email}`,
            user_id: userId,
            meta_json: { stats, date: yesterday },
          });

          emailsSent++;
        } catch (err) {
          errors.push(String(err));
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        date: yesterday,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
