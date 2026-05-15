import { useState, useCallback, useEffect, useRef } from 'react';

export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

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

  const updateFromError = useCallback((err) => {
    // Check if error has rate limit info from backend
    const data = err?.response?.data || err?.data;
    if (data?.rateLimit) {
      setRateLimit(data.rateLimit);
    } else if (err?.rateLimit) {
      setRateLimit(err.rateLimit);
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
export function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
