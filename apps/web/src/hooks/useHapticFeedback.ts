/**
 * Hook for haptic feedback using the Vibration API.
 * Provides touch feedback for mobile interactions.
 *
 * Note: iOS Safari does not support navigator.vibrate, so all calls
 * are wrapped in feature detection to prevent errors.
 */
export function useHapticFeedback() {
  /**
   * Light tap feedback (10ms) - for nav item taps, buttons
   */
  const lightTap = () => {
    // Check API availability (iOS Safari doesn't support)
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms vibration per D-14
    }
  };

  /**
   * Medium tap feedback (20ms) - for confirmations, toggles
   */
  const mediumTap = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };

  /**
   * Success feedback pattern - for completed actions
   * Pattern: vibrate-pause-vibrate (10ms, 50ms pause, 10ms)
   */
  const successPattern = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]); // vibrate-pause-vibrate
    }
  };

  return { lightTap, mediumTap, successPattern };
}
