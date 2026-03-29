/**
 * Next Step Suggestion - P0 UX
 * Smart workflow suggestions based on current stage
 */

import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepSuggestion {
  label: string;
  path: string;
  description: string;
}

const WORKFLOW_SUGGESTIONS: Record<string, StepSuggestion[]> = {
  '/': [
    { label: 'Upload Data', path: '/data', description: 'Start by importing your CSV data' },
    { label: 'View Dashboard', path: '/dashboard', description: 'See your trading stats' },
  ],
  '/dashboard': [
    { label: 'Run Backtest', path: '/workflow', description: 'Test your strategy' },
    { label: 'Import Data', path: '/data', description: 'Upload more datasets' },
  ],
  '/data': [
    { label: 'Create Strategy', path: '/strategies', description: 'Build or import a strategy' },
    { label: 'Run Backtest', path: '/workflow', description: 'Test with your data' },
  ],
  '/strategies': [
    { label: 'Run Backtest', path: '/workflow', description: 'Test your strategy' },
    { label: 'Optimize', path: '/optimizer', description: 'Find best parameters' },
  ],
  '/workflow': [
    { label: 'View Results', path: '/saved-results', description: 'Analyze your trades' },
    { label: 'Generate Report', path: '/reports', description: 'Create PDF report' },
  ],
  '/saved-results': [
    { label: 'Advanced Analytics', path: '/analytics', description: 'Deep dive analysis' },
    { label: 'Risk Dashboard', path: '/risk-dashboard', description: 'View risk metrics' },
  ],
  '/optimizer': [
    { label: 'Walk-Forward', path: '/walk-forward', description: 'Validate optimization' },
    { label: 'Run Backtest', path: '/workflow', description: 'Test optimized params' },
  ],
};

interface NextStepSuggestionProps {
  className?: string;
  compact?: boolean;
}

export function NextStepSuggestion({ className, compact = false }: NextStepSuggestionProps) {
  const location = useLocation();
  const suggestions = WORKFLOW_SUGGESTIONS[location.pathname];

  if (!suggestions || suggestions.length === 0) return null;

  const firstSuggestion = suggestions[0];

  if (compact) {
    return (
      <Link 
        to={firstSuggestion.path}
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors",
          className
        )}
      >
        <Lightbulb className="h-3 w-3" />
        <span>Next: {firstSuggestion.label}</span>
        <ArrowRight className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Lightbulb className="h-4 w-4 text-primary" />
      <span className="text-xs text-muted-foreground">Suggested:</span>
      {suggestions.slice(0, 2).map((suggestion, idx) => (
        <Button
          key={suggestion.path}
          variant={idx === 0 ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          asChild
        >
          <Link to={suggestion.path}>
            {suggestion.label}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      ))}
    </div>
  );
}
