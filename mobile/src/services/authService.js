/**
 * CookMate authentication service (Mobile).
 *
 * Identity is owned by Firebase Auth. Each call signs in/up via the
 * Firebase JS SDK first, then exchanges the resulting ID token with the
 * Express backend at POST /api/auth/firebase to obtain the existing
 * CookMate JWT + PostgreSQL user row.
 *
 * Email verification and password reset are delegated to Firebase.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import api from '../api/api';
import { tokenStorage } from '../lib/tokenStorage';

const AUTH_TOKEN_KEY = 'userToken';
const AUTH_USER_KEY = 'cookmate.auth.user';

function toMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

async function persist(result) {
  await tokenStorage.setItem(AUTH_TOKEN_KEY, result.token);
  await tokenStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
}

async function clearStoredSession() {
  await tokenStorage.deleteItem(AUTH_TOKEN_KEY);
  await tokenStorage.deleteItem(AUTH_USER_KEY);
}

/**
 * Exchange the current Firebase user for a CookMate backend session.
 * Forces a fresh ID token so the latest email_verified claim is sent.
 */
async function exchangeFirebaseUser(fbUser, name) {
  const idToken = await fbUser.getIdToken(true);
  const { data } = await api.post('/api/auth/firebase', {
    idToken,
    name: name || fbUser.displayName || undefined,
  });
  const result = { token: data.token, user: data.user };
  await persist(result);
  return result;
}

function toFirebaseMessage(err, fallback) {
  if (!err) return fallback;
  switch (err.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err.message || fallback;
  }
}

export const authService = {
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return exchangeFirebaseUser(cred.user);
    } catch (error) {
      throw new Error(toFirebaseMessage(error, toMessage(error, 'Unable to sign in. Please try again.')));
    }
  },

  /**
   * Exchange a Google ID token (from expo-auth-session / native Google SDK)
   * for a CookMate session: signs into Firebase with the Google credential,
   * then exchanges the resulting Firebase ID token at /api/auth/firebase.
   */
  async googleLogin(idToken) {
    if (!idToken) {
      throw new Error('Missing Google credential.');
    }
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const cred = await signInWithCredential(firebaseAuth, credential);
      return exchangeFirebaseUser(cred.user);
    } catch (error) {
      throw new Error(toFirebaseMessage(error, toMessage(error, 'Google sign-in failed. Please try again.')));
    }
  },

  async signup(name, email, password) {
    if (!name || !email || !password) {
      throw new Error('Please fill in all fields.');
    }
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (name && name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          /* non-fatal */
        }
      }
      // Send verification email but don't block signup on it.
      sendEmailVerification(cred.user).catch(() => {});
      return await exchangeFirebaseUser(cred.user, name);
    } catch (error) {
      // Clean up the Firebase user if backend rejected (e.g., duplicate name/email).
      if (cred?.user) {
        try {
          await deleteUser(cred.user);
        } catch {
          /* ignore cleanup failures */
        }
      }
      throw new Error(toFirebaseMessage(error, toMessage(error, 'Unable to create account. Please try again.')));
    }
  },

  /**
   * Send a password-reset email via Firebase. Resolves silently for
   * unknown emails so we don't leak which addresses are registered.
   */
  async sendPasswordReset(email) {
    if (!email) throw new Error('Please enter your email address.');
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch (error) {
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-email') return;
      throw new Error(toFirebaseMessage(error, 'Could not send reset email. Please try again.'));
    }
  },

  /**
   * Re-authenticate the current Firebase user with their email/password, then
   * update the password in Firebase Auth.
   */
  async changePassword(currentPassword, newPassword) {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) throw new Error('You must be signed in to change your password.');
    if (!fbUser.email) throw new Error('No email associated with this account.');
    try {
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, newPassword);
    } catch (error) {
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        throw new Error('Current password is incorrect.');
      }
      throw new Error(toFirebaseMessage(error, 'Failed to change password. Please try again.'));
    }
  },

  /** Re-send the Firebase verification email for the current user. */
  async resendVerificationEmail() {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) throw new Error('You must be signed in to resend the verification email.');
    await sendEmailVerification(fbUser);
  },

  isEmailVerified() {
    return firebaseAuth.currentUser?.emailVerified === true;
  },

  async logout() {
    try {
      await signOut(firebaseAuth);
    } catch {
      /* ignore */
    }
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* network unavailable: still clear local state */
    }

    await clearStoredSession();
  },

  async me() {
    const token = await this.getToken();
    if (!token) {
      return null;
    }

    try {
      const { data } = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      await tokenStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 404) {
        await this.logout();
        return null;
      }
      throw new Error(toMessage(error, 'Unable to load your session.'));
    }
  },

  async getCurrentUser() {
    try {
      const raw = await tokenStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async getToken() {
    try {
      return await tokenStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
};

export default authService;
