import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, TrendingUp, Shield, FileText, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const PROMPT_CHIPS = [
  { label: 'Analyze strategy', icon: TrendingUp },
  { label: 'Explain risk', icon: Shield },
  { label: 'Generate EA logic', icon: Sparkles },
  { label: 'Summarize results', icon: FileText },
];

const QUICK_ACTIONS = [
  { label: 'Backtest', icon: Zap, prompt: 'Help me set up a backtest for my trading strategy' },
  { label: 'Optimizer', icon: BarChart3, prompt: 'How do I optimize my strategy parameters?' },
  { label: 'Walk-forward', icon: TrendingUp, prompt: 'Explain walk-forward analysis and how to use it' },
  { label: 'Risk', icon: Shield, prompt: 'Analyze the risk metrics of my latest backtest' },
];

export function Composer({ onSend, isLoading, disabled }: ComposerProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (label: string) => {
    setInput(label + ': ');
    textareaRef.current?.focus();
  };

  const handleQuickAction = (prompt: string) => {
    onSend(prompt);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm p-4">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => handleQuickAction(action.prompt)}
            disabled={isLoading || disabled}
          >
            <action.icon className="h-3 w-3" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Prompt Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleChipClick(chip.label)}
            disabled={isLoading || disabled}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
              "transition-colors disabled:opacity-50"
            )}
          >
            <chip.icon className="h-3 w-3" />
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MMC Sentinel anything about trading, strategies, or backtesting..."
            disabled={isLoading || disabled}
            className="min-h-[44px] max-h-[150px] resize-none pr-20"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {input.length}/4000
            </span>
            {input && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setInput('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          className="h-11 w-11 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
