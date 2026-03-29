import { useState } from 'react';
import { AlertTriangle, Shield, Check, X, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useExecutionStore } from '@/store/executionStore';
import { cn } from '@/lib/utils';

interface RiskDisclosureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
}

const RISK_POINTS = [
  {
    title: 'Substantial Risk of Loss',
    description: 'Live trading involves substantial risk of financial loss. You could lose some or all of your invested capital.',
    severity: 'critical',
  },
  {
    title: 'Past Performance Warning',
    description: 'Backtest results and paper trading performance do NOT guarantee future live trading results. Market conditions change constantly.',
    severity: 'critical',
  },
  {
    title: 'Technical Failures',
    description: 'Technical issues including connectivity problems, API failures, latency, and system errors may result in missed trades, incorrect executions, or losses.',
    severity: 'high',
  },
  {
    title: 'No Guaranteed Execution',
    description: 'Order execution depends on third-party brokers. MMC cannot guarantee execution prices, fill rates, or order success.',
    severity: 'high',
  },
  {
    title: 'Slippage & Market Impact',
    description: 'Live markets experience slippage, gaps, and market impact that may not be reflected in backtests.',
    severity: 'medium',
  },
  {
    title: 'Your Responsibility',
    description: 'You are solely responsible for all trading decisions, risk management, and resulting profits or losses.',
    severity: 'critical',
  },
];

const ACKNOWLEDGMENTS = [
  'I understand that live trading carries substantial risk of financial loss',
  'I acknowledge that past backtest performance does not guarantee future results',
  'I accept full responsibility for all my trading decisions and outcomes',
  'I have read and agree to the Terms of Service and Execution Bridge disclaimer',
  'I confirm that I am using capital I can afford to lose',
];

export function RiskDisclosureModal({ open, onOpenChange, onAccept }: RiskDisclosureModalProps) {
  const { setRiskDisclosureAccepted, setLiveTradingEnabled } = useExecutionStore();
  const [checkedItems, setCheckedItems] = useState<boolean[]>(new Array(ACKNOWLEDGMENTS.length).fill(false));
  const [typedConfirmation, setTypedConfirmation] = useState('');
  
  const allChecked = checkedItems.every(Boolean);
  const confirmationValid = typedConfirmation.toLowerCase() === 'i accept the risks';
  const canAccept = allChecked && confirmationValid;

  const handleCheckChange = (index: number, checked: boolean) => {
    const newChecked = [...checkedItems];
    newChecked[index] = checked;
    setCheckedItems(newChecked);
  };

  const handleAccept = () => {
    setRiskDisclosureAccepted(true);
    setLiveTradingEnabled(true);
    onOpenChange(false);
    onAccept?.();
  };

  const handleDecline = () => {
    setCheckedItems(new Array(ACKNOWLEDGMENTS.length).fill(false));
    setTypedConfirmation('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">Live Trading Risk Disclosure</DialogTitle>
              <DialogDescription>
                Please read carefully before enabling live trading features
              </DialogDescription>
            </div>
          </div>
          <Badge variant="destructive" className="w-fit">
            <Shield className="h-3 w-3 mr-1" />
            Required for Live Trading
          </Badge>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Risk Points */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Important Risk Factors
              </h3>
              {RISK_POINTS.map((point, index) => (
                <div 
                  key={index}
                  className={cn(
                    'p-4 rounded-lg border',
                    point.severity === 'critical' && 'border-destructive/50 bg-destructive/5',
                    point.severity === 'high' && 'border-warning/50 bg-warning/5',
                    point.severity === 'medium' && 'border-primary/30 bg-primary/5',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn(
                      'h-5 w-5 mt-0.5 shrink-0',
                      point.severity === 'critical' && 'text-destructive',
                      point.severity === 'high' && 'text-warning',
                      point.severity === 'medium' && 'text-primary',
                    )} />
                    <div>
                      <h4 className="font-medium text-sm">{point.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{point.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Acknowledgments */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Required Acknowledgments
              </h3>
              {ACKNOWLEDGMENTS.map((text, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Checkbox
                    id={`ack-${index}`}
                    checked={checkedItems[index]}
                    onCheckedChange={(checked) => handleCheckChange(index, checked as boolean)}
                    className="mt-1"
                  />
                  <Label 
                    htmlFor={`ack-${index}`} 
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    {text}
                  </Label>
                </div>
              ))}
            </div>

            <Separator />

            {/* Type Confirmation */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Final Confirmation
              </h3>
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono font-bold text-foreground">"I ACCEPT THE RISKS"</span> to confirm:
              </p>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type here..."
                className={cn(
                  'w-full px-4 py-3 rounded-lg border bg-background text-sm font-mono',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  confirmationValid && 'border-profit ring-2 ring-profit/20',
                )}
              />
              {confirmationValid && (
                <div className="flex items-center gap-2 text-sm text-profit">
                  <Check className="h-4 w-4" />
                  Confirmation accepted
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleDecline} className="gap-2">
            <X className="h-4 w-4" />
            Decline
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleAccept} 
            disabled={!canAccept}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            Accept & Enable Live Trading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
