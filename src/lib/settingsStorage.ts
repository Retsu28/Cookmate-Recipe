export function readStoredSettings<T extends object>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function writeStoredSettings<T extends object>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(key, JSON.stringify(value));
}
