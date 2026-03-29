import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Zap, Brain, TrendingUp, Clock, Phone, CheckCircle, Loader2, Gift, Users, Rocket, Star, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const phoneSchema = z.string().trim()
  .min(10, { message: "Please enter a valid phone number" })
  .max(15, { message: "Phone number too long" })
  .regex(/^[+]?[\d\s-]+$/, { message: "Invalid phone number format" });

const upcomingFeatures = [
  {
    icon: Brain,
    title: "AI Strategy Analysis",
    description: "Get deep insights into your trading strategies with advanced AI reasoning"
  },
  {
    icon: TrendingUp,
    title: "Real-time Recommendations",
    description: "Receive actionable trade signals and market analysis in real-time"
  },
  {
    icon: Zap,
    title: "Instant Backtesting",
    description: "Test strategy ideas instantly through natural language commands"
  },
  {
    icon: Sparkles,
    title: "Risk Assessment",
    description: "AI-powered risk evaluation and position sizing suggestions"
  }
];

export default function Sentinel() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch current waitlist count
      const { count } = await supabase
        .from('sentinel_waitlist')
        .select('*', { count: 'exact', head: true });
      if (count !== null) {
        setSpotsLeft(Math.max(0, 100 - count));
      }

      // Fetch webhook URL from settings
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'sentinel_webhook_url')
        .maybeSingle();
      
      if (settings?.value) {
        setWebhookUrl(settings.value);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = phoneSchema.safeParse(phone);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('sentinel_waitlist')
        .insert({ phone: result.data });

      if (error) {
        if (error.code === '23505') {
          toast.info("You're already on the waitlist!");
          setIsSubscribed(true);
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        const newSpotsLeft = spotsLeft !== null && spotsLeft > 0 ? spotsLeft - 1 : 0;
        setSpotsLeft(newSpotsLeft);
        toast.success("🎉 You're in! We'll contact you when Sentinel launches.");

        // Send WhatsApp notification via webhook (fire and forget)
        if (webhookUrl) {
          supabase.functions.invoke('waitlist-notify', {
            body: { 
              phone: result.data, 
              spotsLeft: newSpotsLeft,
              webhookUrl 
            }
          }).catch(() => { /* Notification failed - non-critical */ });
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden bg-background">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        {/* Main Content */}
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Coming Soon Banner - Enhanced */}
          <div className="relative mx-auto max-w-md">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl animate-pulse" />
            <div className="relative px-6 py-3 rounded-full bg-background/80 backdrop-blur-md border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
              <div className="flex items-center justify-center gap-3">
                <Rocket className="h-5 w-5 text-primary animate-bounce" />
                <span className="text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_3s_ease_infinite]">
                  COMING SOON
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <Star key={i} className="h-4 w-4 text-warning animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Icon & Title */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              {/* Outer glow rings */}
              <div className="absolute inset-0 -m-4 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl animate-pulse" />
              <div className="absolute inset-0 -m-2 rounded-2xl border border-primary/20 animate-[spin_8s_linear_infinite]" />
              
              {/* Main icon container */}
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.5)] animate-float">
                <Shield className="h-12 w-12 text-white drop-shadow-lg" />
                
                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                </div>
              </div>
              
              {/* Activity indicator */}
              <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-background/90 border border-primary/30 shadow-lg">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_4s_ease_infinite]">
                  MMC Sentinel
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Your AI-Powered Trading Assistant
              </p>
            </div>
          </div>

          {/* Description with neural effects */}
          <div className="relative p-6 rounded-xl bg-card/30 backdrop-blur-md border border-primary/20">
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[scan-line_4s_ease-in-out_infinite]" style={{ top: '50%' }} />
            </div>
            <p className="relative text-muted-foreground leading-relaxed">
              We're building an intelligent trading companion that will revolutionize how you analyze strategies, 
              manage risk, and make trading decisions. Powered by cutting-edge AI technology.
            </p>
          </div>

          {/* Subscription Form - Enhanced */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-profit/5 via-profit/10 to-emerald-500/5 border-profit/30 backdrop-blur-md shadow-[0_0_40px_hsl(152_75%_48%/0.2)]">
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-lg">
              <div className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-r from-profit via-emerald-400 to-profit bg-[length:200%_auto] animate-[gradient-shift_3s_linear_infinite]" style={{ WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2px' }} />
            </div>
            
            <CardContent className="relative p-6">
              {isSubscribed ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-profit/30 blur-xl animate-pulse" />
                    <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-profit to-emerald-400 flex items-center justify-center shadow-[0_0_30px_hsl(152_75%_48%/0.5)]">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-profit">You're on the list!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll contact you when Sentinel is ready to launch.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-5">
                  {/* Free Forever Banner - Enhanced */}
                  <div className="relative overflow-hidden py-3 px-4 rounded-xl bg-gradient-to-r from-warning/10 via-orange-500/15 to-warning/10 border border-warning/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Gift className="h-6 w-6 text-warning animate-bounce" />
                      <span className="font-bold text-lg text-warning">First 100 Users — FREE FOREVER!</span>
                      <Gift className="h-6 w-6 text-warning animate-bounce" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>

                  {/* Spots Counter - Enhanced */}
                  {spotsLeft !== null && (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className={`font-mono text-lg ${spotsLeft <= 20 ? "text-loss font-bold animate-pulse" : "text-muted-foreground"}`}>
                        {spotsLeft > 0 ? (
                          <>
                            <span className="text-2xl font-bold text-primary">{spotsLeft}</span>
                            <span className="ml-1">spots remaining!</span>
                          </>
                        ) : (
                          "Waitlist full — join for priority access"
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="font-bold text-lg">Drop Your Contact Number</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Be the first to get lifetime free access
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-12 h-12 text-lg bg-background/50 border-primary/20 focus:border-primary/50"
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading || !phone.trim()} 
                      className="h-12 px-6 bg-gradient-to-r from-profit to-emerald-500 hover:from-profit/90 hover:to-emerald-400 text-white font-bold shadow-[0_0_20px_hsl(152_75%_48%/0.4)] hover:shadow-[0_0_30px_hsl(152_75%_48%/0.6)] transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Rocket className="h-5 w-5 mr-2" />
                          Join Free
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Feature Cards - Enhanced */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {upcomingFeatures.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group relative overflow-hidden bg-card/50 border-border/50 backdrop-blur-md hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/10 group-hover:to-primary/5 transition-all duration-300" />
                
                <CardContent className="relative p-5 flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-base group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Note */}
          <p className="text-sm text-muted-foreground pt-4 opacity-70">
            First 100 users get unlimited AI conversations free forever. After that, premium credits will apply.
          </p>
        </div>
      </div>
    </div>
  );
}
