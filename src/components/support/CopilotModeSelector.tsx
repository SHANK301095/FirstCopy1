import { cn } from '@/lib/utils';
import { Compass, Bug, Hammer } from 'lucide-react';

export type CopilotMode = 'guide' | 'debug' | 'build';

interface CopilotModeSelectorProps {
  mode: CopilotMode;
  onChange: (mode: CopilotMode) => void;
  disabled?: boolean;
}

const modes = [
  { 
    id: 'guide' as const, 
    label: 'Guide', 
    icon: Compass,
    description: 'Step-by-step navigation help'
  },
  { 
    id: 'debug' as const, 
    label: 'Debug', 
    icon: Bug,
    description: 'Log-first troubleshooting'
  },
  { 
    id: 'build' as const, 
    label: 'Build', 
    icon: Hammer,
    description: 'Implementation prompts'
  },
] as const;

export function CopilotModeSelector({ mode, onChange, disabled }: CopilotModeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg border border-border/30">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            disabled={disabled}
            title={m.description}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Mode-specific system prompt additions
export const MODE_PROMPTS: Record<CopilotMode, string> = {
  guide: `
MODE: GUIDE
Focus on step-by-step navigation and feature explanation.
- Give exact click paths (Sidebar → Section → Button)
- Explain what each feature does
- Be beginner-friendly
- Use "Aap" to address user (Hinglish)`,
  
  debug: `
MODE: DEBUG
Focus on troubleshooting and problem-solving.
- Start with read-only analysis (ask for logs, errors, repro steps)
- Form 2-3 hypotheses, pick most likely
- Propose minimal-diff fixes
- Always provide regression checklist
- Never guess without evidence`,
  
  build: `
MODE: BUILD  
Focus on implementation guidance and Lovable prompts.
- Generate copy-paste ready Lovable prompts
- Suggest architecture/patterns
- Provide code snippets when helpful
- Focus on actionable implementation steps`,
};
