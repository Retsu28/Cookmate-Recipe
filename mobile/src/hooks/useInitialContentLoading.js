import { useEffect, useState } from 'react';

export default function useInitialContentLoading(duration = 650) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return isLoading;
}
