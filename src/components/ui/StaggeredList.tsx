/**
 * StaggeredList - Reusable staggered entrance animation for list items
 * Uses framer-motion for smooth staggered animations
 */

import { motion, type Variants } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Smooth easing curve
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Container variants for staggered children
const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

// Item variants with subtle entrance animation
const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12,
    scale: 0.98,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: smoothEase,
    },
  },
};

// Alternative: slide from left
const slideVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -16,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.25,
      ease: smoothEase,
    },
  },
};

// Alternative: scale up
const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.25,
      ease: smoothEase,
    },
  },
};

interface StaggeredListProps {
  children: ReactNode;
  className?: string;
  /** Delay before animations start (in seconds) */
  delay?: number;
  /** Time between each item animation (in seconds) */
  stagger?: number;
}

interface StaggeredItemProps {
  children: ReactNode;
  className?: string;
  /** Animation variant: 'fade' (default), 'slide', 'scale' */
  variant?: 'fade' | 'slide' | 'scale';
}

/**
 * Container for staggered list animations
 * Wrap your list items in StaggeredItem components
 */
export function StaggeredList({ 
  children, 
  className,
  delay = 0.05,
  stagger = 0.06,
}: StaggeredListProps) {
  const customContainerVariants: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={customContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual staggered list item
 * Must be a direct child of StaggeredList
 */
export function StaggeredItem({ 
  children, 
  className,
  variant = 'fade',
}: StaggeredItemProps) {
  const variants = variant === 'slide' 
    ? slideVariants 
    : variant === 'scale' 
      ? scaleVariants 
      : itemVariants;

  return (
    <motion.div
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Convenience component for grid layouts with staggered animation
 */
interface StaggeredGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: 2 | 3 | 4 | 6;
  delay?: number;
  stagger?: number;
}

export function StaggeredGrid({
  children,
  className,
  columns = 3,
  gap = 4,
  delay = 0.05,
  stagger = 0.06,
}: StaggeredGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gapClasses = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
  };

  return (
    <StaggeredList
      className={cn('grid', gridClasses[columns], gapClasses[gap], className)}
      delay={delay}
      stagger={stagger}
    >
      {children}
    </StaggeredList>
  );
}

// Export variants for custom usage
export { containerVariants, itemVariants, slideVariants, scaleVariants };
