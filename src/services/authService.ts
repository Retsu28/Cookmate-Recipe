/**
 * CookMate authentication service (Web).
 *
 * Identity is owned by Firebase Auth. Each call signs in/up against Firebase
 * first, then exchanges the resulting ID token with the Express backend at
 * POST /api/auth/firebase to get the existing CookMate session JWT and
 * PostgreSQL user row.
 *
 * Email verification and password reset are delegated to Firebase, which
 * sends the templated emails directly.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth, googleProvider } from '@/lib/firebase';
import api from '@/services/api';

const AUTH_TOKEN_KEY = 'cookmate.auth.token';
const AUTH_USER_KEY = 'cookmate.auth.user';
const ADMIN_EMAIL = 'admin@cookmate.com';

export interface AuthUser {
  id?: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  notifications_enabled?: boolean;
  role?: 'user' | 'admin';
  cooking_skill_level?: string | null;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface MfaRequiredResult {
  mfaRequired: true;
  mfaUserId: number;
}

export class MfaRequiredError extends Error {
  mfaUserId: number;
  constructor(userId: number) {
    super('MFA_REQUIRED');
    this.name = 'MfaRequiredError';
    this.mfaUserId = userId;
  }
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
}

function normalizeUser(user: AuthUser): AuthUser {
  return isAdminUser(user) ? { ...user, role: 'admin' } : user;
}

function persist(result: AuthResult) {
  const user = normalizeUser(result.user);
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable — ignore */
  }
}

/**
 * Exchange a Firebase user for a CookMate backend session.
 * Forces a token refresh so the latest email_verified claim is sent.
 */
async function exchangeFirebaseUser(fbUser: FirebaseUser, name?: string): Promise<AuthResult> {
  const idToken = await fbUser.getIdToken(true);
  const data = await api.post<AuthResult | MfaRequiredResult>('/api/auth/firebase', {
    idToken,
    name: name || fbUser.displayName || undefined,
  });
  if ((data as MfaRequiredResult).mfaRequired) {
    throw new MfaRequiredError((data as MfaRequiredResult).mfaUserId);
  }
  const result = { ...(data as AuthResult), user: normalizeUser((data as AuthResult).user) };
  persist(result);
  return result;
}

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential':        'Invalid email or password. Please try again.',
  'auth/user-not-found':            'Invalid email or password. Please try again.',
  'auth/wrong-password':            'Invalid email or password. Please try again.',
  'auth/email-already-in-use':      'An account with this email already exists.',
  'auth/weak-password':             'Password must be at least 8 characters.',
  'auth/invalid-email':             'Please enter a valid email address.',
  'auth/user-disabled':             'This account has been disabled. Please contact support.',
  'auth/too-many-requests':         'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed':    'Network error. Please check your connection and try again.',
  'auth/popup-closed-by-user':      'Sign-in was cancelled. Please try again.',
  'auth/cancelled-popup-request':   'Sign-in was cancelled. Please try again.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/requires-recent-login':     'Please sign in again to continue.',
  'auth/id-token-expired':          'Your session has expired. Please sign in again.',
};

function friendlyFirebaseError(err: unknown): Error {
  const code = (err as { code?: string } | null)?.code ?? '';
  const msg = FIREBASE_ERRORS[code];
  if (msg) return new Error(msg);
  if (err instanceof Error && !err.message.startsWith('Firebase:')) return err;
  return new Error('Unable to sign in. Please try again.');
}

export const authService = {
  /**
   * Sign in with Firebase Email/Password, then exchange the resulting
   * ID token for a CookMate backend session.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return exchangeFirebaseUser(cred.user);
    } catch (err) {
      throw friendlyFirebaseError(err);
    }
  },

  /**
   * Create a Firebase user, send the verification email, then bootstrap
   * the matching CookMate row via the same /firebase exchange. Returns
   * the freshly created session.
   */
  async signup(name: string, email: string, password: string): Promise<AuthResult> {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    try {
      if (name && name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          /* non-fatal: backend stores the name regardless */
        }
      }
      // Fire and forget — failure here shouldn't block account creation.
      sendEmailVerification(cred.user).catch(() => {});
      return await exchangeFirebaseUser(cred.user, name);
    } catch (err) {
      // Clean up the Firebase user if backend rejected (e.g., duplicate name/email).
      try {
        await deleteUser(cred.user);
      } catch {
        /* ignore cleanup failures */
      }
      throw err;
    }
  },

  /**
   * Sign in with Google via Firebase popup. The backend `/api/auth/firebase`
   * exchange links/creates the PostgreSQL user.
   */
  async googleLogin(_credential?: string): Promise<AuthResult> {
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      return exchangeFirebaseUser(cred.user);
    } catch (err) {
      throw friendlyFirebaseError(err);
    }
  },

  /**
   * Trigger Firebase's password-reset email. Resolves silently even if the
   * email is not registered, so the UI doesn't leak account existence.
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch (err) {
      // Hide "user-not-found" so we don't expose which emails are registered.
      const code = (err as { code?: string } | null)?.code;
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') return;
      throw err;
    }
  },

  /**
   * Request a custom password-reset email from the backend.
   */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/api/auth/forgot-password', { email: email.trim() });
  },

  /**
   * Confirm a password reset using a token from the email link.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/api/auth/reset-password', { token, password });
  },

  /**
   * Re-authenticate the current Firebase user with their email/password, then
   * update the password in Firebase Auth. Throws a friendly error on wrong
   * current password or if no Firebase session is active.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) throw new Error('You must be signed in to change your password.');
    if (!fbUser.email) throw new Error('No email associated with this account.');
    try {
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Current password is incorrect.');
      }
      throw friendlyFirebaseError(err);
    }
  },

  /**
   * Re-send the Firebase verification email for the currently signed-in
   * Firebase user. Throws if no Firebase session is active.
   */
  async resendVerificationEmail(): Promise<void> {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) throw new Error('You must be signed in to resend the verification email.');
    await sendEmailVerification(fbUser);
  },

  isEmailVerified(): boolean {
    return firebaseAuth.currentUser?.emailVerified === true;
  },

  async logout(): Promise<void> {
    try {
      await signOut(firebaseAuth);
    } catch {
      /* ignore — local cleanup still runs */
    }
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* network unavailable: still clear local state */
    }

    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      /* ignore */
    }
  },

  /**
   * Fetch the authenticated user from PostgreSQL via GET /api/auth/me.
   *
   * Keeps the cached user in localStorage in sync with whatever the
   * database currently holds (e.g. if the full_name was updated). Throws
   * on network errors so callers can decide whether to clear the session
   * on 401 / 404 responses.
   */
  async me(): Promise<AuthUser | null> {
    const token = this.getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const data = await api.get<{ user: AuthUser }>('/api/auth/me', headers);
      const user = normalizeUser(data.user);
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } catch {
        /* storage unavailable — ignore */
      }
      return user;
    } catch (err) {
      // Stale / invalid session — drop it so the app returns to login.
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('404'))) {
        await this.logout();
        return null;
      }
      throw err;
    }
  },

  getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? normalizeUser(JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
};

export default authService;
