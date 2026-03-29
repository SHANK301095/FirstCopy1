/**
 * Framer Motion Page Transitions
 * Smooth animated transitions between pages
 */

import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface MotionPageProps {
  children: ReactNode;
  className?: string;
}

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
  },
};

const pageTransition: Transition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
};

// Slide variants for different directions
const createSlideVariants = (direction: 'left' | 'right' | 'up' | 'down') => {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const initialValue = direction === 'left' || direction === 'up' ? -50 : 50;
  const exitValue = direction === 'left' || direction === 'up' ? 50 : -50;
  
  return {
    initial: { opacity: 0, [axis]: initialValue },
    enter: { opacity: 1, [axis]: 0 },
    exit: { opacity: 0, [axis]: exitValue },
  };
};

// Futuristic glitch effect variants
const glitchVariants = {
  initial: {
    opacity: 0,
    filter: 'blur(10px)',
    clipPath: 'inset(100% 0 0 0)',
  },
  enter: {
    opacity: 1,
    filter: 'blur(0px)',
    clipPath: 'inset(0% 0 0 0)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(5px)',
    clipPath: 'inset(0 0 100% 0)',
  },
};

const glitchTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
};

// Neural fade - with scan line effect
const neuralVariants = {
  initial: {
    opacity: 0,
    y: 30,
  },
  enter: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

const neuralTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
};

// Main motion page component
export function MotionPage({ children, className }: MotionPageProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Slide page transition
export function MotionSlidePage({ 
  children, 
  className,
  direction = 'left'
}: MotionPageProps & { direction?: 'left' | 'right' | 'up' | 'down' }) {
  const location = useLocation();
  const variants = createSlideVariants(direction);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Futuristic glitch transition
export function MotionGlitchPage({ children, className }: MotionPageProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={glitchVariants}
        transition={glitchTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Neural network style transition
export function MotionNeuralPage({ children, className }: MotionPageProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={neuralVariants}
        transition={neuralTransition}
        className={className}
      >
        {/* Scan line overlay during transition */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none"
          style={{ top: '10%', originX: 0 }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Stagger children animation wrapper
export function MotionStagger({ children, className }: MotionPageProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={{
        initial: {},
        enter: {},
        exit: {},
      }}
      transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function MotionItem({ children, className }: MotionPageProps) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 20 },
        enter: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade in animation
export function MotionFadeIn({ 
  children, 
  className,
  delay = 0,
  duration = 0.3 
}: MotionPageProps & { delay?: number; duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation
export function MotionScaleIn({ 
  children, 
  className,
  delay = 0 
}: MotionPageProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Hover glow effect
export function MotionGlow({ children, className }: MotionPageProps) {
  return (
    <motion.div
      whileHover={{ 
        boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
        scale: 1.02,
      }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Tap effect
export function MotionTap({ children, className }: MotionPageProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
