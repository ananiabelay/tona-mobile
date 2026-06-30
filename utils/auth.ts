// utils/auth.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tona_user_token';

export const authStorage = {
  async saveToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },
  async removeToken() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
};