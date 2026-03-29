/**
 * Premium Input Component
 * Clean, minimal style with smooth focus transitions
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-xl border bg-background text-base ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default:
          "border-border/50 bg-muted/30 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:bg-background hover:border-border hover:bg-muted/40",
        minimal:
          "border-transparent bg-muted/40 focus-visible:bg-muted/60 focus-visible:ring-0 hover:bg-muted/50",
        outline:
          "border-border bg-transparent focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10",
        filled:
          "border-transparent bg-muted focus-visible:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/10",
      },
      inputSize: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
