/**
 * runner-api — Unified edge function for Headless MT5 Runner control plane
 * Routes by "action" field in body or X-Runner-Key for runner endpoints
 * Auth: runner_key header for runner endpoints, JWT for user endpoints
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-runner-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function getUserFromAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

async function getRunnerFromKey(req: Request) {
  const key = req.headers.get("X-Runner-Key");
  if (!key) return null;
  const sb = getServiceClient();
  const { data } = await sb.from("mt5_runners").select("id, user_id, status")
    .eq("runner_key", key).maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = getServiceClient();
  let body: any = {};
  try { body = await req.json(); } catch { /* GET or empty */ }
  const action = body.action || "";

  try {
    // ========== RUNNER ENDPOINTS (auth via X-Runner-Key) ==========

    if (action === "runner_heartbeat") {
      const runner = await getRunnerFromKey(req);
      if (!runner) return json({ error: "Invalid runner key" }, 403);

      await sb.from("mt5_runners").update({
        status: "online",
        last_heartbeat_at: new Date().toISOString(),
        last_seen_version: body.version || null,
      }).eq("id", runner.id);

      await sb.from("runner_heartbeats").insert({
        runner_id: runner.id,
        terminal_id: body.terminal_id || null,
        run_id: body.run_id || null,
        cpu: body.cpu || null,
        ram: body.ram || null,
        disk_free: body.disk_free || null,
        mt5_alive: body.mt5_alive ?? false,
        controller_alive: body.controller_alive ?? false,
        last_tick_at: body.last_tick_at || null,
        payload: body.payload || {},
      });
      return json({ ok: true });
    }

    if (action === "runner_fetch_commands") {
      const runner = await getRunnerFromKey(req);
      if (!runner) return json({ error: "Invalid runner key" }, 403);

      const { data } = await sb.from("runner_commands")
        .select("*")
        .eq("runner_id", runner.id)
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(10);
      return json({ commands: data || [] });
    }

    if (action === "runner_ack_command") {
      const runner = await getRunnerFromKey(req);
      if (!runner) return json({ error: "Invalid runner key" }, 403);

      await sb.from("runner_commands").update({
        status: "acked", updated_at: new Date().toISOString(),
      }).eq("id", body.command_id).eq("runner_id", runner.id);
      return json({ ok: true });
    }

    if (action === "runner_complete_command") {
      const runner = await getRunnerFromKey(req);
      if (!runner) return json({ error: "Invalid runner key" }, 403);

      await sb.from("runner_commands").update({
        status: body.error ? "error" : "done",
        result: body.result || null,
        updated_at: new Date().toISOString(),
      }).eq("id", body.command_id).eq("runner_id", runner.id);

      if (body.run_id) {
        await sb.from("ea_run_events").insert({
          run_id: body.run_id,
          event_type: body.error ? "ERROR" : "COMMAND_DONE",
          payload: { command_id: body.command_id, result: body.result, error: body.error },
        });
        if (body.new_run_status) {
          const update: Record<string, unknown> = { status: body.new_run_status };
          if (body.new_run_status === "running") update.started_at = new Date().toISOString();
          if (body.new_run_status === "stopped" || body.new_run_status === "error") {
            update.stopped_at = new Date().toISOString();
            if (body.error) update.last_error = body.error;
          }
          await sb.from("ea_runs").update(update).eq("id", body.run_id);
        }
      }
      return json({ ok: true });
    }

    // ========== USER ENDPOINTS (auth via JWT) ==========
    const userId = await getUserFromAuth(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    if (action === "start_run") {
      const { connection_id, terminal_id, ea_id, preset_id, symbol, timeframe, slot, mode, risk_limits } = body;
      if (!ea_id || !symbol || !timeframe) return json({ error: "ea_id, symbol, timeframe required" }, 400);

      const { data: ea } = await sb.from("ea_library").select("*")
        .eq("id", ea_id).eq("user_id", userId).maybeSingle();
      if (!ea) return json({ error: "EA not found" }, 404);

      if (ea.allowed_symbols?.length && !ea.allowed_symbols.includes(symbol))
        return json({ error: `Symbol ${symbol} not allowed` }, 400);
      if (ea.allowed_timeframes?.length && !ea.allowed_timeframes.includes(timeframe))
        return json({ error: `Timeframe ${timeframe} not allowed` }, 400);

      const { count } = await sb.from("ea_runs").select("id", { count: "exact", head: true })
        .eq("user_id", userId).in("status", ["queued", "starting", "running"]);
      if ((count || 0) >= 10) return json({ error: "Max 10 concurrent runs" }, 429);

      const { data: run, error: runErr } = await sb.from("ea_runs").insert({
        user_id: userId, connection_id: connection_id || null,
        terminal_id: terminal_id || null, ea_id,
        preset_id: preset_id || null, symbol, timeframe,
        slot: slot || 1, mode: mode || "paper",
        status: "queued", risk_limits: risk_limits || {},
      }).select().single();
      if (runErr) return json({ error: runErr.message }, 500);

      await sb.from("ea_run_events").insert({
        run_id: run.id, event_type: "START_REQUESTED",
        payload: { ea_name: ea.name, symbol, timeframe, mode: mode || "paper" },
      });

      if (terminal_id) {
        const { data: term } = await sb.from("mt5_terminals").select("runner_id")
          .eq("id", terminal_id).maybeSingle();
        if (term) {
          await sb.from("runner_commands").insert({
            runner_id: term.runner_id, terminal_id,
            command_type: "START_RUN",
            payload: { run_id: run.id, ea_id, ea_storage_path: ea.storage_path,
              preset_id: preset_id || null, symbol, timeframe, slot: slot || 1, risk_limits: risk_limits || {} },
          });
        }
      }
      return json({ ok: true, run_id: run.id, status: "queued" });
    }

    if (action === "stop_run") {
      const { run_id, close_positions } = body;
      if (!run_id) return json({ error: "run_id required" }, 400);

      const { data: run } = await sb.from("ea_runs").select("*")
        .eq("id", run_id).eq("user_id", userId).maybeSingle();
      if (!run) return json({ error: "Run not found" }, 404);

      await sb.from("ea_runs").update({ status: "stopping" }).eq("id", run_id);
      await sb.from("ea_run_events").insert({
        run_id, event_type: "STOP_REQUESTED",
        payload: { close_positions: close_positions ?? false },
      });

      if (run.terminal_id) {
        const { data: term } = await sb.from("mt5_terminals").select("runner_id")
          .eq("id", run.terminal_id).maybeSingle();
        if (term) {
          await sb.from("runner_commands").insert({
            runner_id: term.runner_id, terminal_id: run.terminal_id,
            command_type: "STOP_RUN",
            payload: { run_id, close_positions: close_positions ?? false },
          });
        }
      }
      return json({ ok: true });
    }

    if (action === "panic_stop") {
      const { terminal_id: tid, connection_id: cid } = body;
      let query = sb.from("ea_runs").select("id, terminal_id")
        .eq("user_id", userId).in("status", ["queued", "starting", "running"]);
      if (tid) query = query.eq("terminal_id", tid);
      if (cid) query = query.eq("connection_id", cid);

      const { data: runs } = await query;
      if (runs) {
        for (const r of runs) {
          await sb.from("ea_runs").update({ status: "stopping" }).eq("id", r.id);
          await sb.from("ea_run_events").insert({
            run_id: r.id, event_type: "PANIC_STOP",
            payload: { reason: "User triggered panic stop" },
          });
        }
        if (tid) {
          const { data: term } = await sb.from("mt5_terminals").select("runner_id")
            .eq("id", tid).maybeSingle();
          if (term) {
            await sb.from("runner_commands").insert({
              runner_id: term.runner_id, terminal_id: tid,
              command_type: "PANIC_STOP", payload: { close_positions: true },
            });
          }
        }
      }
      return json({ ok: true, runs_affected: runs?.length || 0 });
    }

    if (action === "get_run") {
      const { run_id } = body;
      if (!run_id) return json({ error: "run_id required" }, 400);

      const { data: run } = await sb.from("ea_runs").select("*")
        .eq("id", run_id).eq("user_id", userId).maybeSingle();
      if (!run) return json({ error: "Run not found" }, 404);

      const [eventsRes, hbRes] = await Promise.all([
        sb.from("ea_run_events").select("*").eq("run_id", run_id).order("created_at", { ascending: false }).limit(50),
        sb.from("runner_heartbeats").select("*").eq("run_id", run_id).order("created_at", { ascending: false }).limit(5),
      ]);
      return json({ run, events: eventsRes.data || [], heartbeats: hbRes.data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("runner-api error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
