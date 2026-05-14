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
// Read API base URL from Expo config (app.json)
const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;

// Always prefer the explicitly configured API URL from app.json
// Only fall back to auto-detection if no config is set
const API_URL =
  (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim())
    ? configuredBaseUrl.trim()
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
  (error) => Promise.reject(error)
);

// 401 response interceptor — silent JWT refresh + retry
let _isRefreshing = false;
let _refreshQueue = [];

function processQueue(error, token = null) {
  _refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Log network errors for debugging
    if (!error.response) {
      console.error(`[API Network Error] ${originalRequest?.method?.toUpperCase?.()} ${originalRequest?.url}`, error.message);
    }

    if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/api/auth/refresh')) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15000 }
        );
        const newToken = response.data?.token;
        if (newToken) {
          await tokenStorage.setItem('userToken', newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
        throw new Error('No token in refresh response');
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await tokenStorage.deleteItem('userToken');
        return Promise.reject(refreshErr);
      } finally {
        _isRefreshing = false;
      }
    }

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
  getRecommendedForMeal: (mealType, limit = 8) =>
    api.get('/api/recipes/recommended-for-meal', { params: { meal_type: mealType, limit } }),
  getSavedStatus: (recipeId) => api.get(`/api/recipes/${recipeId}/saved-status`),
  saveRecipe: (recipeId) => api.post(`/api/recipes/${recipeId}/save`),
  unsaveRecipe: (recipeId) => api.delete(`/api/recipes/${recipeId}/unsave`),
  getSavedRecipes: (userId) => api.get(`/api/recipes/user/${userId}/saved`),
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
  getPlan: () => api.get('/api/meal-planner'),
  assignMeal: (data) => api.post('/api/meal-planner', data),
  updateMeal: (id, data) => api.patch(`/api/meal-planner/${id}`, data),
  deleteMeal: (id) => api.delete(`/api/meal-planner/${id}`),
  getUpcoming: (params = {}) => api.get('/api/meal-planner/upcoming', { params }),
  getPreferences: () => api.get('/api/meal-planner/preferences'),
  updatePreferences: (data) => api.patch('/api/meal-planner/preferences', data),
  registerReminderToken: (data) => api.post('/api/meal-planner/reminder-token', data),
  acknowledgeLocalSchedule: (data) => api.post('/api/meal-planner/local-schedule-ack', data),
  recordReminderLog: (data) => api.post('/api/meal-planner/reminder-log', data),
  getGroceryList: () => api.get('/api/meal-planner/grocery-list'),
  listSavedGroceryLists: () => api.get('/api/meal-planner/grocery-list/saved'),
  saveGroceryList: (data) => api.post('/api/meal-planner/grocery-list/saved', data),
  deleteSavedGroceryList: (id) => api.delete(`/api/meal-planner/grocery-list/saved/${id}`),
};

export const shoppingApi = {
  generateList: (userId) => api.get(`/api/shopping-list/generate/${userId}`),
};

export const notificationApi = {
  getNotifications: (userId) => api.get(`/api/notifications/${userId}`),
  markAsRead: (notificationId) => api.patch(`/api/notifications/${notificationId}/read`),
  markAllAsRead: () => api.patch('/api/notifications/read-all'),
  deleteNotification: (notificationId) => api.delete(`/api/notifications/${notificationId}`),
};

export const profileApi = {
  getProfile: (userId) => api.get(`/api/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/api/profile/${userId}`, data),
  uploadAvatar: (userId, uri) => {
    const fileName = uri.split('/').pop() || 'avatar.jpg';
    const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png'
      : fileName.toLowerCase().endsWith('.webp') ? 'image/webp'
      : 'image/jpeg';
    const formData = new FormData();
    formData.append('avatar', { uri, name: fileName, type: fileType });
    return api.post(`/api/profile/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const inventoryApi = {
  getInventory: (userId) => api.get(`/api/inventory/${userId}`),
};

export const settingsApi = {
  getSettings: (userId, key) => api.get(`/api/settings/${userId}/${key}`),
  saveSettings: (userId, key, value) => api.put(`/api/settings/${userId}/${key}`, { value }),
};

export const chatApi = {
  sendMessage: (message, history = []) => api.post('/api/chat', { message, history }),
  getHistory: () => api.get('/api/chat/history'),
};

export const mfaApi = {
  getStatus: () => api.get('/api/mfa/status'),
  setup: () => api.post('/api/mfa/setup'),
  enable: (secret, token) => api.post('/api/mfa/enable', { secret, token }),
  disable: (token) => api.post('/api/mfa/disable', { token }),
  verify: (userId, token) => api.post('/api/mfa/verify', { userId, token }),
};

export default api;
