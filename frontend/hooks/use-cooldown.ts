import { useState, useEffect, useCallback } from 'react';

interface CooldownState {
  /** Whether the user is currently on cooldown */
  isOnCooldown: boolean;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Formatted time remaining (e.g., "4m 32s") */
  remainingFormatted: string;
}

/**
 * Hook to track pixel placement cooldown
 */
export function useCooldown() {
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [state, setState] = useState<CooldownState>({
    isOnCooldown: false,
    remainingMs: 0,
    remainingFormatted: '',
  });

  /**
   * Start the cooldown timer
   * @param durationMs - Duration in milliseconds
   */
  const startCooldown = useCallback((durationMs: number) => {
    const endTime = Date.now() + durationMs;
    setCooldownEndTime(endTime);
  }, []);

  /**
   * Clear the cooldown
   */
  const clearCooldown = useCallback(() => {
    setCooldownEndTime(null);
  }, []);

  /**
   * Update remaining time every second
   */
  useEffect(() => {
    if (!cooldownEndTime) {
      setState({
        isOnCooldown: false,
        remainingMs: 0,
        remainingFormatted: '',
      });
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, cooldownEndTime - now);

      if (remaining === 0) {
        setCooldownEndTime(null);
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.ceil((remaining % 60000) / 1000);

      setState({
        isOnCooldown: true,
        remainingMs: remaining,
        remainingFormatted: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
      });
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [cooldownEndTime]);

  return {
    ...state,
    startCooldown,
    clearCooldown,
  };
}
