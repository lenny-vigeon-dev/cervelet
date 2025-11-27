import { useState, useEffect, useCallback } from 'react';

interface CooldownState {
  /** Whether the user is currently on cooldown */
  isOnCooldown: boolean;
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Formatted time remaining (e.g., "4m 32s") */
  remainingFormatted: string;
}

const COOLDOWN_STORAGE_KEY = 'pixel-cooldown-end-time';

/**
 * Hook to track pixel placement cooldown with localStorage persistence
 */
export function useCooldown() {
  // Initialize from localStorage
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!stored) return null;

    const endTime = parseInt(stored, 10);
    // Check if cooldown has already expired
    if (endTime <= Date.now()) {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      return null;
    }

    return endTime;
  });

  const [state, setState] = useState<CooldownState>({
    isOnCooldown: false,
    remainingMs: 0,
    remainingFormatted: '',
  });

  /**
   * Start the cooldown timer and persist to localStorage
   * @param durationMs - Duration in milliseconds
   */
  const startCooldown = useCallback((durationMs: number) => {
    const endTime = Date.now() + durationMs;
    setCooldownEndTime(endTime);
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, endTime.toString());
    }
  }, []);

  /**
   * Clear the cooldown and remove from localStorage
   */
  const clearCooldown = useCallback(() => {
    setCooldownEndTime(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    }
  }, []);

  /**
   * Update remaining time every second and clear localStorage when expired
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
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
