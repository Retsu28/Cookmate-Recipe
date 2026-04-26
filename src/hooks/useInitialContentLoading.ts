import { useEffect, useState } from 'react';

export function useInitialContentLoading(duration = 650) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), duration);

    return () => window.clearTimeout(timer);
  }, [duration]);

  return isLoading;
}
