import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://ais-dev-2c7mel3x5hyi6g2uhhdwnk-445093172081.asia-southeast1.run.app';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
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
