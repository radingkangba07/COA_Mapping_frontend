import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { StorageService } from '@/shared/services/storage/storage.types';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';

function createNativeStorage(): StorageService {
  return {
    async get(key: string): Promise<string | null> {
      return SecureStore.getItemAsync(key);
    },

    async set(key: string, value: string): Promise<void> {
      await SecureStore.setItemAsync(key, value);
    },

    async remove(key: string): Promise<void> {
      await SecureStore.deleteItemAsync(key);
    },

    async clear(): Promise<void> {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
    },
  };
}

function createWebStorage(): StorageService {
  return {
    async get(key: string): Promise<string | null> {
      return localStorage.getItem(key);
    },

    async set(key: string, value: string): Promise<void> {
      localStorage.setItem(key, value);
    },

    async remove(key: string): Promise<void> {
      localStorage.removeItem(key);
    },

    async clear(): Promise<void> {
      const keys = Object.values(STORAGE_KEYS);
      keys.forEach((key) => localStorage.removeItem(key));
    },
  };
}

function createStorage(): StorageService {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }
  return createNativeStorage();
}

export const storageService: StorageService = createStorage();
