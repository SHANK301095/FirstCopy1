/**
 * VisibilityToggle
 * Toggle component for changing asset visibility (private/public/workspace)
 */

import { Globe, Lock, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type VisibilityType } from '@/lib/saasEntities';

interface VisibilityToggleProps {
  value: VisibilityType;
  onChange: (value: VisibilityType) => void;
  disabled?: boolean;
  showWorkspace?: boolean;
  label?: string;
  className?: string;
}

const VISIBILITY_OPTIONS: {
  value: VisibilityType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see this',
    icon: <Lock className="h-4 w-4" />,
    color: 'text-muted-foreground',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Free for all users',
    icon: <Globe className="h-4 w-4" />,
    color: 'text-green-500',
  },
  {
    value: 'workspace',
    label: 'Workspace',
    description: 'Shared with your team',
    icon: <Users className="h-4 w-4" />,
    color: 'text-blue-500',
  },
];

export function VisibilityToggle({
  value,
  onChange,
  disabled = false,
  showWorkspace = true,
  label,
  className,
}: VisibilityToggleProps) {
  const options = showWorkspace
    ? VISIBILITY_OPTIONS
    : VISIBILITY_OPTIONS.filter(o => o.value !== 'workspace');

  const currentOption = VISIBILITY_OPTIONS.find(o => o.value === value);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className="text-xs text-muted-foreground">{label}</Label>
      )}
      <Select
        value={value}
        onValueChange={(v) => onChange(v as VisibilityType)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {currentOption && (
              <span className={cn('flex items-center gap-2', currentOption.color)}>
                {currentOption.icon}
                {currentOption.label}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <span className={option.color}>{option.icon}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * VisibilityBadge
 * Simple badge showing current visibility
 */
export function VisibilityBadge({ 
  visibility, 
  className 
}: { 
  visibility: VisibilityType | 'shared';
  className?: string;
}) {
  const config = {
    private: { label: 'Private', icon: Lock, className: 'bg-muted text-muted-foreground' },
    public: { label: 'Public', icon: Globe, className: 'bg-green-500/10 text-green-600 border-green-500/30' },
    workspace: { label: 'Team', icon: Users, className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
    shared: { label: 'Shared', icon: Globe, className: 'bg-primary/10 text-primary border-primary/30' },
  }[visibility];

  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn('text-xs gap-1', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default VisibilityToggle;
