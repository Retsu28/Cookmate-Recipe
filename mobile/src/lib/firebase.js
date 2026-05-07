/**
 * Firebase client SDK initialization (Mobile / Expo).
 *
 * Uses the JS SDK (NOT @react-native-firebase) so it runs in Expo Go
 * and dev clients without needing native rebuilds. AsyncStorage is wired
 * in as the persistence layer so the Firebase session survives app reloads.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, GoogleAuthProvider } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBcAr3W7GY6xIjIK5ciJ11CTItpGFYZ4Qg',
  authDomain: 'cookmate-9272d.firebaseapp.com',
  projectId: 'cookmate-9272d',
  storageBucket: 'cookmate-9272d.firebasestorage.app',
  messagingSenderId: '878930590445',
  appId: '1:878930590445:web:b1d3529433bad0ee54eae4',
  measurementId: 'G-B2WW35D9B9',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth must run exactly once per app instance. On Fast Refresh
// it can already be initialized — fall back to getAuth() in that case.
let _auth;
try {
  _auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (_err) {
  _auth = getAuth(firebaseApp);
}

export const firebaseAuth = _auth;
export const googleProvider = new GoogleAuthProvider();
export { firebaseConfig };
