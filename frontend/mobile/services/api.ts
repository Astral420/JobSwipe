import axios from 'axios';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { getSocketId } from './echo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token + Pusher socket ID to all requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Attach socket ID so Laravel's broadcast()->toOthers() can exclude the sender
  const socketId = getSocketId();
  if (socketId) config.headers['X-Socket-ID'] = socketId;

  return config;
});

// Response interceptor: Handle 401 unauthorized (expired/invalid tokens)
api.interceptors.response.use(
  (res) => res.data?.data ?? res.data,
  async (err) => {
    const status = err.response?.status;

    // Auto-logout on 401 (expired token, banned user, etc.)
    if (status === 401) {
      const { token, clearToken } = useAuthStore.getState();

      // Only show alert if user was actually logged in
      if (token) {
        await clearToken();

        // Show toast notification
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [{ text: 'OK' }]
        );
      }
    }

    return Promise.reject(err.response?.data ?? err);
  }
);

