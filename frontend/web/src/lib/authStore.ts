import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';

export type UserRole = 'super_admin' | 'admin' | 'moderator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', {
            email,
            password,
          });

          // The API interceptor unwraps the Laravel envelope, so response.data is already the inner data
          const { token, user } = response.data;
          
          if (!token || !user) {
            throw new Error('Invalid response from server');
          }
          
          // Store in localStorage first
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(user));
          }
          
          // Then update state
          set({
            user: user,
            token: token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      },

      restoreSession: async () => {
        const token = get().token;
        
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get('/auth/me');
          // The API interceptor unwraps the Laravel envelope
          const user = response.data;
          
          set({
            user: user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Session restore failed:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Always reset isLoading to false after rehydration
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);
