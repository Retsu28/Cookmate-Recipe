// Network status provider for offline-first mode.
// Purely additive: exposes a global `isOnline` via React context.
// Existing code keeps working whether or not it consumes `useNetwork()`.

import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const NetworkContext = createContext({
  isOnline: true,
  isInternetReachable: null,
  type: null,
});

export function NetworkProvider({ children }) {
  const [state, setState] = useState({
    isOnline: true,
    isInternetReachable: null,
    type: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const update = (info) => {
      if (!mountedRef.current || !info) return;
      // Treat "reachable unknown" (null) as online to avoid false offline flashes
      // on first boot; only mark offline when NetInfo is confident.
      const reachable = info.isInternetReachable;
      const connected = info.isConnected === true;
      const isOnline = connected && reachable !== false;
      setState({
        isOnline,
        isInternetReachable: reachable,
        type: info.type || null,
      });
    };

    NetInfo.fetch().then(update).catch(() => {});
    const unsubscribe = NetInfo.addEventListener(update);

    return () => {
      mountedRef.current = false;
      unsubscribe && unsubscribe();
    };
  }, []);

  return (
    <NetworkContext.Provider value={state}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

// Module-level snapshot so non-React code (API wrappers, sync queue) can check
// connectivity without needing a hook. Kept in sync via NetInfo listener below.
let _latest = { isOnline: true, isInternetReachable: null, type: null };

NetInfo.addEventListener((info) => {
  if (!info) return;
  const connected = info.isConnected === true;
  const reachable = info.isInternetReachable;
  _latest = {
    isOnline: connected && reachable !== false,
    isInternetReachable: reachable,
    type: info.type || null,
  };
});

NetInfo.fetch()
  .then((info) => {
    if (!info) return;
    const connected = info.isConnected === true;
    const reachable = info.isInternetReachable;
    _latest = {
      isOnline: connected && reachable !== false,
      isInternetReachable: reachable,
      type: info.type || null,
    };
  })
  .catch(() => {});

export function getNetworkSnapshot() {
  return _latest;
}

export function isOnlineNow() {
  return _latest.isOnline;
}

export const OFFLINE_MESSAGE = 'This feature requires an internet connection.';
