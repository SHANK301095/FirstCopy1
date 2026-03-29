import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'cyber';
  }
>(({ className, value, variant = 'default', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2.5 w-full overflow-hidden rounded-full",
      variant === 'cyber' ? "cyber-progress bg-[hsl(var(--muted)/0.3)] border border-[hsl(185_100%_50%/0.2)]" : "bg-muted/50",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
        variant === 'default' && "bg-gradient-to-r from-primary to-[hsl(250_80%_60%)] shadow-[0_0_12px_hsl(210_100%_55%/0.5)]",
        variant === 'success' && "bg-gradient-to-r from-success to-[hsl(180_70%_45%)] shadow-[0_0_12px_hsl(152_70%_42%/0.5)]",
        variant === 'warning' && "bg-gradient-to-r from-warning to-[hsl(30_90%_50%)] shadow-[0_0_12px_hsl(42_95%_52%/0.5)]",
        variant === 'danger' && "bg-gradient-to-r from-destructive to-[hsl(330_80%_50%)] shadow-[0_0_12px_hsl(0_85%_55%/0.5)]",
        variant === 'cyber' && "cyber-progress-indicator bg-gradient-to-r from-[hsl(185_100%_50%)] to-[hsl(270_100%_65%)] shadow-[0_0_20px_hsl(185_100%_50%/0.5)]",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
