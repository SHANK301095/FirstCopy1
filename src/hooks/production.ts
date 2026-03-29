/**
 * Production Hooks Index
 * Central export for all production-grade hooks
 */

// Core hooks
export { useOptimisticUpdate, useOptimisticList } from './useOptimisticUpdate';
export { useSmartPreload } from './useSmartPreload';
export { useConfirmation } from './useConfirmation';
export { useCopyToClipboard } from './useCopyToClipboard';
export { useKeyboardShortcuts, getShortcutDisplay } from './useKeyboardShortcuts';
export { useLocalStorage, useSessionStorage } from './useStorage';
export { useAppInit } from './useAppInit';
export { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

// Data hooks
export { usePremiumStatus, invalidatePremiumCache } from './usePremiumStatus';
export { usePrefetch } from './usePrefetch';
export { useNetworkStatus } from './useNetworkStatus';

// UI hooks
export { useDebouncedValue } from './useDebouncedValue';
export { useCountUp } from './useCountUp';
export { useLazyLoad } from './useLazyLoad';
export { useIsMobile } from './use-mobile';
