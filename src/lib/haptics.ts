/**
 * Haptic Feedback Utilities
 * Provides tactile feedback on supported devices
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  selection: 15,
  success: [15, 50, 30],
  warning: [20, 40, 20, 40],
  error: [50, 100, 50],
};

/**
 * Trigger haptic feedback if available
 */
export function hapticFeedback(style: HapticStyle = 'light'): void {
  // Check if vibration API is available
  if (!('vibrate' in navigator)) return;
  
  const pattern = HAPTIC_PATTERNS[style];
  
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silently fail if vibration not supported
  }
}

/**
 * React hook for haptic-enabled click handler
 */
export function withHaptics<T extends (...args: unknown[]) => void>(
  handler: T,
  style: HapticStyle = 'light'
): T {
  return ((...args: unknown[]) => {
    hapticFeedback(style);
    handler(...args);
  }) as T;
}

/**
 * Check if haptics are supported
 */
export function isHapticsSupported(): boolean {
  return 'vibrate' in navigator;
}
