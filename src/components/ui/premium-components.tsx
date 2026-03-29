/**
 * Premium Minimal UI Components
 * Apple-style elegance with clean, spacious design
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight, Check, X } from "lucide-react";

// ===== PREMIUM CARD =====
interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

export const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const paddingClasses = {
      none: "",
      sm: "p-3",
      md: "p-4 sm:p-5",
      lg: "p-5 sm:p-6",
    };

    const variantClasses = {
      default: "bg-card border border-border/50 shadow-sm",
      elevated: "bg-card border border-border/30 shadow-lg shadow-black/5",
      glass: "bg-card/60 backdrop-blur-xl border border-border/30",
      interactive: "bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 cursor-pointer active:scale-[0.99] transition-all duration-200",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all duration-200",
          variantClasses[variant],
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PremiumCard.displayName = "PremiumCard";

// ===== PREMIUM LIST ITEM =====
interface PremiumListItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  destructive?: boolean;
  className?: string;
}

export function PremiumListItem({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  showArrow = false,
  destructive = false,
  className,
}: PremiumListItemProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 min-h-[56px]",
        "transition-all duration-150 touch-manipulation",
        isClickable && "cursor-pointer active:bg-accent/60 hover:bg-accent/40",
        destructive && "text-destructive",
        className
      )}
    >
      {icon && (
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center",
          "w-9 h-9 rounded-xl bg-primary/10",
          destructive && "bg-destructive/10"
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-[15px] leading-tight truncate",
          destructive && "text-destructive"
        )}>
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {trailing && (
        <div className="flex-shrink-0 text-muted-foreground">
          {trailing}
        </div>
      )}
      {showArrow && isClickable && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
      )}
    </div>
  );
}

// ===== PREMIUM SECTION =====
interface PremiumSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function PremiumSection({ title, children, className }: PremiumSectionProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-3">
          {title}
        </h3>
      )}
      <div className="rounded-2xl bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
        {children}
      </div>
    </div>
  );
}

// ===== PREMIUM STAT =====
interface PremiumStatProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function PremiumStat({
  label,
  value,
  trend,
  trendValue,
  icon,
  className,
}: PremiumStatProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {trend && trendValue && (
          <span className={cn(
            "text-sm font-medium",
            trend === "up" && "text-profit",
            trend === "down" && "text-loss",
            trend === "neutral" && "text-muted-foreground"
          )}>
            {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ===== PREMIUM CHIP =====
interface PremiumChipProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PremiumChip({
  children,
  variant = "default",
  size = "md",
  selected = false,
  onClick,
  className,
}: PremiumChipProps) {
  const variantClasses = {
    default: selected 
      ? "bg-foreground text-background border-foreground" 
      : "bg-muted/60 border-border/50 hover:bg-muted",
    primary: selected
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
    success: "bg-profit/10 text-profit border-profit/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    danger: "bg-loss/10 text-loss border-loss/30",
  };

  const sizeClasses = {
    sm: "h-7 px-2.5 text-xs",
    md: "h-8 px-3.5 text-sm",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border font-medium",
        "transition-all duration-150 touch-manipulation",
        "active:scale-95",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  );
}

// ===== PREMIUM TOGGLE =====
interface PremiumToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function PremiumToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: PremiumToggleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-1", className)}>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <p className="font-medium text-[15px]">{label}</p>}
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full",
          "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow-sm",
            checked ? "ml-6" : "ml-1"
          )}
        />
      </button>
    </div>
  );
}

// ===== PREMIUM DIVIDER =====
interface PremiumDividerProps {
  label?: string;
  className?: string;
}

export function PremiumDivider({ label, className }: PremiumDividerProps) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-4 py-4", className)}>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    );
  }
  return <div className={cn("h-px bg-border/50 my-4", className)} />;
}

// ===== PREMIUM EMPTY STATE =====
interface PremiumEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PremiumEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PremiumEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground/40">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ===== PREMIUM SKELETON =====
interface PremiumSkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function PremiumSkeleton({
  className,
  variant = "rectangular",
  width,
  height,
}: PremiumSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted/60",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-lg",
        variant === "text" && "rounded h-4",
        className
      )}
      style={{ width, height }}
    />
  );
}

// ===== ANIMATED LIST =====
interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({ children, className, staggerDelay = 50 }: AnimatedListProps) {
  return (
    <motion.div 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay / 1000,
          },
        },
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
              }
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ===== PREMIUM BOTTOM SHEET HANDLE =====
export function BottomSheetHandle() {
  return (
    <div className="flex justify-center py-3">
      <div className="w-10 h-1 rounded-full bg-border" />
    </div>
  );
}

// ===== PREMIUM SUCCESS ANIMATION =====
interface SuccessCheckmarkProps {
  show: boolean;
  className?: string;
}

export function SuccessCheckmark({ show, className }: SuccessCheckmarkProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "w-12 h-12 rounded-full bg-profit/20 flex items-center justify-center",
            className
          )}
        >
          <Check className="h-6 w-6 text-profit" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
