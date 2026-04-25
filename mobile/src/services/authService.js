/**
 * CookMate authentication service (Mobile).
 *
 * Calls the Express API backend via the shared axios instance.
 * Token storage is handled via expo-secure-store (see lib/tokenStorage.js).
 */

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

export const authService = {
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      const result = { token: data.token, user: data.user };
      await persist(result);
      return result;
    } catch (error) {
      throw new Error(toMessage(error, 'Unable to sign in. Please try again.'));
    }
  },

  async signup(name, email, password) {
    if (!name || !email || !password) {
      throw new Error('Please fill in all fields.');
    }
    try {
      const { data } = await api.post('/api/auth/signup', { name, email, password });
      const result = { token: data.token, user: data.user };
      await persist(result);
      return result;
    } catch (error) {
      throw new Error(toMessage(error, 'Unable to create account. Please try again.'));
    }
  },

  async logout() {
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
