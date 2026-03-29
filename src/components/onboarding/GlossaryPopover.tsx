/**
 * Glossary Popover - P1 Onboarding
 */

import { HelpCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface GlossaryTerm {
  term: string;
  definition: string;
  formula?: string;
  example?: string;
}

const GLOSSARY: Record<string, GlossaryTerm> = {
  'win-rate': {
    term: 'Win Rate',
    definition: 'The percentage of trades that resulted in a profit.',
    formula: '(Winning Trades / Total Trades) × 100',
    example: '60% win rate means 60 out of 100 trades were profitable',
  },
  'profit-factor': {
    term: 'Profit Factor',
    definition: 'The ratio of gross profit to gross loss. Values above 1 indicate profitability.',
    formula: 'Gross Profit / |Gross Loss|',
    example: 'PF of 1.5 means ₹1.50 earned for every ₹1 lost',
  },
  'sharpe-ratio': {
    term: 'Sharpe Ratio',
    definition: 'Risk-adjusted return metric. Higher is better. Above 1 is good, above 2 is very good.',
    formula: '(Return - Risk-Free Rate) / Standard Deviation',
    example: 'Sharpe of 1.5 indicates good risk-adjusted performance',
  },
  'max-drawdown': {
    term: 'Maximum Drawdown',
    definition: 'The largest peak-to-trough decline in portfolio value.',
    formula: '(Peak - Trough) / Peak × 100',
    example: '20% max DD means the portfolio dropped 20% from its peak',
  },
  'cagr': {
    term: 'CAGR',
    definition: 'Compound Annual Growth Rate - the annualized rate of return.',
    formula: '(Ending Value / Beginning Value)^(1/Years) - 1',
    example: '25% CAGR means 25% annualized growth',
  },
  'expectancy': {
    term: 'Expectancy (R)',
    definition: 'The average amount you can expect to win or lose per trade in terms of risk units.',
    formula: '(Win Rate × Avg Win) - (Loss Rate × Avg Loss)',
    example: 'Positive expectancy indicates a profitable system',
  },
  'equity-curve': {
    term: 'Equity Curve',
    definition: 'A graph showing the cumulative profit/loss over time.',
  },
  'slippage': {
    term: 'Slippage',
    definition: 'The difference between expected price and actual execution price.',
  },
  'drawdown': {
    term: 'Drawdown',
    definition: 'The decline from a historical peak in portfolio value.',
  },
};

interface GlossaryPopoverProps {
  termId: string;
  children?: React.ReactNode;
  className?: string;
}

export function GlossaryPopover({ termId, children, className }: GlossaryPopoverProps) {
  const term = GLOSSARY[termId];

  if (!term) {
    return <>{children}</>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className={cn("inline-flex items-center gap-0.5 cursor-help", className)}>
          {children || term.term}
          <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">{term.term}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{term.definition}</p>
          
          {term.formula && (
            <div className="p-2 rounded-md bg-muted/50 font-mono text-xs">
              {term.formula}
            </div>
          )}
          
          {term.example && (
            <p className="text-[10px] text-muted-foreground italic">
              Example: {term.example}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline Glossary Term - For use in text
 */
interface GlossaryTermProps {
  termId: string;
  className?: string;
}

export function GlossaryTerm({ termId, className }: GlossaryTermProps) {
  const term = GLOSSARY[termId];
  
  if (!term) return null;

  return (
    <GlossaryPopover termId={termId}>
      <span className={cn(
        "border-b border-dashed border-muted-foreground/50 hover:border-primary transition-colors",
        className
      )}>
        {term.term}
      </span>
    </GlossaryPopover>
  );
}
