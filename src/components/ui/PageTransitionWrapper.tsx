import { ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionWrapperProps {
  children: ReactNode;
}

// Custom bezier curve for smooth feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Subtle, fast page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: smoothEase,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.15,
      ease: smoothEase,
    },
  },
};

// Alternative: Scale + fade for modals/dialogs feel
export const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: smoothEase,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: smoothEase,
    },
  },
};

// Slide from right for drill-down navigation
export const slideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: smoothEase,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.15,
      ease: smoothEase,
    },
  },
};

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for manual page animations
export function usePageTransition() {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.25, ease: smoothEase },
  };
}

// Animated page wrapper for individual pages
interface AnimatedPageProps {
  children: ReactNode;
  variant?: 'fade' | 'scale' | 'slide';
  className?: string;
}

export function AnimatedPageContent({ 
  children, 
  variant = 'fade',
  className = '' 
}: AnimatedPageProps) {
  const variants = variant === 'scale' 
    ? scaleVariants 
    : variant === 'slide' 
      ? slideVariants 
      : pageVariants;

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
