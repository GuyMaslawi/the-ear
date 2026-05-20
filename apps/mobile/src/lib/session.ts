import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'the-ear-access-token';

export const session = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async clear() {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};
