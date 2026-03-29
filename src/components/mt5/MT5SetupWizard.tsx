/**
 * MT5 Setup Wizard — Step-by-step guided connection flow
 * Uses sync_key (UUID) for EA auth via X-MT5-Key header
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle, Circle, Loader2, Copy, Download, Wifi, WifiOff,
  ArrowRight, ArrowLeft, Shield, Zap, Server, Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BROKERS = [
  'Exness', 'IC Markets', 'XM', 'FBS', 'Pepperstone', 'Alpari',
  'RoboForex', 'FXTM', 'OctaFX', 'Tickmill', 'HFM', 'TMGM',
  'Zerodha', 'Angel One', 'Upstox', 'Other',
];

interface WizardProps {
  onComplete?: () => void;
}

export function MT5SetupWizard({ onComplete }: WizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [accountNumber, setAccountNumber] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [customBroker, setCustomBroker] = useState('');
  const [serverName, setServerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAccountId, setSavedAccountId] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project-id';
  const syncEndpoint = `https://${projectId}.supabase.co/functions/v1/mt5-sync`;

  const effectiveBroker = brokerName === 'Other' ? customBroker : brokerName;

  const handleStep1Save = async () => {
    if (!accountNumber || !effectiveBroker) {
      toast.error('Account number and broker name required');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      // Generate sync_key as UUID
      const generatedKey = crypto.randomUUID();

      const { data, error } = await supabase.from('mt5_accounts').upsert({
        user_id: user.id,
        account_number: accountNumber,
        broker_name: effectiveBroker,
        server_name: serverName || null,
        sync_key: generatedKey,
        connection_status: 'disconnected',
        is_active: true,
      }, { onConflict: 'user_id,account_number,broker_name' }).select().single();

      if (error) throw error;
      setSavedAccountId(data.id);
      setSyncKey(data.sync_key || generatedKey);

      // Auto-create risk config
      await supabase.from('mt5_risk_config').upsert({
        user_id: user.id,
        account_id: data.id,
        scope: 'account',
      }, { onConflict: 'user_id,account_id,scope' });

      toast.success('Account saved! Sync key generated.');
      setStep(2);
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const [verifyStatus, setVerifyStatus] = useState<'none' | 'connected' | 'stale' | 'disconnected'>('none');
  const [verifyDetails, setVerifyDetails] = useState('');

  const handleVerify = async () => {
    if (!savedAccountId) return;
    setVerifying(true);
    setVerified(null);
    setVerifyStatus('none');
    setVerifyDetails('');
    try {
      const { data } = await supabase.from('mt5_accounts')
        .select('connection_status, last_heartbeat_at, last_sync_at')
        .eq('id', savedAccountId)
        .single();

      if (data?.last_heartbeat_at) {
        const hbDiff = Date.now() - new Date(data.last_heartbeat_at).getTime();
        const TEN_MINUTES = 10 * 60 * 1000;

        if (hbDiff < TEN_MINUTES) {
          setVerified(true);
          setVerifyStatus('connected');
          let detail = '✅ Connected! EA is running and syncing.';
          if (data.last_sync_at) {
            const syncDiff = Date.now() - new Date(data.last_sync_at).getTime();
            const syncAgo = syncDiff < 60000 ? `${Math.floor(syncDiff / 1000)}s ago` : `${Math.floor(syncDiff / 60000)} minutes ago`;
            detail += ` Last synced: ${syncAgo}`;
          }
          setVerifyDetails(detail);
        } else {
          setVerified(false);
          setVerifyStatus('stale');
          setVerifyDetails("⚠️ EA installed but not sending data. Make sure it's attached to an active chart.");
        }
      } else {
        setVerified(false);
        setVerifyStatus('disconnected');
        setVerifyDetails('❌ Not connected yet. Follow the steps above to install and run the EA.');
      }
    } catch {
      setVerified(false);
      setVerifyStatus('disconnected');
      setVerifyDetails('❌ Not connected yet. Follow the steps above.');
    } finally {
      setVerifying(false);
    }
  };

  const eaCode = generateEACode(syncEndpoint, syncKey, effectiveBroker);

  const handleCopyEACode = () => {
    navigator.clipboard.writeText(eaCode);
    toast.success('EA code copied! Now paste in MetaEditor');
  };

  const handleCopySyncKey = () => {
    navigator.clipboard.writeText(syncKey);
    toast.success('Sync key copied to clipboard');
  };

  const handleDownloadEA = () => {
    const blob = new Blob([eaCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMC_AutoSync.mq5';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('EA file downloaded with your sync key pre-configured');
  };

  const steps = [
    { num: 1, label: 'Account Details' },
    { num: 2, label: 'Install EA' },
    { num: 3, label: 'Verify Connection' },
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              step > s.num && 'bg-chart-2/20 text-chart-2',
              step === s.num && 'bg-primary/20 text-primary ring-1 ring-primary/30',
              step < s.num && 'bg-muted text-muted-foreground',
            )}>
              {step > s.num ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={cn('w-8 h-px', step > s.num ? 'bg-chart-2' : 'bg-border')} />}
          </div>
        ))}
      </div>

      {/* Step 1: Account Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              MT5 Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MT5 Account Number *</Label>
                <Input
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Find this in MT5 → Navigator → Accounts</p>
              </div>
              <div className="space-y-2">
                <Label>Broker *</Label>
                <Select value={brokerName} onValueChange={setBrokerName}>
                  <SelectTrigger><SelectValue placeholder="Select your broker" /></SelectTrigger>
                  <SelectContent>
                    {BROKERS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                {brokerName === 'Other' && (
                  <Input
                    value={customBroker}
                    onChange={e => setCustomBroker(e.target.value)}
                    placeholder="Enter broker name"
                    className="mt-2"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Server Name (optional)</Label>
              <Input
                value={serverName}
                onChange={e => setServerName(e.target.value)}
                placeholder="e.g. Exness-Real3"
              />
              <p className="text-xs text-muted-foreground">Shown at the bottom of your MT5 terminal window</p>
            </div>
            <Button onClick={handleStep1Save} disabled={saving || !accountNumber || !effectiveBroker} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
              Generate My Sync Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Download & Install EA */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Install the EA Bridge on MT5
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              The EA runs silently in MT5 and pushes closed trades to MMC every 5 minutes.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Sync Key Display */}
            <div className="bg-chart-2/5 rounded-lg p-4 border border-chart-2/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-chart-2 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" /> Your Sync Key
                </span>
                <Button variant="outline" size="sm" onClick={handleCopySyncKey} className="h-6 text-[10px]">
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              <code className="text-sm font-mono text-foreground break-all select-all">{syncKey}</code>
              <p className="text-[10px] text-muted-foreground mt-2">
                ⚠️ Keep this key private. It authenticates your EA with MMC.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Follow these steps in MT5:</p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">1</Badge>
                  Open MT5 → Tools → MetaEditor (or press F4)
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">2</Badge>
                  File → New → Expert Advisor → Name it <code className="text-xs font-mono bg-muted px-1 rounded">MMC_AutoSync</code>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">3</Badge>
                  Delete all code, paste the EA code below → Press F7 to compile
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">4</Badge>
                  Go back to MT5 → Drag "MMC_AutoSync" from Navigator onto any chart
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">5</Badge>
                  In EA settings: Enable "Allow WebRequests" in Tools → Options → Expert Advisors
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">6</Badge>
                  Add this URL to allowed list: <code className="text-xs font-mono bg-muted px-1 rounded break-all">{syncEndpoint}</code>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 w-5 flex items-center justify-center text-[10px] shrink-0">7</Badge>
                  Click OK — EA will start syncing automatically!
                </li>
              </ol>
            </div>

            {/* EA Code Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">EA Code (ready to use — all values pre-filled ✅)</span>
              </div>
              <ScrollArea className="h-48 rounded-lg border bg-muted/20">
                <pre className="p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">{eaCode}</pre>
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownloadEA} className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Download .mq5 File
              </Button>
              <Button variant="outline" onClick={handleCopyEACode}>
                <Copy className="h-4 w-4 mr-2" /> Copy Code
              </Button>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Verify <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Verify Connection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verify Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center space-y-4 py-4">
              {verified === null && !verifying && (
                <>
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Wifi className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Make sure the EA is running on MT5, then click verify below.
                  </p>
                </>
              )}
              {verifying && (
                <>
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground">Checking connection...</p>
                </>
              )}
              {verified === true && (
                <>
                  <div className="h-16 w-16 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-chart-2" />
                  </div>
                  <p className="text-sm font-medium text-chart-2">{verifyDetails}</p>
                </>
              )}
              {verified === false && verifyStatus === 'stale' && (
                <>
                  <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
                    <Wifi className="h-8 w-8 text-warning" />
                  </div>
                  <p className="text-sm text-warning">{verifyDetails}</p>
                </>
              )}
              {verified === false && verifyStatus !== 'stale' && (
                <>
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <WifiOff className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-sm text-destructive">{verifyDetails || 'Not connected yet.'}</p>
                  <p className="text-xs text-muted-foreground">
                    Ensure EA is attached to a chart, WebRequest is allowed, and the sync URL is in the allowed list.
                  </p>
                </>
              )}
            </div>

            <Button onClick={handleVerify} disabled={verifying} className="w-full" variant={verified ? 'outline' : 'default'}>
              {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
              {verified ? 'Re-check' : 'Test Connection'}
            </Button>

            {verified && (
              <Button className="w-full" onClick={onComplete}>
                <CheckCircle className="h-4 w-4 mr-2" /> Done — Go to Dashboard
              </Button>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {!verified && (
                <Button variant="ghost" size="sm" onClick={onComplete}>
                  Skip for now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * EA code that the user pastes into MetaEditor.
 * All values pre-filled — zero manual editing required.
 * V3: Retry/backoff, circuit breaker, UTC, delta mode, watermark persistence
 */
function generateEACode(endpoint: string, syncKey: string, brokerName: string): string {
  return `//+------------------------------------------------------------------+
//| MMC AutoSync EA v3.0                                              |
//| Complete Sync: Heartbeat + Positions + Orders + Deals + Snapshot  |
//| Reliability: Retry/Backoff + Circuit Breaker + UTC + Delta Mode   |
//+------------------------------------------------------------------+
#property copyright "MMC Trading Platform"
#property version   "3.00"
#property strict
#property description "Production-grade sync bridge between MT5 and MMC"

// ── INPUTS (Pre-filled — NO editing required) ──────────────────────
input string SyncApiUrl      = "${endpoint}";                 // MMC Sync API URL (all actions)
input string SyncKey         = "${syncKey || 'REPLACE_WITH_YOUR_SYNC_KEY_HERE'}";  // Your Sync Key
input string BrokerName      = "${brokerName || 'YOUR_BROKER'}";  // Broker Name
input int    HeartbeatSec    = 10;    // Heartbeat interval (seconds)
input int    SnapshotSec     = 5;     // Position/Order snapshot interval (seconds)
input int    DealSyncSec     = 30;    // Closed deal sync interval (seconds)
input int    EquitySnapSec   = 60;    // Equity snapshot interval (seconds)
input int    MaxBatchSize    = 200;   // Max deals per batch
input bool   DeltaMode       = true;  // Skip snapshot if unchanged
input int    FullRefreshEveryN = 30;  // Force full refresh every N snapshots
input int    WebTimeoutMs    = 8000;  // HTTP timeout
input int    RetryMax        = 3;     // Max retries per request
input int    RetryBaseMs     = 500;   // Base retry backoff (ms)
input int    CBFailCount     = 10;    // Circuit breaker failure threshold
input int    CBCooldownSec   = 120;   // Circuit breaker cooldown (seconds)
input bool   SendDiagnostics = true;  // Print diagnostic logs

// ── INTERNAL STATE ─────────────────────────────────────────────────
datetime g_lastHeartbeat  = 0;
datetime g_lastSnapshot   = 0;
datetime g_lastDealSync   = 0;
datetime g_lastEquitySnap = 0;
int      g_failStreak     = 0;
datetime g_cbOpenUntil    = 0;
string   g_lastSnapHash   = "";
int      g_snapCounter    = 0;
datetime g_lastDealTimeServer = 0;  // watermark for deal history

// ── UTIL: JSON ESCAPE ──────────────────────────────────────────────
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

// ── WATERMARK PERSISTENCE (GlobalVariables survive restarts) ──────
string GVKeyDealTime()
{
   return "MMC_V3_DEAL_WM_" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
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
   if(g_failStreak >= CBFailCount)
   {
      g_cbOpenUntil = TimeCurrent() + CBCooldownSec;
      Print("MMC CircuitBreaker OPEN for ", CBCooldownSec, "s after ", g_failStreak, " failures");
   }
}

int BackoffMs(int attempt)
{
   int expo = RetryBaseMs * (1 << attempt);
   int jitter = (int)MathFloor((double)MathRand() * 250.0 / 32767.0);
   return expo + jitter;
}

// ── HTTP POST WITH RETRY ───────────────────────────────────────────
int HttpPostJson(string url, string body, string hdrs, string &respOut)
{
   char post[], res[];
   string resHdrs;
   StringToCharArray(body, post, 0, StringLen(body));

   for(int attempt = 0; attempt <= RetryMax; attempt++)
   {
      ResetLastError();
      int code = WebRequest("POST", url, hdrs, WebTimeoutMs, post, res, resHdrs);
      int err = GetLastError();

      if(code == 200)
      {
         respOut = CharArrayToString(res);
         MarkSuccess();
         return code;
      }

      if(attempt < RetryMax)
      {
         if(SendDiagnostics)
            Print("MMC HTTP retry attempt=", attempt, " code=", code, " err=", err);
         Sleep(BackoffMs(attempt));
         continue;
      }

      respOut = CharArrayToString(res);
      MarkFailure();
      if(SendDiagnostics)
         Print("MMC HTTP FINAL FAIL code=", code, " err=", err, " resp=", respOut);
      return code;
   }
   return -1;
}

// ── SHA256 HASH (for delta mode snapshot comparison) ───────────────
string SimpleHash(string s)
{
   // Fast string hash for delta comparison (not cryptographic)
   ulong h = 14695981039346656037;
   for(int i = 0; i < StringLen(s); i++)
   {
      h ^= (ulong)StringGetCharacter(s, i);
      h *= 1099511628211;
   }
   return StringFormat("%016llX", h);
}

// ── HEARTBEAT ──────────────────────────────────────────────────────
void SendHeartbeat()
{
   string acc = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   string body = StringFormat(
      "{\\"action\\":\\"heartbeat\\","
      "\\"account_number\\":\\"%s\\","
      "\\"broker_name\\":\\"%s\\","
      "\\"server_name\\":\\"%s\\","
      "\\"terminal_build\\":\\"%d\\","
      "\\"leverage\\":%d,"
      "\\"currency\\":\\"%s\\","
      "\\"timestamp\\":\\"%s\\"}",
      JsonEscape(acc),
      JsonEscape(BrokerName),
      JsonEscape(AccountInfoString(ACCOUNT_SERVER)),
      (int)TerminalInfoInteger(TERMINAL_BUILD),
      (int)AccountInfoInteger(ACCOUNT_LEVERAGE),
      JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)),
      TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS));

   string hdrs = "Content-Type: application/json\\r\\nX-MT5-Key: " + SyncKey;
   string resp = "";
   int code = HttpPostJson(SyncApiUrl, body, hdrs, resp);
   if(code == 200 && SendDiagnostics)
      Print("MMC Heartbeat: OK");
}

// ── REGISTER ACCOUNT ───────────────────────────────────────────────
void SendRegister()
{
   string acc = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   string body = StringFormat(
      "{\\"action\\":\\"register\\","
      "\\"account_number\\":\\"%s\\","
      "\\"broker_name\\":\\"%s\\","
      "\\"server_name\\":\\"%s\\","
      "\\"terminal_build\\":\\"%d\\","
      "\\"leverage\\":%d,"
      "\\"currency\\":\\"%s\\","
      "\\"timestamp\\":\\"%s\\"}",
      JsonEscape(acc),
      JsonEscape(BrokerName),
      JsonEscape(AccountInfoString(ACCOUNT_SERVER)),
      (int)TerminalInfoInteger(TERMINAL_BUILD),
      (int)AccountInfoInteger(ACCOUNT_LEVERAGE),
      JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)),
      TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS));

   string hdrs = "Content-Type: application/json\\r\\nX-MT5-Key: " + SyncKey;
   string resp = "";
   int code = HttpPostJson(SyncApiUrl, body, hdrs, resp);
   if(code == 200) Print("MMC Register: OK");
   else Print("MMC Register: HTTP ", code);
}

// ── POSITION SYNC ──────────────────────────────────────────────────
string BuildPositionsJson()
{
   int total = PositionsTotal();
   string s = "[";
   bool first = true;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      string side = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "buy" : "sell";
      double bid = 0, ask = 0;
      SymbolInfoDouble(sym, SYMBOL_BID, bid);
      SymbolInfoDouble(sym, SYMBOL_ASK, ask);
      double curPrice = (side == "buy") ? bid : ask;

      if(!first) s += ",";
      first = false;

      s += StringFormat(
         "{\\"ticket\\":%I64u,"
         "\\"symbol\\":\\"%s\\","
         "\\"type\\":\\"%s\\","
         "\\"volume\\":%.2f,"
         "\\"open_price\\":%.5f,"
         "\\"current_price\\":%.5f,"
         "\\"stop_loss\\":%.5f,"
         "\\"take_profit\\":%.5f,"
         "\\"swap\\":%.2f,"
         "\\"profit\\":%.2f,"
         "\\"commission\\":%.2f,"
         "\\"magic_number\\":%I64d,"
         "\\"comment\\":\\"%s\\","
         "\\"open_time\\":\\"%s\\"}",
         ticket,
         JsonEscape(sym),
         side,
         PositionGetDouble(POSITION_VOLUME),
         PositionGetDouble(POSITION_PRICE_OPEN),
         curPrice,
         PositionGetDouble(POSITION_SL),
         PositionGetDouble(POSITION_TP),
         PositionGetDouble(POSITION_SWAP),
         PositionGetDouble(POSITION_PROFIT),
         PositionGetDouble(POSITION_COMMISSION),
         (long)PositionGetInteger(POSITION_MAGIC),
         JsonEscape(PositionGetString(POSITION_COMMENT)),
         TimeToString(ServerToUtc((datetime)PositionGetInteger(POSITION_TIME)), TIME_DATE|TIME_SECONDS));
   }
   s += "]";
   return s;
}

// ── ORDER SYNC ─────────────────────────────────────────────────────
string BuildOrdersJson()
{
   int total = OrdersTotal();
   string s = "[";
   bool first = true;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket == 0) continue;
      if(!OrderSelect(ticket)) continue;

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

      s += StringFormat(
         "{\\"ticket\\":%I64u,"
         "\\"symbol\\":\\"%s\\","
         "\\"type\\":\\"%s\\","
         "\\"volume\\":%.2f,"
         "\\"price\\":%.5f,"
         "\\"stop_loss\\":%.5f,"
         "\\"take_profit\\":%.5f,"
         "\\"magic_number\\":%I64d,"
         "\\"comment\\":\\"%s\\","
         "\\"order_time\\":\\"%s\\","
         "\\"state\\":\\"placed\\"}",
         ticket,
         JsonEscape(OrderGetString(ORDER_SYMBOL)),
         typeStr,
         OrderGetDouble(ORDER_VOLUME_CURRENT),
         OrderGetDouble(ORDER_PRICE_OPEN),
         OrderGetDouble(ORDER_SL),
         OrderGetDouble(ORDER_TP),
         (long)OrderGetInteger(ORDER_MAGIC),
         JsonEscape(OrderGetString(ORDER_COMMENT)),
         TimeToString(ServerToUtc((datetime)OrderGetInteger(ORDER_TIME_SETUP)), TIME_DATE|TIME_SECONDS));
   }
   s += "]";
   return s;
}

// ── SNAPSHOT (Positions + Orders — with delta mode) ────────────────
void SendSnapshot()
{
   if(CircuitBreakerOpen()) return;

   string acc = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   string posJson = BuildPositionsJson();
   string ordJson = BuildOrdersJson();

   // Delta mode: skip if nothing changed
   g_snapCounter++;
   bool forceFull = (g_snapCounter % FullRefreshEveryN == 0);
   string snapHash = SimpleHash(posJson + "|" + ordJson);

   if(DeltaMode && !forceFull && snapHash == g_lastSnapHash)
      return;  // no change
   g_lastSnapHash = snapHash;

   // Send positions
   string posBody = StringFormat(
      "{\\"action\\":\\"sync_positions\\","
      "\\"account_number\\":\\"%s\\","
      "\\"broker_name\\":\\"%s\\","
      "\\"timestamp\\":\\"%s\\","
      "\\"data\\":{\\"positions\\":%s}}",
      JsonEscape(acc), JsonEscape(BrokerName),
      TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS), posJson);

   string hdrs = "Content-Type: application/json\\r\\nX-MT5-Key: " + SyncKey;
   string resp = "";
   HttpPostJson(SyncApiUrl, posBody, hdrs, resp);

   // Send orders
   string ordBody = StringFormat(
      "{\\"action\\":\\"sync_orders\\","
      "\\"account_number\\":\\"%s\\","
      "\\"broker_name\\":\\"%s\\","
      "\\"timestamp\\":\\"%s\\","
      "\\"data\\":{\\"orders\\":%s}}",
      JsonEscape(acc), JsonEscape(BrokerName),
      TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS), ordJson);

   HttpPostJson(SyncApiUrl, ordBody, hdrs, resp);
}

// ── EQUITY SNAPSHOT ────────────────────────────────────────────────
void SendEquitySnapshot()
{
   if(CircuitBreakerOpen()) return;

   string acc = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   string body = StringFormat(
      "{\\"action\\":\\"sync_snapshot\\","
      "\\"account_number\\":\\"%s\\","
      "\\"broker_name\\":\\"%s\\","
      "\\"timestamp\\":\\"%s\\","
      "\\"data\\":{"
         "\\"balance\\":%.2f,"
         "\\"equity\\":%.2f,"
         "\\"margin\\":%.2f,"
         "\\"free_margin\\":%.2f,"
         "\\"margin_level\\":%.2f,"
         "\\"floating_pl\\":%.2f,"
         "\\"positions_count\\":%d,"
         "\\"orders_count\\":%d"
      "}}",
      JsonEscape(acc), JsonEscape(BrokerName),
      TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS),
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      AccountInfoDouble(ACCOUNT_FREEMARGIN),
      AccountInfoDouble(ACCOUNT_MARGIN_LEVEL),
      AccountInfoDouble(ACCOUNT_PROFIT),
      PositionsTotal(),
      OrdersTotal());

   string hdrs = "Content-Type: application/json\\r\\nX-MT5-Key: " + SyncKey;
   string resp = "";
   HttpPostJson(SyncApiUrl, body, hdrs, resp);
}

// ── DEAL HISTORY SYNC (watermark-based) ────────────────────────────
void SyncDeals()
{
   if(CircuitBreakerOpen()) return;

   datetime nowServer = TimeCurrent();
   datetime fromServer = (g_lastDealTimeServer > 120) ? g_lastDealTimeServer - 120 : 0;

   if(!HistorySelect(fromServer, nowServer)) return;

   string acc = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   string srv = AccountInfoString(ACCOUNT_SERVER);
   string deals = "[";
   bool first = true;
   int sent = 0;
   datetime maxSeen = g_lastDealTimeServer;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      if(sent >= MaxBatchSize) break;
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0) continue;

      long dtype = (long)HistoryDealGetInteger(deal, DEAL_TYPE);
      if(dtype != DEAL_TYPE_BUY && dtype != DEAL_TYPE_SELL) continue;

      // Only closed trades (exit deals)
      long entry = (long)HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT) continue;

      datetime tServer = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
      if(tServer < fromServer) continue;
      if(tServer > maxSeen) maxSeen = tServer;

      if(!first) deals += ",";
      first = false;
      sent++;

       deals += StringFormat(
          "{\\"ticket\\":%I64u,"
          "\\"symbol\\":\\"%s\\","
          "\\"type\\":\\"%s\\","
          "\\"entry\\":\\"out\\","
          "\\"volume\\":%.2f,"
          "\\"price\\":%.5f,"
          "\\"profit\\":%.2f,"
          "\\"commission\\":%.2f,"
          "\\"swap\\":%.2f,"
          "\\"fee\\":0.00,"
          "\\"magic_number\\":%I64d,"
          "\\"comment\\":\\"%s\\","
          "\\"position_ticket\\":%I64d,"
          "\\"time\\":\\"%s\\"}",
          deal,
          JsonEscape(HistoryDealGetString(deal, DEAL_SYMBOL)),
          (dtype == DEAL_TYPE_BUY ? "buy" : "sell"),
          HistoryDealGetDouble(deal, DEAL_VOLUME),
          HistoryDealGetDouble(deal, DEAL_PRICE),
          HistoryDealGetDouble(deal, DEAL_PROFIT),
          HistoryDealGetDouble(deal, DEAL_COMMISSION),
          HistoryDealGetDouble(deal, DEAL_SWAP),
          (long)HistoryDealGetInteger(deal, DEAL_MAGIC),
          JsonEscape(HistoryDealGetString(deal, DEAL_COMMENT)),
          (long)HistoryDealGetInteger(deal, DEAL_POSITION_ID),
          TimeToString(ServerToUtc(tServer), TIME_DATE|TIME_SECONDS));
    }
    deals += "]";

    if(sent == 0) return;  // nothing new

    // Send deals via unified sync_deals action
    string body = StringFormat(
       "{\\"action\\":\\"sync_deals\\","
       "\\"account_number\\":\\"%s\\","
       "\\"broker_name\\":\\"%s\\","
       "\\"timestamp\\":\\"%s\\","
       "\\"data\\":{\\"deals\\":%s}}",
       acc, JsonEscape(BrokerName),
       TimeToString(NowUtc(), TIME_DATE|TIME_SECONDS), deals);

    string hdrs = "Content-Type: application/json\\r\\nX-MT5-Key: " + SyncKey;
    string resp = "";
    int code = HttpPostJson(SyncApiUrl, body, hdrs, resp);
    if(code == 200)
    {
       g_lastDealTimeServer = maxSeen;
       SaveWatermarks();
       if(SendDiagnostics) Print("MMC Deals synced: ", sent, " trades");
    }
}

// ── INIT / DEINIT / TIMER ──────────────────────────────────────────
int OnInit()
{
   MathSrand((int)TimeLocal());
   LoadWatermarks();

    Print("MMC AutoSync V3 started — Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print("NOTE: Add this URL to MT5 WebRequest allowlist (Tools > Options > Expert Advisors):");
    Print("  ", SyncApiUrl);

   EventSetTimer(1);

   // Register + immediate sync
   SendRegister();
   SendHeartbeat();
   SendSnapshot();
   SendEquitySnapshot();
   SyncDeals();

   g_lastHeartbeat  = TimeCurrent();
   g_lastSnapshot   = TimeCurrent();
   g_lastEquitySnap = TimeCurrent();
   g_lastDealSync   = TimeCurrent();

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { EventKillTimer(); }

void OnTimer()
{
   // Heartbeat always runs (even during circuit breaker)
   if(TimeCurrent() - g_lastHeartbeat >= HeartbeatSec)
   {
      SendHeartbeat();
      g_lastHeartbeat = TimeCurrent();
   }

   if(CircuitBreakerOpen()) return;  // skip data sync during CB

   if(TimeCurrent() - g_lastSnapshot >= SnapshotSec)
   {
      SendSnapshot();
      g_lastSnapshot = TimeCurrent();
   }

   if(TimeCurrent() - g_lastEquitySnap >= EquitySnapSec)
   {
      SendEquitySnapshot();
      g_lastEquitySnap = TimeCurrent();
   }

   if(TimeCurrent() - g_lastDealSync >= DealSyncSec)
   {
      SyncDeals();
      g_lastDealSync = TimeCurrent();
   }
}
`;
}

export default MT5SetupWizard;
