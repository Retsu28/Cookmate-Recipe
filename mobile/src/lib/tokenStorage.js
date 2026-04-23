import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  async getItem(key) {
    return SecureStore.getItemAsync(key);
  },

  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
};
