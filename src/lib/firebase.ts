/**
 * Firebase client SDK initialization (Web).
 *
 * Used as the identity provider for login, signup, Google sign-in,
 * email verification, and password reset. The resulting ID token is
 * exchanged with our Express backend at POST /api/auth/firebase to
 * issue/refresh the existing CookMate session JWT.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBcAr3W7GY6xIjIK5ciJ11CTItpGFYZ4Qg',
  authDomain: 'cookmate-9272d.firebaseapp.com',
  projectId: 'cookmate-9272d',
  storageBucket: 'cookmate-9272d.firebasestorage.app',
  messagingSenderId: '878930590445',
  appId: '1:878930590445:web:b1d3529433bad0ee54eae4',
  measurementId: 'G-B2WW35D9B9',
};

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth: Auth = getAuth(firebaseApp);

// Keep the Firebase session across reloads (default is also local, but be explicit).
setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
  /* storage unavailable in some private/iframe contexts — ignore */
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { firebaseConfig };
