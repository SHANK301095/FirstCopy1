# MMC Headless MT5 Runner — Agent & Controller Protocol

## Architecture Overview

```
┌──────────────┐     HTTPS/JSON      ┌─────────────────┐
│  MMC Web App  │ ◄──────────────────► │  runner-api EF  │
│  (React UI)   │                     │  (Supabase)     │
└──────────────┘                     └────────┬────────┘
                                              │ DB read/write
                                     ┌────────▼────────┐
                                     │   Supabase DB   │
                                     │ (runner_commands │
                                     │  runner_heartb.) │
                                     └────────┬────────┘
                                              │ poll
                                     ┌────────▼────────┐
                                     │  Runner Agent   │ (Windows VPS)
                                     │  (Python/Go)    │
                                     └────────┬────────┘
                                              │ file queue
                                     ┌────────▼────────┐
                                     │  MT5 Terminal   │
                                     │  Controller EA  │
                                     └─────────────────┘
```

## 1. Runner Agent Authentication

Every runner registers via MMC UI → gets a `runner_key` (UUID).

**All runner→backend requests include:**
```
X-Runner-Key: <runner_key UUID>
Content-Type: application/json
```

## 2. Runner Agent Loop (every 2-5 seconds)

```python
while True:
    # 1. Send heartbeat
    POST /runner-api/runner/heartbeat
    {
        "version": "1.0.0",
        "terminal_id": "uuid-or-null",
        "run_id": "uuid-or-null",
        "cpu": 45.2,
        "ram": 62.1,
        "disk_free": 50.3,
        "mt5_alive": true,
        "controller_alive": true,
        "last_tick_at": "2026-02-24T10:30:00Z",
        "payload": { "extra_metrics": "..." }
    }
    # Response: { "ok": true }

    # 2. Fetch queued commands
    GET /runner-api/runner/commands
    # Response: { "commands": [ { "id": "...", "command_type": "START_RUN", "payload": {...} } ] }

    # 3. For each command:
    #    a) ACK immediately
    POST /runner-api/runner/commands/{cmd_id}/ack
    #    Response: { "ok": true }

    #    b) Execute command (details below)
    #    c) Report completion
    POST /runner-api/runner/commands/{cmd_id}/done
    {
        "run_id": "uuid",
        "new_run_status": "running",  // or "error", "stopped"
        "result": { "chart_id": 12345, "template_applied": true },
        "error": null  // or error string
    }

    sleep(3)
```

## 3. Command Types & Payloads

### START_RUN
```json
{
    "command_type": "START_RUN",
    "payload": {
        "run_id": "uuid",
        "ea_id": "uuid",
        "ea_storage_path": "user_id/ea_name_v1.ex5",
        "preset_id": "uuid-or-null",
        "symbol": "EURUSD",
        "timeframe": "H1",
        "slot": 1,
        "risk_limits": {
            "max_lot": 0.5,
            "max_dd_pct": 5.0,
            "max_positions": 3
        }
    }
}
```

**Runner Agent steps:**
1. Download EA binary from Supabase Storage → `MQL5/Experts/MMC/{ea_name}.ex5`
2. Download preset template (if preset_id) → `Profiles/Templates/{template_name}.tpl`
3. Write command to Controller EA file queue:
   ```json
   // MQL5/Files/mmc_cmd.json
   {
       "cmd": "OPEN_CHART",
       "symbol": "EURUSD",
       "timeframe": "H1",
       "slot": 1
   }
   ```
4. Wait for Controller response in `MQL5/Files/mmc_result.json`
5. Then write:
   ```json
   {
       "cmd": "APPLY_TEMPLATE",
       "slot": 1,
       "template_name": "MMC_TrendRider_v1_A"
   }
   ```
6. Report `new_run_status: "running"` on success

### STOP_RUN
```json
{
    "command_type": "STOP_RUN",
    "payload": {
        "run_id": "uuid",
        "close_positions": false
    }
}
```

**Runner Agent steps:**
1. Write to Controller: `{ "cmd": "CLOSE_CHART", "slot": 1 }`
2. If `close_positions: true`, write: `{ "cmd": "CLOSE_POSITIONS", "symbol": "EURUSD" }`
3. Report `new_run_status: "stopped"`

### PANIC_STOP
```json
{
    "command_type": "PANIC_STOP",
    "payload": { "close_positions": true }
}
```

**Runner Agent steps:**
1. Write to Controller: `{ "cmd": "STOP_ALL", "close_positions": true }`
2. Stop all tracked runs, report each as "stopped"

### RESTART_MT5
```json
{
    "command_type": "RESTART_MT5",
    "payload": { "terminal_id": "uuid" }
}
```

### HEALTH_CHECK
```json
{
    "command_type": "HEALTH_CHECK",
    "payload": {}
}
```

## 4. Controller EA (MQL5) — File Queue Protocol

The Controller EA runs on every MT5 terminal. It reads commands from a local file.

### Command File: `MQL5/Files/mmc_cmd.json`

```json
{
    "cmd": "OPEN_CHART | APPLY_TEMPLATE | CLOSE_CHART | STOP_ALL | PING",
    "symbol": "EURUSD",
    "timeframe": "H1",
    "slot": 1,
    "template_name": "Template_Name",
    "close_positions": false
}
```

### Result File: `MQL5/Files/mmc_result.json`

```json
{
    "cmd": "OPEN_CHART",
    "status": "ok | error",
    "chart_id": 131072,
    "error": null,
    "timestamp": 1740000000
}
```

### Controller EA Pseudocode

```mql5
void OnTimer() // every 1 second
{
    if (!FileExists("mmc_cmd.json")) return;

    string content = ReadFile("mmc_cmd.json");
    DeleteFile("mmc_cmd.json"); // consume

    // Parse JSON
    string cmd = ParseField(content, "cmd");

    if (cmd == "OPEN_CHART") {
        long chart = ChartOpen(symbol, StringToTimeframe(timeframe));
        WriteResult("OPEN_CHART", "ok", chart);
    }
    else if (cmd == "APPLY_TEMPLATE") {
        ChartApplyTemplate(chart_id, template_name);
        WriteResult("APPLY_TEMPLATE", "ok", chart_id);
    }
    else if (cmd == "CLOSE_CHART") {
        ChartClose(chart_id);
        WriteResult("CLOSE_CHART", "ok", 0);
    }
    else if (cmd == "STOP_ALL") {
        // Close all charts except controller's own
        // Optionally close all positions
        WriteResult("STOP_ALL", "ok", 0);
    }
    else if (cmd == "PING") {
        WriteResult("PING", "ok", 0);
    }
}
```

## 5. Trade Mapping to run_id

### Method 1: Magic Number (Preferred)
- Each run gets a unique magic number injected via template inputs
- EA uses this magic for all orders → trades automatically tagged
- Backend maps: `trades WHERE metadata->mt5_magic = run_magic`

### Method 2: Comment Tagging
- Template sets EA comment to `MMC_RUN={run_id_short}`
- Less reliable but works with any EA

### Method 3: Inference (Fallback)
- Match by `symbol + timeframe + terminal + time_window`
- Show ⚠️ warning badge in UI: "Inferred mapping — may be inaccurate"

## 6. Safety Guardrails

### Pre-Start Validation (Backend)
- Max concurrent runs: 10
- Symbol whitelist check
- Timeframe whitelist check
- Risk limits validation (max_lot, max_dd, max_positions)

### Runtime Guardrails (Runner Agent)
- If equity drawdown > threshold → send STOP_RUN
- If spread > configured max → pause EA
- If no tick for > 60s → report degraded

### Crash Loop Protection
- If terminal restarts > 5 times in 10 minutes:
  - Mark terminal status = "error"
  - Stop auto-restart
  - Send alert to user

## 7. Heartbeat Staleness Detection

| Time Since Last Heartbeat | Status      |
|---------------------------|-------------|
| < 30s                     | ● Online    |
| 30s - 60s                 | ◐ Degraded  |
| 60s - 5min                | ○ Stale     |
| > 5min                    | ✕ Offline   |

## 8. Storage Bucket Structure

```
ea-binaries/
  {user_id}/
    MMC_TrendRider_v1.4.2.ex5
    MMC_Scalper_v2.0.ex5

ea-templates/
  {user_id}/
    MMC_TrendRider_v1_Conservative.tpl
    MMC_TrendRider_v1_Aggressive.tpl

controller-binaries/
  {user_id}/
    MMC_Controller_v1.ex5
```

## 9. Database Tables Summary

| Table | Purpose |
|-------|---------|
| mt5_runners | VPS machine registry |
| mt5_terminals | MT5 instances per runner |
| ea_library | Compiled EA binaries metadata |
| ea_presets | EA input configurations (template files) |
| ea_runs | Run instances (state machine) |
| ea_run_events | Event log per run |
| runner_heartbeats | Telemetry data |
| runner_commands | Command queue (queued→acked→done/error) |

## 10. State Machine

```
[queued] → [starting] → [running] → [stopping] → [stopped]
    ↓          ↓           ↓            ↓
  [error]   [error]     [error]      [error]
```

Each transition creates an `ea_run_events` entry.
