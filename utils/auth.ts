// utils/auth.ts
import * as SecureStore from 'expo-secure-store';

export const authStorage = {
  async saveToken(token: string) {
    try {
      await SecureStore.setItemAsync('user_session_token', token);
    } catch (e) {
      console.error("SecureStore write failure:", e);
      // Fallback if secure store is misconfigured on the emulator
    }
  },
  async getToken() {
    try {
      return await SecureStore.getItemAsync('user_session_token');
    } catch (e) {
      return null;
    }
  }
  ,async removeToken() {
    await SecureStore.deleteItemAsync('user_session_token');
  },
};