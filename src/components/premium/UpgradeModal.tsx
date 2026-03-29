import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Shield, Sparkles, Clock, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usedToday?: number;
  limit?: number;
}

const benefits = [
  { icon: Zap, text: 'Unlimited AI code generation', highlight: true },
  { icon: Clock, text: 'Priority processing speed' },
  { icon: Sparkles, text: 'Access to all future AI features' },
  { icon: Shield, text: 'Premium support' },
];

export function UpgradeModal({ open, onOpenChange, usedToday = 3, limit = 3 }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-premium/30 bg-gradient-to-b from-background via-background to-premium/5 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-premium/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <DialogHeader className="text-center pb-2 relative">
          <motion.div 
            className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-premium via-premium-strong to-orange-500 flex items-center justify-center shadow-2xl shadow-premium/40"
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
          >
            <Crown className="w-10 h-10 text-white drop-shadow-lg" />
          </motion.div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-premium via-premium-strong to-orange-400 bg-clip-text text-transparent">
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            You've used <span className="text-foreground font-medium">{usedToday}/{limit}</span> free generations today
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-4">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.text}
              className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors ${
                benefit.highlight 
                  ? 'bg-gradient-to-r from-premium/15 to-premium-strong/10 border border-premium/25' 
                  : 'bg-muted/40 border border-transparent hover:border-border/50'
              }`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.08 }}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                benefit.highlight ? 'bg-premium/20' : 'bg-muted'
              }`}>
                <benefit.icon className={`w-4 h-4 ${benefit.highlight ? 'text-premium' : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-sm ${benefit.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {benefit.text}
              </span>
              {benefit.highlight && (
                <Check className="w-4 h-4 text-premium ml-auto" />
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-premium to-premium-strong hover:from-premium/90 hover:to-premium-strong/90 text-white font-semibold shadow-lg shadow-premium/30 h-12 text-base"
          >
            <Link to="/premium">
              <Crown className="w-5 h-5 mr-2" />
              View Premium Plans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <Clock className="w-4 h-4 mr-2" />
            Wait until tomorrow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
