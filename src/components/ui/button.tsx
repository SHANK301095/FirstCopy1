/**
 * Premium Button Component
 * Clean, minimal with smooth micro-interactions
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useSoundEffectsStore } from "@/store/soundEffectsStore";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary - solid fill with subtle shadow
        default: 
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:-translate-y-px",
        // Destructive - red solid
        destructive: 
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Outline - clean bordered
        outline: 
          "border border-border/60 bg-background hover:bg-muted/50 hover:border-primary/30",
        // Secondary - muted fill
        secondary: 
          "bg-muted text-foreground hover:bg-muted/80",
        // Ghost - transparent with hover
        ghost: 
          "hover:bg-muted/60 hover:text-foreground",
        // Link - underline on hover
        link: 
          "text-primary underline-offset-4 hover:underline hover:translate-y-0 active:scale-100",
        // Success - green solid
        success: 
          "bg-profit text-white hover:bg-profit/90",
        // Premium - gradient accent
        premium:
          "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:shadow-md hover:-translate-y-px",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        xl: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  enableSound?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, enableSound = true, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const playClick = useSoundEffectsStore((state) => state.playClick);
    
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (enableSound) {
          playClick();
        }
        onClick?.(e);
      },
      [enableSound, playClick, onClick]
    );
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        onClick={asChild ? onClick : handleClick}
        {...props} 
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
