/**
 * Achievement Store - Real-time achievement tracking
 * Tracks user actions and unlocks achievements based on actual usage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { secureLogger } from '@/lib/secureLogger';

export type AchievementCategory = 'onboarding' | 'trading' | 'learning' | 'consistency' | 'mastery';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xp: number;
  maxProgress: number;
  iconName: string;
}

export interface UserAchievement {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AchievementNotification {
  id: string;
  achievement: Achievement;
  timestamp: number;
}

// Achievement definitions - static list of all possible achievements
export const ACHIEVEMENTS: Achievement[] = [
  // Onboarding achievements
  { id: 'first_login', name: 'Welcome Aboard', description: 'Log in for the first time', category: 'onboarding', rarity: 'common', xp: 25, maxProgress: 1, iconName: 'LogIn' },
  { id: 'complete_tour', name: 'Tour Guide', description: 'Complete the onboarding tour', category: 'onboarding', rarity: 'common', xp: 50, maxProgress: 1, iconName: 'Map' },
  { id: 'first_data_import', name: 'Data Pioneer', description: 'Import your first dataset', category: 'onboarding', rarity: 'common', xp: 75, maxProgress: 1, iconName: 'Database' },
  { id: 'first_strategy', name: 'Strategy Novice', description: 'Create your first strategy', category: 'onboarding', rarity: 'common', xp: 75, maxProgress: 1, iconName: 'Code' },
  
  // Trading achievements
  { id: 'first_backtest', name: 'First Steps', description: 'Run your first backtest', category: 'trading', rarity: 'common', xp: 50, maxProgress: 1, iconName: 'Zap' },
  { id: 'backtest_10', name: 'Getting Warmed Up', description: 'Run 10 backtests', category: 'trading', rarity: 'common', xp: 100, maxProgress: 10, iconName: 'TrendingUp' },
  { id: 'backtest_50', name: 'Backtest Enthusiast', description: 'Run 50 backtests', category: 'trading', rarity: 'rare', xp: 300, maxProgress: 50, iconName: 'BarChart' },
  { id: 'backtest_100', name: 'Backtest Warrior', description: 'Run 100 backtests', category: 'trading', rarity: 'epic', xp: 500, maxProgress: 100, iconName: 'Shield' },
  { id: 'backtest_500', name: 'Backtest Legend', description: 'Run 500 backtests', category: 'trading', rarity: 'legendary', xp: 2000, maxProgress: 500, iconName: 'Crown' },
  { id: 'profitable_strat', name: 'Green Machine', description: 'Create a profitable strategy', category: 'trading', rarity: 'rare', xp: 200, maxProgress: 1, iconName: 'TrendingUp' },
  { id: 'sharpe_2', name: 'Sharp Shooter', description: 'Achieve Sharpe ratio > 2.0', category: 'trading', rarity: 'epic', xp: 400, maxProgress: 1, iconName: 'Target' },
  
  // Learning achievements
  { id: 'view_guide', name: 'Reader', description: 'View the app guide', category: 'learning', rarity: 'common', xp: 25, maxProgress: 1, iconName: 'BookOpen' },
  { id: 'view_tutorials', name: 'Student', description: 'Visit the tutorials page', category: 'learning', rarity: 'common', xp: 50, maxProgress: 1, iconName: 'GraduationCap' },
  { id: 'explore_analytics', name: 'Analyst', description: 'Explore the analytics page', category: 'learning', rarity: 'common', xp: 50, maxProgress: 1, iconName: 'BarChart3' },
  
  // Consistency achievements
  { id: 'streak_3', name: 'Consistent', description: '3-day usage streak', category: 'consistency', rarity: 'common', xp: 75, maxProgress: 3, iconName: 'Flame' },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day usage streak', category: 'consistency', rarity: 'rare', xp: 200, maxProgress: 7, iconName: 'Flame' },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day usage streak', category: 'consistency', rarity: 'epic', xp: 1000, maxProgress: 30, iconName: 'Flame' },
  
  // Mastery achievements
  { id: 'use_optimizer', name: 'Parameter Hunter', description: 'Use the strategy optimizer', category: 'mastery', rarity: 'rare', xp: 150, maxProgress: 1, iconName: 'Target' },
  { id: 'use_walkforward', name: 'Walk the Walk', description: 'Complete walk-forward analysis', category: 'mastery', rarity: 'rare', xp: 200, maxProgress: 1, iconName: 'TrendingUp' },
  { id: 'use_montecarlo', name: 'Fortune Teller', description: 'Run Monte Carlo simulation', category: 'mastery', rarity: 'rare', xp: 200, maxProgress: 1, iconName: 'Star' },
  { id: 'use_portfolio', name: 'Diversified', description: 'Use the portfolio builder', category: 'mastery', rarity: 'epic', xp: 300, maxProgress: 1, iconName: 'Users' },
  { id: 'power_user', name: 'Power User', description: 'Use 10 different features', category: 'mastery', rarity: 'legendary', xp: 1000, maxProgress: 10, iconName: 'Crown' },
];

interface AchievementState {
  userAchievements: Record<string, UserAchievement>;
  totalXP: number;
  currentStreak: number;
  lastActiveDate: string | null;
  featuresUsed: string[];
  notifications: AchievementNotification[];
  
  // Actions
  trackAction: (actionType: string, metadata?: Record<string, unknown>) => void;
  incrementProgress: (achievementId: string, amount?: number) => void;
  unlockAchievement: (achievementId: string) => void;
  updateStreak: () => void;
  dismissNotification: (notificationId: string) => void;
  getAchievement: (achievementId: string) => Achievement | undefined;
  getUserAchievement: (achievementId: string) => UserAchievement;
  getLevel: () => number;
  getXPForNextLevel: () => number;
  resetAchievements: () => void;
}

const XP_PER_LEVEL = 250;

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      userAchievements: {},
      totalXP: 0,
      currentStreak: 0,
      lastActiveDate: null,
      featuresUsed: [],
      notifications: [],

      getAchievement: (achievementId: string) => {
        return ACHIEVEMENTS.find(a => a.id === achievementId);
      },

      getUserAchievement: (achievementId: string) => {
        const existing = get().userAchievements[achievementId];
        if (existing) return existing;
        return {
          achievementId,
          progress: 0,
          unlocked: false,
        };
      },

      getLevel: () => {
        return Math.floor(get().totalXP / XP_PER_LEVEL) + 1;
      },

      getXPForNextLevel: () => {
        const level = get().getLevel();
        return level * XP_PER_LEVEL - get().totalXP;
      },

      trackAction: (actionType: string, metadata?: Record<string, unknown>) => {
        const state = get();
        
        // Update streak
        state.updateStreak();
        
        // Track feature usage for power_user achievement
        if (!state.featuresUsed.includes(actionType)) {
          set((s) => ({
            featuresUsed: [...s.featuresUsed, actionType],
          }));
          state.incrementProgress('power_user', 1);
        }

        // Map actions to achievements
        switch (actionType) {
          case 'login':
            state.incrementProgress('first_login', 1);
            break;
          case 'complete_tour':
            state.incrementProgress('complete_tour', 1);
            break;
          case 'import_data':
            state.incrementProgress('first_data_import', 1);
            break;
          case 'create_strategy':
            state.incrementProgress('first_strategy', 1);
            break;
          case 'run_backtest':
            state.incrementProgress('first_backtest', 1);
            state.incrementProgress('backtest_10', 1);
            state.incrementProgress('backtest_50', 1);
            state.incrementProgress('backtest_100', 1);
            state.incrementProgress('backtest_500', 1);
            
            // Check for profitable strategy
            if (metadata?.netProfit && (metadata.netProfit as number) > 0) {
              state.incrementProgress('profitable_strat', 1);
            }
            // Check for high Sharpe ratio
            if (metadata?.sharpeRatio && (metadata.sharpeRatio as number) > 2) {
              state.incrementProgress('sharpe_2', 1);
            }
            break;
          case 'view_guide':
            state.incrementProgress('view_guide', 1);
            break;
          case 'view_tutorials':
            state.incrementProgress('view_tutorials', 1);
            break;
          case 'view_analytics':
            state.incrementProgress('explore_analytics', 1);
            break;
          case 'use_optimizer':
            state.incrementProgress('use_optimizer', 1);
            break;
          case 'use_walkforward':
            state.incrementProgress('use_walkforward', 1);
            break;
          case 'use_montecarlo':
            state.incrementProgress('use_montecarlo', 1);
            break;
          case 'use_portfolio':
            state.incrementProgress('use_portfolio', 1);
            break;
        }

        secureLogger.debug('achievements', `Tracked action: ${actionType}`);
      },

      incrementProgress: (achievementId: string, amount = 1) => {
        const achievement = get().getAchievement(achievementId);
        if (!achievement) return;

        const current = get().getUserAchievement(achievementId);
        if (current.unlocked) return;

        const newProgress = Math.min(current.progress + amount, achievement.maxProgress);
        
        set((state) => ({
          userAchievements: {
            ...state.userAchievements,
            [achievementId]: {
              ...current,
              progress: newProgress,
            },
          },
        }));

        // Check if achievement should be unlocked
        if (newProgress >= achievement.maxProgress) {
          get().unlockAchievement(achievementId);
        }
      },

      unlockAchievement: (achievementId: string) => {
        const achievement = get().getAchievement(achievementId);
        if (!achievement) return;

        const current = get().getUserAchievement(achievementId);
        if (current.unlocked) return;

        const now = new Date().toISOString();
        
        set((state) => ({
          userAchievements: {
            ...state.userAchievements,
            [achievementId]: {
              achievementId,
              progress: achievement.maxProgress,
              unlocked: true,
              unlockedAt: now,
            },
          },
          totalXP: state.totalXP + achievement.xp,
          notifications: [
            ...state.notifications,
            {
              id: `${achievementId}-${Date.now()}`,
              achievement,
              timestamp: Date.now(),
            },
          ],
        }));

        secureLogger.info('achievements', `Achievement unlocked: ${achievement.name}`);
      },

      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const lastActive = get().lastActiveDate;
        
        if (lastActive === today) {
          return; // Already active today
        }

        let newStreak = get().currentStreak;
        
        if (lastActive) {
          const lastDate = new Date(lastActive);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1; // Reset streak
          }
        } else {
          newStreak = 1;
        }

        set({
          currentStreak: newStreak,
          lastActiveDate: today,
        });

        // Check streak achievements
        if (newStreak >= 3) get().incrementProgress('streak_3', 1);
        if (newStreak >= 7) get().incrementProgress('streak_7', 1);
        if (newStreak >= 30) get().incrementProgress('streak_30', 1);
      },

      dismissNotification: (notificationId: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== notificationId),
        }));
      },

      resetAchievements: () => {
        set({
          userAchievements: {},
          totalXP: 0,
          currentStreak: 0,
          lastActiveDate: null,
          featuresUsed: [],
          notifications: [],
        });
      },
    }),
    {
      name: 'mmc-achievements',
      partialize: (state) => ({
        userAchievements: state.userAchievements,
        totalXP: state.totalXP,
        currentStreak: state.currentStreak,
        lastActiveDate: state.lastActiveDate,
        featuresUsed: state.featuresUsed,
      }),
    }
  )
);
