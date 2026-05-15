import { useState, useCallback, useEffect, useRef } from 'react';

export interface RateLimitInfo {
  locked: boolean;
  attemptsRemaining: number;
  maxAttempts: number;
  currentAttempts: number;
  warning: boolean;
  minutesLeft?: number;
  secondsLeft?: number;
  lockoutMinutes?: number;
  retryAfter?: number;
}

export interface RateLimitState {
  rateLimit: RateLimitInfo | null;
  isLocked: boolean;
  countdown: number;
  resetRateLimit: () => void;
  updateFromError: (error: any) => void;
}

export function useRateLimit(): RateLimitState {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start countdown when locked
  useEffect(() => {
    if (rateLimit?.locked && rateLimit.secondsLeft && rateLimit.secondsLeft > 0) {
      setCountdown(rateLimit.secondsLeft);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Auto-reset when countdown reaches 0
            setRateLimit(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [rateLimit?.locked, rateLimit?.secondsLeft]);

  const resetRateLimit = useCallback(() => {
    setRateLimit(null);
    setCountdown(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateFromError = useCallback((error: any) => {
    // Check if error has rate limit info from backend
    if (error?.data?.rateLimit) {
      setRateLimit(error.data.rateLimit);
    } else if (error?.rateLimit) {
      setRateLimit(error.rateLimit);
    } else if (error?.response?.data?.rateLimit) {
      setRateLimit(error.response.data.rateLimit);
    }
  }, []);

  const isLocked = Boolean(rateLimit?.locked);

  return {
    rateLimit,
    isLocked,
    countdown,
    resetRateLimit,
    updateFromError,
  };
}

// Format countdown to MM:SS
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
