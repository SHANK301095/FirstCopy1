/**
 * Premium Page Title Component
 * Clean, elegant heading with subtle entrance animation
 */

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
  animated?: boolean;
}

export function PageTitle({ title, subtitle, className, animated = true }: PageTitleProps) {
  if (animated) {
    return (
      <motion.div 
        className={cn("space-y-1.5", className)}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.h1 
          className="text-2xl md:text-3xl font-bold tracking-tight text-foreground"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p 
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
