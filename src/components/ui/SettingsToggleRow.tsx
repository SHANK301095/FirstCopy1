import { type ReactNode, type FC } from "react";
import { Switch } from "./switch";
import { cn } from "@/lib/utils";

interface SettingsToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

export const SettingsToggleRow: FC<SettingsToggleRowProps> = ({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3 px-1",
        "group cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
            {icon}
          </div>
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-foreground leading-tight">
            {label}
          </span>
          {description && (
            <span className="text-xs text-muted-foreground leading-snug">
              {description}
            </span>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
