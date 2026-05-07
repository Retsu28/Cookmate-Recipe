// Network status helpers for CookMate web offline-first mode.
// Mirrors the mobile (`mobile/src/offline/network.js`) surface so the same
// read-through helpers work in either platform.
//
// Intentionally additive: the existing `src/hooks/useOnlineStatus.ts` hook
// remains the canonical React hook for UI code. Non-React modules should call
// `isOnlineNow()` / `getNetworkSnapshot()` below.

type NetSnapshot = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
};

let _latest: NetSnapshot = {
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  isInternetReachable: null,
  type: null,
};

function update(isOnline: boolean) {
  _latest = { ..._latest, isOnline };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => update(true));
  window.addEventListener('offline', () => update(false));
}

export function getNetworkSnapshot(): NetSnapshot {
  return _latest;
}

export function isOnlineNow(): boolean {
  return _latest.isOnline;
}

export const OFFLINE_MESSAGE = 'This feature requires an internet connection.';
