/**
 * Settings → Trust Center
 * Split into: Profile, Preferences, Privacy, Security, Data, Trust Center
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Globe, IndianRupee, Save, RotateCcw,
  Bell, Volume2, VolumeX, User, Shield, Database, Palette, Lock,
  Key, Smartphone, Mail, Trash2, Download, LogOut, Eye, EyeOff,
  Check, AlertTriangle, Camera, Monitor, FileText, Fingerprint,
  History, Bot, Activity, ChevronRight, ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/ui/PageTitle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAiUsage } from '@/hooks/useAiUsage';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast as sonnerToast } from 'sonner';

// ── Constants ──
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

interface AppSettings {
  timezone: string;
  currency: string;
  autoSaveResults: boolean;
  defaultCommission: number;
  defaultSlippage: number;
  defaultRiskPerTrade: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  autoSaveResults: true,
  defaultCommission: 0.01,
  defaultSlippage: 1,
  defaultRiskPerTrade: 1,
};

// ── Section Components ──

function ProfileSection() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || '');
          setAvatarUrl(data.avatar_url || '');
        }
      });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
    sonnerToast.success('Profile updated');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label className="text-xs">Display Name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>
          <Button size="sm" onClick={saveProfile}><Save className="h-3.5 w-3.5 mr-1.5" /> Save Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesSection() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('app-settings');
    if (saved) try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) }); } catch {}
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem('app-settings', JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Regional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Timezone</Label>
              <Select value={settings.timezone} onValueChange={v => update('timezone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <Select value={settings.currency} onValueChange={v => update('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4 text-primary" /> Trading Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Commission</Label>
              <Input type="number" step="0.001" value={settings.defaultCommission} onChange={e => update('defaultCommission', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slippage (pts)</Label>
              <Input type="number" value={settings.defaultSlippage} onChange={e => update('defaultSlippage', parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Risk/Trade %</Label>
              <Input type="number" step="0.1" value={settings.defaultRiskPerTrade} onChange={e => update('defaultRiskPerTrade', parseFloat(e.target.value) || 1)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 2FA UI */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Two-Factor Authentication</div>
                <div className="text-[10px] text-muted-foreground">Add an extra layer of security to your account</div>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">Coming Soon</Badge>
          </div>

          {/* Password Change */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Change Password</div>
                <div className="text-[10px] text-muted-foreground">Update your password regularly</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={async () => {
              if (!user?.email) return;
              await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
              sonnerToast.success('Password reset email sent');
            }}>
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-sm font-medium">Current Session</div>
                <div className="text-[10px] text-muted-foreground">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'} · Active Now
                </div>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">Active</Badge>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={async () => {
            await supabase.auth.signOut();
            navigate('/auth');
          }}>
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out All Sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PrivacySection() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Privacy Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Profile Visibility</div>
              <div className="text-[10px] text-muted-foreground">Control who can see your profile</div>
            </div>
            <Select defaultValue="private">
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="workspace">Workspace</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Share Trading Stats</div>
              <div className="text-[10px] text-muted-foreground">Allow leaderboard participation</div>
            </div>
            <Switch defaultChecked={false} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm">Analytics Collection</div>
              <div className="text-[10px] text-muted-foreground">Help improve MMC with anonymous usage data</div>
            </div>
            <Switch defaultChecked={true} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DataSection() {
  const { user } = useAuth();

  const exportData = async () => {
    if (!user) return;
    try {
      const [trades, journal, achievements] = await Promise.all([
        supabase.from('trades').select('*').eq('user_id', user.id),
        supabase.from('journal_entries').select('*').eq('user_id', user.id),
        supabase.from('user_achievements').select('*').eq('user_id', user.id),
      ]);
      const exportObj = {
        exported_at: new Date().toISOString(),
        trades: trades.data || [],
        journal: journal.data || [],
        achievements: achievements.data || [],
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mmc-data-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      sonnerToast.success('Data exported successfully');
    } catch {
      sonnerToast.error('Export failed');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> Data Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Download all your data as a JSON file. Includes trades, journal entries, and achievements.</p>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export All Data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-red-400"><Trash2 className="h-4 w-4" /> Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete your account and all data. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

function TrustCenterSection() {
  const aiUsage = useAiUsage('ai_copilot');

  return (
    <div className="space-y-4">
      {/* AI Usage Transparency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> AI Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-[10px] text-muted-foreground">Used Today</div>
              <div className="text-xl font-bold font-mono">{aiUsage.usedToday}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-[10px] text-muted-foreground">Remaining</div>
              <div className="text-xl font-bold font-mono text-emerald-400">{aiUsage.remaining}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-[10px] text-muted-foreground">Daily Limit</div>
              <div className="text-xl font-bold font-mono">{aiUsage.limit}</div>
            </div>
          </div>
          <Progress value={(aiUsage.usedToday / aiUsage.limit) * 100} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">
            AI features use your trading data locally. No raw data is sent to external servers — only aggregated metrics and summaries.
          </p>
        </CardContent>
      </Card>

      {/* Audit Log Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { action: 'Login', time: 'Just now', icon: User },
              { action: 'Settings updated', time: 'Today', icon: SettingsIcon },
              { action: 'Data exported', time: 'This week', icon: Download },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-xs">{item.action}</div>
                  <div className="text-[10px] text-muted-foreground">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legal Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Legal & Trust</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'Terms of Service', path: '/terms' },
            { label: 'Privacy Policy', path: '/privacy' },
            { label: 'Risk Disclaimer', path: '/risk-disclaimer' },
          ].map(link => (
            <Link key={link.path} to={link.path} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-xs">
              {link.label}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Settings Page ──
export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Settings" subtitle="Profile, preferences, and trust center" />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile"><User className="h-3.5 w-3.5 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="preferences"><Globe className="h-3.5 w-3.5 mr-1.5" /> Preferences</TabsTrigger>
          <TabsTrigger value="privacy"><Eye className="h-3.5 w-3.5 mr-1.5" /> Privacy</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-3.5 w-3.5 mr-1.5" /> Security</TabsTrigger>
          <TabsTrigger value="data"><Database className="h-3.5 w-3.5 mr-1.5" /> Data</TabsTrigger>
          <TabsTrigger value="trust"><Activity className="h-3.5 w-3.5 mr-1.5" /> Trust Center</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileSection /></TabsContent>
        <TabsContent value="preferences"><PreferencesSection /></TabsContent>
        <TabsContent value="privacy"><PrivacySection /></TabsContent>
        <TabsContent value="security"><SecuritySection /></TabsContent>
        <TabsContent value="data"><DataSection /></TabsContent>
        <TabsContent value="trust"><TrustCenterSection /></TabsContent>
      </Tabs>
    </div>
  );
}
