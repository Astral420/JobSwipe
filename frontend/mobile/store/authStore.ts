/**
 * store/authStore.ts
 *
 * Zustand auth store with AsyncStorage persistence.
 * The token and role survive app restarts; rehydration happens automatically
 * via `hydrate()` which should be called once in your root _layout.tsx.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const ROLE_KEY = 'auth_role';

export type AuthRole = 'applicant' | 'hr' | 'company_admin';

type AuthState = {
  token: string | null;
  role: AuthRole | null;
  hydrated: boolean;
  isOnboarding: boolean;

  setToken: (token: string | null, role?: AuthRole | null) => Promise<void>;
  clearToken: () => Promise<void>;
  hydrate: () => Promise<void>;
  setOnboarding: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  hydrated: false,
  isOnboarding: false,

  setToken: async (token, role = null) => {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (role) {
        await AsyncStorage.setItem(ROLE_KEY, role);
      } else {
        await AsyncStorage.removeItem(ROLE_KEY);
      }
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(ROLE_KEY);
    }

    set({ token, role });
  },

  clearToken: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(ROLE_KEY);
    set({ token: null, role: null });
  },

  hydrate: async () => {
    try {
      const [token, role] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(ROLE_KEY)]);

      // Legacy sessions may still have a token without a stored role.
      // Clear those so the app doesn't auto-route to the wrong account type.
      if (token && !role) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        set({ token: null, role: null, hydrated: true });
        return;
      }

      set({
        token: token ?? null,
        role: role === 'hr' || role === 'applicant' || role === 'company_admin' ? (role as AuthRole) : null,
        hydrated: true,
      });
    } catch {
      set({ token: null, role: null, hydrated: true });
    }
  },

  setOnboarding: (value) => {
    set({ isOnboarding: value });
  },
}));
