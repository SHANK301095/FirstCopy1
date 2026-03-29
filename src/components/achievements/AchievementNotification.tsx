/**
 * Achievement Notification Component
 * Displays a futuristic toast when achievements are unlocked
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X } from 'lucide-react';
import { useAchievementStore, type AchievementNotification as AchievementNotificationType } from '@/store/achievementStore';
import { cn } from '@/lib/utils';

const rarityColors = {
  common: 'from-slate-400 to-slate-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-amber-600',
};

const rarityGlow = {
  common: 'shadow-slate-500/30',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/60',
};

function AchievementToast({ notification, onDismiss }: { 
  notification: AchievementNotificationType; 
  onDismiss: () => void;
}) {
  const { achievement } = notification;
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/50',
        'bg-card/95 backdrop-blur-xl p-4',
        `shadow-lg ${rarityGlow[achievement.rarity]}`
      )}
    >
      {/* Animated background glow */}
      <motion.div
        className={cn(
          'absolute inset-0 opacity-20 bg-gradient-to-r',
          rarityColors[achievement.rarity]
        )}
        animate={{ 
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Sparkle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary"
            initial={{ 
              x: '50%', 
              y: '50%',
              scale: 0,
              opacity: 0
            }}
            animate={{ 
              x: `${20 + i * 12}%`,
              y: `${30 + (i % 3) * 20}%`,
              scale: [0, 1, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.1,
              repeat: Infinity,
              repeatDelay: 1
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {/* Icon */}
        <motion.div
          className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center',
            'bg-gradient-to-br',
            rarityColors[achievement.rarity]
          )}
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Trophy className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              Achievement Unlocked!
            </span>
          </div>
          <h4 className="font-bold text-foreground">{achievement.name}</h4>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
              'bg-gradient-to-r text-white',
              rarityColors[achievement.rarity]
            )}>
              {achievement.rarity}
            </div>
            <div className="flex items-center gap-1 text-xs text-primary">
              <Star className="w-3 h-3" />
              +{achievement.xp} XP
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

export function AchievementNotificationContainer() {
  const { notifications, dismissNotification } = useAchievementStore();
  
  // Only show the most recent notification
  const activeNotification = notifications[notifications.length - 1];

  return (
    <div className="fixed top-4 right-4 z-[300] max-w-sm w-full">
      <AnimatePresence mode="wait">
        {activeNotification && (
          <AchievementToast
            key={activeNotification.id}
            notification={activeNotification}
            onDismiss={() => dismissNotification(activeNotification.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
