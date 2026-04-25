import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from '../lib/tokenStorage';

/**
 * API base URL — reads from Expo extra config.
 *
 * Set in app.json → expo.extra.apiBaseUrl  (or app.config.js).
 * Defaults:
 *   - Android emulator: http://10.0.2.2:5000  (maps to host localhost)
 *   - Others / physical device: http://localhost:5000
 *
 * For production, set apiBaseUrl to your EC2 URL, e.g.:
 *   https://api.cookmate.com
 */
const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;
const expoHost = Constants.expoGoConfig?.debuggerHost?.split(':')[0];
const API_URL =
  (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim())
    ? configuredBaseUrl.trim()
    : expoHost
      ? `http://${expoHost}:5000`
      : Platform.OS === 'android'
        ? 'http://10.0.2.2:5000'
        : 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const recipeApi = {
  getFeatured: () => api.get('/api/recipes/featured'),
  getRecent: () => api.get('/api/recipes/recent'),
  getById: (id) => api.get(`/api/recipes/${id}`),
};

export const mlApi = {
  recommendByIngredients: (ingredients) => api.post('/api/ml/recommend/by-ingredients', { ingredients }),
};

export const plannerApi = {
  getPlan: (userId) => api.get(`/api/meal-planner/${userId}`),
  assignMeal: (data) => api.post('/api/meal-planner/assign', data),
};

export const shoppingApi = {
  generateList: (userId) => api.get(`/api/shopping-list/generate/${userId}`),
};

export const notificationApi = {
  getNotifications: (userId) => api.get(`/api/notifications/${userId}`),
};

export const profileApi = {
  getProfile: (userId) => api.get(`/api/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/api/profile/${userId}`, data),
};

export const inventoryApi = {
  getInventory: (userId) => api.get(`/api/inventory/${userId}`),
};

export default api;
