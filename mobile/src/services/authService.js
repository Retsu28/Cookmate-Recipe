/**
 * Placeholder authentication service for Cookmate (Mobile).
 *
 * TODO: Replace simulated calls with real Cookmate backend endpoints
 * once available (see ARCHITECTURE.md — Gap 4). The existing axios
 * instance at `src/api/api.js` already attaches the Bearer token
 * from SecureStore, so once the endpoints exist you can swap the
 * bodies below to real calls like:
 *
 *   const { data } = await api.post('/api/auth/login', { email, password });
 *   return { token: data.token, user: data.user };
 *
 * Security notes:
 *  - Real tokens are stored via expo-secure-store (see lib/tokenStorage.js).
 *  - Never log or persist plaintext passwords.
 */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const authService = {
  async login(email, password) {
    // TODO: Replace with api.post('/api/auth/login', { email, password })
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    await wait(600); // simulate latency only
    return {
      token: `placeholder.${Date.now()}`,
      user: { name: email.split('@')[0] || 'Cook', email },
    };
  },

  async signup(name, email, password) {
    // TODO: Replace with api.post('/api/auth/signup', { name, email, password })
    if (!name || !email || !password) {
      throw new Error('Please fill in all fields.');
    }
    await wait(700);
    return {
      token: `placeholder.${Date.now()}`,
      user: { name, email },
    };
  },

  async logout() {
    // TODO: Call api.post('/api/auth/logout') once backend exists.
    // Token removal is handled in AuthContext.logout().
    return Promise.resolve();
  },
};

export default authService;
