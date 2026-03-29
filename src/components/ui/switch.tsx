import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: "sm" | "default";
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = "sm", checked, ...props }, ref) => {
  const isChecked = checked ?? props.defaultChecked ?? false;
  
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full overflow-hidden",
        "border border-border/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Size variants
        size === "sm" ? "h-4 w-7" : "h-5 w-9",
        className,
      )}
      checked={checked}
      {...props}
      ref={ref}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={{
          backgroundColor: isChecked 
            ? "hsl(var(--primary))" 
            : "hsl(var(--muted) / 0.6)",
          boxShadow: isChecked 
            ? "0 0 12px hsl(var(--primary) / 0.4)" 
            : "none",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      
      {/* Animated thumb */}
      <motion.span
        className={cn(
          "relative z-10 block rounded-full bg-white shadow-md",
          size === "sm" ? "h-3 w-3" : "h-4 w-4",
        )}
        initial={false}
        animate={{
          x: isChecked 
            ? (size === "sm" ? 12 : 16) 
            : 2,
          scale: isChecked ? 1 : 0.95,
          boxShadow: isChecked 
            ? "0 0 8px rgba(255,255,255,0.5)" 
            : "0 1px 3px rgba(0,0,0,0.2)",
        }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
