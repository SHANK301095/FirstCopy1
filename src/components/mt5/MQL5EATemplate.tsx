/**
 * MQL5 EA WebSocket Template Component
 * Provides downloadable EA code that pushes data to the sync endpoint
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Download, Code2, Zap } from 'lucide-react';
import { toast } from 'sonner';

const generateEACode = (endpoint: string, token: string) => `//+------------------------------------------------------------------+
//| MMC_SyncBridge_EA.mq5 (V3)                                       |
//| MMC Trading Platform — Production-Grade Sync Bridge               |
//| Features: Retry/Backoff, Circuit Breaker, UTC, Delta Mode         |
//+------------------------------------------------------------------+
#property copyright "MMC Trading Platform"
#property version   "3.00"
#property strict
#property description "Full-featured sync bridge: positions, orders, deals, equity, heartbeat"

// ── INPUTS ─────────────────────────────────────────────────────────
input string InpEndpoint       = "${endpoint}";  // MMC Sync API Endpoint
input string InpBearerToken    = "${token}";     // Auth Bearer Token
input int    InpHeartbeatSec   = 10;             // Heartbeat interval (seconds)
input int    InpSyncSec        = 5;              // Position/Order snapshot interval (seconds)
input int    InpSnapshotSec    = 60;             // Equity snapshot interval (seconds)
input int    InpDealSyncSec    = 30;             // Deal history sync interval (seconds)
input int    InpMaxBatch       = 200;            // Max deals per batch
input bool   InpDeltaMode      = true;           // Skip unchanged snapshots
input int    InpFullRefreshN   = 30;             // Force full refresh every N snapshots
input int    InpWebTimeoutMs   = 8000;           // HTTP timeout (ms)
input int    InpRetryMax       = 3;              // Max retries
input int    InpRetryBaseMs    = 500;            // Base retry backoff (ms)
input int    InpCBFailCount    = 10;             // Circuit breaker failure threshold
input int    InpCBCooldownSec  = 120;            // Circuit breaker cooldown (seconds)
input bool   InpDiagnostics    = true;           // Print diagnostic logs

// ── INTERNAL STATE ─────────────────────────────────────────────────
datetime g_lastHeartbeat  = 0;
datetime g_lastSync       = 0;
datetime g_lastSnapshot   = 0;
datetime g_lastDealSync   = 0;
int      g_failStreak     = 0;
datetime g_cbOpenUntil    = 0;
string   g_lastSnapHash   = "";
int      g_snapCounter    = 0;
datetime g_lastDealTimeServer = 0;

// ── JSON ESCAPE ────────────────────────────────────────────────────
string JsonEscape(string s)
{
   StringReplace(s, "\\\\", "\\\\\\\\");
   StringReplace(s, "\\"", "\\\\\\"");
   StringReplace(s, "\\n", "\\\\n");
   StringReplace(s, "\\r", "\\\\r");
   StringReplace(s, "\\t", "\\\\t");
   return s;
}

// ── UTC HELPERS ────────────────────────────────────────────────────
datetime NowUtc() { return TimeGMT(); }
int GmtOffsetSec() { return (int)(TimeCurrent() - TimeGMT()); }
datetime ServerToUtc(datetime t) { return (datetime)(t - GmtOffsetSec()); }

// ── WATERMARK PERSISTENCE ──────────────────────────────────────────
string GVKeyDealTime()
{
   return "MMC_V3_DT_" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
}
void LoadWatermarks()
{
   string k = GVKeyDealTime();
   if(GlobalVariableCheck(k)) g_lastDealTimeServer = (datetime)(long)GlobalVariableGet(k);
   else g_lastDealTimeServer = 0;
}
void SaveWatermarks()
{
   GlobalVariableSet(GVKeyDealTime(), (double)(long)g_lastDealTimeServer);
}

// ── CIRCUIT BREAKER ────────────────────────────────────────────────
bool CircuitBreakerOpen() { return (TimeCurrent() < g_cbOpenUntil); }

void MarkSuccess() { g_failStreak = 0; }

void MarkFailure()
{
   g_failStreak++;
   if(g_failStreak >= InpCBFailCount)
   {
      g_cbOpenUntil = TimeCurrent() + InpCBCooldownSec;
      Print("MMC CircuitBreaker OPEN for ", InpCBCooldownSec, "s");
   }
}

int BackoffMs(int attempt)
{
   int expo = InpRetryBaseMs * (1 << attempt);
   int jitter = (int)MathFloor((double)MathRand() * 250.0 / 32767.0);
   return expo + jitter;
}

// ── HTTP POST WITH RETRY ───────────────────────────────────────────
int HttpPostJson(string body, string &respOut)
{
   char post[], res[];
   string resHdrs;
   string headers = "Content-Type: application/json\\r\\nAuthorization: Bearer " + InpBearerToken + "\\r\\n";
   StringToCharArray(body, post, 0, StringLen(body));

   for(int attempt = 0; attempt <= InpRetryMax; attempt++)
   {
      ResetLastError();
      int code = WebRequest("POST", InpEndpoint, headers, InpWebTimeoutMs, post, res, resHdrs);
      int err = GetLastError();

      if(code == 200)
      {
         respOut = CharArrayToString(res);
         MarkSuccess();
         return code;
      }
      if(attempt < InpRetryMax)
      {
         if(InpDiagnostics) Print("MMC HTTP retry attempt=", attempt, " code=", code, " err=", err);
         Sleep(BackoffMs(attempt));
         continue;
      }
      respOut = CharArrayToString(res);
      MarkFailure();
      if(InpDiagnostics) Print("MMC HTTP FINAL FAIL code=", code, " err=", err);
      return code;
   }
   return -1;
}

// ── FAST HASH FOR DELTA MODE ───────────────────────────────────────
string SimpleHash(string s)
{
   ulong h = 14695981039346656037;
   for(int i = 0; i < StringLen(s); i++)
   {
      h ^= (ulong)StringGetCharacter(s, i);
      h *= 1099511628211;
   }
   return StringFormat("%016llX", h);
}

// ── REGISTER ───────────────────────────────────────────────────────
void RegisterAccount()
{
   string body = "{"
      "\\"action\\":\\"register\\","
      "\\"account_number\\":\\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\\","
      "\\"broker_name\\":\\"" + JsonEscape(AccountInfoString(ACCOUNT_COMPANY)) + "\\","
      "\\"server_name\\":\\"" + JsonEscape(AccountInfoString(ACCOUNT_SERVER)) + "\\","
      "\\"terminal_build\\":\\"" + IntegerToString(TerminalInfoInteger(TERMINAL_BUILD)) + "\\","
      "\\"leverage\\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LEVERAGE)) + ","
      "\\"currency\\":\\"" + JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)) + "\\","
      "\\"timestamp\\":\\"" + TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS) + "\\""
      "}";
   string resp = "";
   int code = HttpPostJson(body, resp);
   if(code == 200) Print("MMC Register: OK");
   else Print("MMC Register: HTTP ", code);
}

// ── HEARTBEAT ──────────────────────────────────────────────────────
void SendHeartbeat()
{
   string body = "{"
      "\\"action\\":\\"heartbeat\\","
      "\\"account_number\\":\\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\\","
      "\\"broker_name\\":\\"" + JsonEscape(AccountInfoString(ACCOUNT_COMPANY)) + "\\","
      "\\"timestamp\\":\\"" + TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS) + "\\""
      "}";
   string resp = "";
   HttpPostJson(body, resp);
}

// ── BUILD POSITIONS JSON ───────────────────────────────────────────
string BuildPositionsJson()
{
   int total = PositionsTotal();
   string s = "[";
   bool first = true;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      string side = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "buy" : "sell";
      double bid = 0, ask = 0;
      SymbolInfoDouble(sym, SYMBOL_BID, bid);
      SymbolInfoDouble(sym, SYMBOL_ASK, ask);
      double curPrice = (side == "buy") ? bid : ask;

      if(!first) s += ",";
      first = false;

      s += "{"
         "\\"ticket\\":" + IntegerToString(ticket) + ","
         "\\"symbol\\":\\"" + JsonEscape(sym) + "\\","
         "\\"type\\":\\"" + side + "\\","
         "\\"volume\\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 5) + ","
         "\\"open_price\\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 8) + ","
         "\\"current_price\\":" + DoubleToString(curPrice, 8) + ","
         "\\"stop_loss\\":" + DoubleToString(PositionGetDouble(POSITION_SL), 8) + ","
         "\\"take_profit\\":" + DoubleToString(PositionGetDouble(POSITION_TP), 8) + ","
         "\\"swap\\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 4) + ","
         "\\"profit\\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 4) + ","
         "\\"commission\\":" + DoubleToString(PositionGetDouble(POSITION_COMMISSION), 4) + ","
         "\\"magic_number\\":" + IntegerToString(PositionGetInteger(POSITION_MAGIC)) + ","
         "\\"comment\\":\\"" + JsonEscape(PositionGetString(POSITION_COMMENT)) + "\\","
         "\\"open_time\\":\\"" + TimeToString(ServerToUtc((datetime)PositionGetInteger(POSITION_TIME)), TIME_DATE|TIME_SECONDS) + "\\""
         "}";
   }
   s += "]";
   return s;
}

// ── BUILD ORDERS JSON ──────────────────────────────────────────────
string BuildOrdersJson()
{
   int total = OrdersTotal();
   string s = "[";
   bool first = true;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0) continue;

      string typeStr = "buy_limit";
      ENUM_ORDER_TYPE ot = (ENUM_ORDER_TYPE)OrderGetInteger(ORDER_TYPE);
      switch(ot)
      {
         case ORDER_TYPE_BUY_LIMIT:       typeStr = "buy_limit"; break;
         case ORDER_TYPE_SELL_LIMIT:      typeStr = "sell_limit"; break;
         case ORDER_TYPE_BUY_STOP:        typeStr = "buy_stop"; break;
         case ORDER_TYPE_SELL_STOP:       typeStr = "sell_stop"; break;
         case ORDER_TYPE_BUY_STOP_LIMIT:  typeStr = "buy_stop_limit"; break;
         case ORDER_TYPE_SELL_STOP_LIMIT: typeStr = "sell_stop_limit"; break;
      }

      if(!first) s += ",";
      first = false;

      s += "{"
         "\\"ticket\\":" + IntegerToString(ticket) + ","
         "\\"symbol\\":\\"" + JsonEscape(OrderGetString(ORDER_SYMBOL)) + "\\","
         "\\"type\\":\\"" + typeStr + "\\","
         "\\"volume\\":" + DoubleToString(OrderGetDouble(ORDER_VOLUME_CURRENT), 5) + ","
         "\\"price\\":" + DoubleToString(OrderGetDouble(ORDER_PRICE_OPEN), 8) + ","
         "\\"stop_loss\\":" + DoubleToString(OrderGetDouble(ORDER_SL), 8) + ","
         "\\"take_profit\\":" + DoubleToString(OrderGetDouble(ORDER_TP), 8) + ","
         "\\"magic_number\\":" + IntegerToString(OrderGetInteger(ORDER_MAGIC)) + ","
         "\\"comment\\":\\"" + JsonEscape(OrderGetString(ORDER_COMMENT)) + "\\","
         "\\"order_time\\":\\"" + TimeToString(ServerToUtc((datetime)OrderGetInteger(ORDER_TIME_SETUP)), TIME_DATE|TIME_SECONDS) + "\\","
         "\\"state\\":\\"placed\\""
         "}";
   }
   s += "]";
   return s;
}

// ── SYNC POSITIONS + ORDERS (with delta mode) ──────────────────────
void SyncPositionsAndOrders()
{
   if(CircuitBreakerOpen()) return;

   string posJson = BuildPositionsJson();
   string ordJson = BuildOrdersJson();

   g_snapCounter++;
   bool forceFull = (g_snapCounter % InpFullRefreshN == 0);
   string snapHash = SimpleHash(posJson + "|" + ordJson);

   if(InpDeltaMode && !forceFull && snapHash == g_lastSnapHash) return;
   g_lastSnapHash = snapHash;

   // Positions
   string acc = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string broker = JsonEscape(AccountInfoString(ACCOUNT_COMPANY));
   string ts = TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS);
   string resp = "";

   string posBody = "{"
      "\\"action\\":\\"sync_positions\\","
      "\\"account_number\\":\\"" + acc + "\\","
      "\\"broker_name\\":\\"" + broker + "\\","
      "\\"timestamp\\":\\"" + ts + "\\","
      "\\"data\\":{\\"positions\\":" + posJson + "}"
      "}";
   HttpPostJson(posBody, resp);

   // Orders
   string ordBody = "{"
      "\\"action\\":\\"sync_orders\\","
      "\\"account_number\\":\\"" + acc + "\\","
      "\\"broker_name\\":\\"" + broker + "\\","
      "\\"timestamp\\":\\"" + ts + "\\","
      "\\"data\\":{\\"orders\\":" + ordJson + "}"
      "}";
   HttpPostJson(ordBody, resp);
}

// ── EQUITY SNAPSHOT ────────────────────────────────────────────────
void SyncEquitySnapshot()
{
   if(CircuitBreakerOpen()) return;

   string body = "{"
      "\\"action\\":\\"sync_snapshot\\","
      "\\"account_number\\":\\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\\","
      "\\"broker_name\\":\\"" + JsonEscape(AccountInfoString(ACCOUNT_COMPANY)) + "\\","
      "\\"timestamp\\":\\"" + TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS) + "\\","
      "\\"data\\":{"
         "\\"balance\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 4) + ","
         "\\"equity\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 4) + ","
         "\\"margin\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 4) + ","
         "\\"free_margin\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 4) + ","
         "\\"margin_level\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ","
         "\\"floating_pl\\":" + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT), 4) + ","
         "\\"positions_count\\":" + IntegerToString(PositionsTotal()) + ","
         "\\"orders_count\\":" + IntegerToString(OrdersTotal())
      "}}"
      ;
   string resp = "";
   HttpPostJson(body, resp);
}

// ── DEAL HISTORY SYNC (watermark-based, only DEAL_ENTRY_OUT) ───────
void SyncDeals()
{
   if(CircuitBreakerOpen()) return;

   datetime nowServer = TimeCurrent();
   datetime fromServer = (g_lastDealTimeServer > 120) ? g_lastDealTimeServer - 120 : 0;
   if(!HistorySelect(fromServer, nowServer)) return;

   string deals = "[";
   bool first = true;
   int sent = 0;
   datetime maxSeen = g_lastDealTimeServer;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      if(sent >= InpMaxBatch) break;
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0) continue;

      long dtype = (long)HistoryDealGetInteger(deal, DEAL_TYPE);
      if(dtype != DEAL_TYPE_BUY && dtype != DEAL_TYPE_SELL) continue;

      long entry = (long)HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT) continue;

      datetime tServer = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
      if(tServer < fromServer) continue;
      if(tServer > maxSeen) maxSeen = tServer;

      if(!first) deals += ",";
      first = false;
      sent++;

      deals += "{"
         "\\"ticket\\":" + IntegerToString(deal) + ","
         "\\"symbol\\":\\"" + JsonEscape(HistoryDealGetString(deal, DEAL_SYMBOL)) + "\\","
         "\\"type\\":\\"" + (dtype == DEAL_TYPE_BUY ? "buy" : "sell") + "\\","
         "\\"entry\\":\\"out\\","
         "\\"volume\\":" + DoubleToString(HistoryDealGetDouble(deal, DEAL_VOLUME), 5) + ","
         "\\"price\\":" + DoubleToString(HistoryDealGetDouble(deal, DEAL_PRICE), 8) + ","
         "\\"profit\\":" + DoubleToString(HistoryDealGetDouble(deal, DEAL_PROFIT), 4) + ","
         "\\"commission\\":" + DoubleToString(HistoryDealGetDouble(deal, DEAL_COMMISSION), 4) + ","
         "\\"swap\\":" + DoubleToString(HistoryDealGetDouble(deal, DEAL_SWAP), 4) + ","
         "\\"fee\\":" + DoubleToString(HistoryDealGetDouble(deal, DEAL_FEE), 4) + ","
         "\\"magic_number\\":" + IntegerToString(HistoryDealGetInteger(deal, DEAL_MAGIC)) + ","
         "\\"comment\\":\\"" + JsonEscape(HistoryDealGetString(deal, DEAL_COMMENT)) + "\\","
         "\\"position_ticket\\":" + IntegerToString(HistoryDealGetInteger(deal, DEAL_POSITION_ID)) + ","
         "\\"time\\":\\"" + TimeToString(ServerToUtc(tServer), TIME_DATE|TIME_SECONDS) + "\\""
         "}";
   }
   deals += "]";

   if(sent == 0) return;

   string body = "{"
      "\\"action\\":\\"sync_deals\\","
      "\\"account_number\\":\\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\\","
      "\\"broker_name\\":\\"" + JsonEscape(AccountInfoString(ACCOUNT_COMPANY)) + "\\","
      "\\"timestamp\\":\\"" + TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS) + "\\","
      "\\"data\\":{\\"deals\\":" + deals + "}"
      "}";

   string resp = "";
   int code = HttpPostJson(body, resp);
   if(code == 200)
   {
      g_lastDealTimeServer = maxSeen;
      SaveWatermarks();
      if(InpDiagnostics) Print("MMC Deals synced: ", sent);
   }
}

// ── INIT / DEINIT / TIMER ──────────────────────────────────────────
int OnInit()
{
   MathSrand((int)TimeLocal());
   LoadWatermarks();

   Print("MMC SyncBridge V3 started — Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
   Print("Endpoint: ", InpEndpoint);
   Print("NOTE: Add endpoint URL to MT5 WebRequest allowlist (Tools > Options > Expert Advisors)");

   EventSetMillisecondTimer(1000);

   RegisterAccount();
   SendHeartbeat();
   SyncPositionsAndOrders();
   SyncEquitySnapshot();
   SyncDeals();

   g_lastHeartbeat = TimeCurrent();
   g_lastSync      = TimeCurrent();
   g_lastSnapshot  = TimeCurrent();
   g_lastDealSync  = TimeCurrent();

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("MMC SyncBridge V3 removed. Reason: ", reason);
}

void OnTimer()
{
   // Heartbeat always runs
   if(TimeCurrent() - g_lastHeartbeat >= InpHeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = TimeCurrent();
   }

   if(CircuitBreakerOpen()) return;

   // Position + Order sync
   if(TimeCurrent() - g_lastSync >= InpSyncSec)
   {
      SyncPositionsAndOrders();
      g_lastSync = TimeCurrent();
   }

   // Equity snapshot
   if(TimeCurrent() - g_lastSnapshot >= InpSnapshotSec)
   {
      SyncEquitySnapshot();
      g_lastSnapshot = TimeCurrent();
   }

   // Deal history
   if(TimeCurrent() - g_lastDealSync >= InpDealSyncSec)
   {
      SyncDeals();
      g_lastDealSync = TimeCurrent();
   }
}

void OnTick()
{
   // Handled by timer for efficiency
}
//+------------------------------------------------------------------+`;

export function MQL5EATemplate() {
  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project-id';
  const defaultEndpoint = `https://${projectId}.supabase.co/functions/v1/mt5-sync`;

  const code = generateEACode(endpoint || defaultEndpoint, token || 'YOUR_AUTH_TOKEN');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('MQL5 EA code copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMC_SyncBridge_EA.mq5';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('EA file downloaded — place in MT5 Experts folder');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            MQL5 Sync Bridge EA
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Auto-Generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Sync API Endpoint</Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={defaultEndpoint}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bearer Token (from login)</Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Your auth token"
              type="password"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <ScrollArea className="h-[300px] rounded-lg border border-border/50 bg-muted/20">
          <pre className="p-4 text-[10px] font-mono text-foreground/70 whitespace-pre">
            {code.substring(0, 2000)}...
          </pre>
        </ScrollArea>

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm" className="gap-1.5">
            <Copy className="h-3 w-3" />
            Copy Full Code
          </Button>
          <Button onClick={handleDownload} size="sm" className="gap-1.5">
            <Download className="h-3 w-3" />
            Download .mq5
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-lg p-3">
          <p className="font-medium text-foreground/80">Setup Steps:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Download the .mq5 file above</li>
            <li>Place in: MT5 → File → Open Data Folder → MQL5/Experts/</li>
            <li>Compile in MetaEditor (F7)</li>
            <li>Add EA to any chart → enable "Allow WebRequest" in Tools → Options → Expert Advisors</li>
            <li>Add your sync endpoint URL to the allowed URLs list</li>
            <li>EA will auto-sync positions, orders, deals, and equity every few seconds</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

export default MQL5EATemplate;
