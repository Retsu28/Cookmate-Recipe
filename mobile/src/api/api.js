import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from '../lib/tokenStorage';

/**
 * API base URL — reads from Expo extra config.
 *
 * Set in app.json → expo.extra.apiBaseUrl  (or app.config.js).
 * Leave apiBaseUrl empty for Expo Go so the app reuses the Metro host IP.
 * Defaults:
 *   - Android emulator: http://10.0.2.2:5000  (maps to host localhost)
 *   - Expo Go / physical device: http://<Metro host>:5000
 *   - Others: http://localhost:5000
 *
 * For production, set apiBaseUrl to your EC2 URL, e.g.:
 *   https://api.cookmate.com
 */
const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;

function hostFromUri(value) {
  if (!value || typeof value !== 'string') return '';
  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, '');
  const host = withoutProtocol.split('/')[0].split(':')[0];
  return host && host !== 'localhost' && host !== '127.0.0.1' ? host : '';
}

const expoHost =
  hostFromUri(Constants.expoGoConfig?.debuggerHost) ||
  hostFromUri(Constants.expoConfig?.hostUri) ||
  hostFromUri(Constants.manifest2?.extra?.expoClient?.hostUri) ||
  hostFromUri(Constants.manifest?.debuggerHost);

const API_URL =
  (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim())
    ? configuredBaseUrl.trim()
    : expoHost
      ? `http://${expoHost}:5000`
      : Platform.OS === 'android'
        ? 'http://10.0.2.2:5000'
        : 'http://localhost:5000';

export const apiBaseUrl = API_URL;

if (__DEV__) {
  console.log(`[CookMate API] ${API_URL}`);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
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
  getAll: (params) => api.get('/api/recipes', { params }),
  getAllRecipesAz: (params = {}) => api.get('/api/recipes', { params: { published: 'true', limit: 200, sort: 'title_asc', ...params } }),
  getFeatured: () => api.get('/api/recipes/featured'),
  getRecent: () => api.get('/api/recipes/recent'),
  getCategories: () => api.get('/api/recipes/categories'),
  getHomeSections: (params) => api.get('/api/recipes/home-sections', { params }),
  getById: (id) => api.get(`/api/recipes/${id}`),
  recordView: (recipeId) => api.post(`/api/recipes/${recipeId}/view`),
  getRecentlyViewed: () => api.get('/api/recipes/recently-viewed'),
  search: (query) => api.get('/api/recipes', { params: { search: query, published: 'true' } }),
  byCategory: (category, limit = 24) =>
    api.get('/api/recipes', { params: { category, published: 'true', limit } }),
};

export const mlApi = {
  recommendByIngredients: (ingredients) => api.post('/api/ml/recommend', { ingredients }),
  getImageAnalysisQueue: () => api.get('/api/ml/image-analysis/queue'),
  analyzeCameraImage: (image) => api.post('/api/ml/camera/analyze', { image }, { timeout: 130000 }),
  analyzeIngredients: (image) => api.post('/api/ml/analyze-ingredients', { image }, { timeout: 130000 }),
  removeCameraBackground: (image) => api.post('/api/ml/camera/remove-bg', { image }, { timeout: 100000 }),
  saveAiCameraResult: (payload) => api.post('/api/ml/ai-camera-saves', payload),
  getAiCameraSaves: (params) => api.get('/api/ml/ai-camera-saves', { params }),
  getAiCameraSave: (id) => api.get(`/api/ml/ai-camera-saves/${id}`),
  deleteAiCameraSave: (id) => api.delete(`/api/ml/ai-camera-saves/${id}`),
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
