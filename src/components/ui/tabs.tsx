import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'default' | 'cyber';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-xl p-1.5 text-muted-foreground",
      variant === 'default' && "bg-muted/50 backdrop-blur-sm border border-border/40",
      variant === 'cyber' && "cyber-tabs-list",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: 'default' | 'cyber';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-300",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      variant === 'default' && [
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
        "data-[state=active]:border data-[state=active]:border-border/60",
        "hover:text-foreground/80",
      ],
      variant === 'cyber' && [
        "cyber-tabs-trigger",
        "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(185_100%_50%/0.2)] data-[state=active]:to-[hsl(270_100%_65%/0.1)]",
        "data-[state=active]:border data-[state=active]:border-[hsl(185_100%_50%/0.4)]",
        "data-[state=active]:text-[hsl(185_100%_70%)]",
        "data-[state=active]:shadow-[0_0_15px_hsl(185_100%_50%/0.2)]",
        "hover:text-foreground/80",
      ],
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
