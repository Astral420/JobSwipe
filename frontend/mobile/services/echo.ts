/**
 * services/echo.ts
 *
 * Direct Pusher client for Laravel Reverb (bypassing Laravel Echo due to React Native compatibility issues).
 * 
 * Laravel Echo has constructor issues with React Native Metro bundler.
 * This implementation uses Pusher.js directly, which is what Laravel Echo wraps anyway.
 *
 * Authentication flow for private channels:
 *   1. Pusher connects to Reverb WS at ws://REVERB_HOST:REVERB_PORT
 *   2. When subscribing to "private-match.{id}", Pusher POSTs to authEndpoint
 *      with the Bearer token — hitting our custom /api/v1/broadcasting/auth route
 *   3. Reverb verifies and returns a signed auth string to allow the subscription.
 */

// Use named import for React Native compatibility
import { Pusher } from 'pusher-js/react-native';
import type { Channel } from 'pusher-js/react-native';
import { useAuthStore } from '../store/authStore';

const REVERB_KEY = process.env.EXPO_PUBLIC_REVERB_KEY ?? '';
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST ?? 'localhost';
const REVERB_PORT = parseInt(process.env.EXPO_PUBLIC_REVERB_PORT ?? '8080', 10);
const REVERB_SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'http';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const AUTH_ENDPOINT = `${API_URL}/broadcasting/auth`;

let pusherInstance: Pusher | null = null;
const channels: Map<string, Channel> = new Map();

export function getEcho() {
  if (pusherInstance) return createEchoAPI();

  const token = useAuthStore.getState().token;

  pusherInstance = new Pusher(REVERB_KEY, {
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: AUTH_ENDPOINT,
    auth: {
      headers: {
        Authorization: `Bearer ${token ?? ''}`,
      },
    },
    cluster: '', // Required by Pusher but not used with custom wsHost
  });

  // Debug logging
  pusherInstance.connection.bind('connected', () => {
    console.log('✅ Pusher connected');
  });

  pusherInstance.connection.bind('disconnected', () => {
    console.log('❌ Pusher disconnected');
  });

  pusherInstance.connection.bind('error', (err: any) => {
    console.error('❌ Pusher connection error:', err);
  });

  return createEchoAPI();
}

/**
 * Create an Echo-compatible API wrapper around Pusher
 */
function createEchoAPI() {
  return {
    /**
     * Subscribe to a private channel
     */
    private(channelName: string) {
      if (!pusherInstance) throw new Error('Pusher not initialized');

      const fullName = `private-${channelName}`;
      let channel = channels.get(fullName);

      if (!channel) {
        console.log(`📡 Subscribing to channel: ${fullName}`);
        channel = pusherInstance.subscribe(fullName);
        channels.set(fullName, channel);

        // Debug channel events
        channel.bind('pusher:subscription_succeeded', () => {
          console.log(`✅ Subscribed to ${fullName}`);
        });

        channel.bind('pusher:subscription_error', (err: any) => {
          console.error(`❌ Subscription error for ${fullName}:`, err);
        });
      }

      return {
        listen(event: string, callback: (data: any) => void) {
          // Strip the leading dot (Laravel Echo convention) before calling Pusher's bind.
          // Echo strips it internally; since we use Pusher directly we must do it ourselves.
          const eventName = event.startsWith('.') ? event.slice(1) : event;
          console.log(`👂 Listening for event: ${eventName} on ${fullName}`);
          channel!.bind(eventName, (data: any) => {
            console.log(`📨 Received event: ${eventName}`, data);
            callback(data);
          });
          return this;
        },
        whisper(event: string, data: any) {
          channel!.trigger(`client-${event}`, data);
          return this;
        },
        listenForWhisper(event: string, callback: (data: any) => void) {
          channel!.bind(`client-${event}`, callback);
          return this;
        },
      };
    },

    /**
     * Subscribe to a public channel
     */
    channel(channelName: string) {
      if (!pusherInstance) throw new Error('Pusher not initialized');

      let channel = channels.get(channelName);

      if (!channel) {
        channel = pusherInstance.subscribe(channelName);
        channels.set(channelName, channel);
      }

      return {
        listen(event: string, callback: (data: any) => void) {
          channel!.bind(event, callback);
          return this;
        },
      };
    },

    /**
     * Leave a channel
     */
    leave(channelName: string) {
      if (!pusherInstance) return;

      const channel = channels.get(channelName) || channels.get(`private-${channelName}`);
      if (channel) {
        pusherInstance.unsubscribe(channel.name);
        channels.delete(channelName);
        channels.delete(`private-${channelName}`);
      }
    },

    /**
     * Disconnect from Pusher
     */
    disconnect() {
      if (!pusherInstance) return;

      channels.forEach((_, channelName) => {
        pusherInstance!.unsubscribe(channelName);
      });
      channels.clear();
      pusherInstance.disconnect();
    },

    /**
     * Get the socket ID
     */
    socketId() {
      return pusherInstance?.connection?.socket_id || null;
    },

    /**
     * Get underlying Pusher instance (for advanced use)
     */
    connector: {
      pusher: pusherInstance,
    },
  };
}

/**
 * Update the auth header on the underlying Pusher instance.
 * Call this after the token changes (e.g. after login rehydration).
 */
export function refreshEchoAuth(): void {
  const token = useAuthStore.getState().token;
  if (!pusherInstance) return;

  // Update the auth headers for future subscriptions
  (pusherInstance as any).config.auth = {
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
    },
  };
}

/**
 * Tear down the Pusher instance — call on logout.
 */
export function disconnectEcho(): void {
  if (pusherInstance) {
    channels.forEach((_, channelName) => {
      pusherInstance!.unsubscribe(channelName);
    });
    channels.clear();
    pusherInstance.disconnect();
    pusherInstance = null;
  }
}

/**
 * Get the current Pusher socket ID (used for X-Socket-ID header).
 * Laravel's broadcast()->toOthers() needs this to exclude the sender.
 */
export function getSocketId(): string | null {
  return pusherInstance?.connection?.socket_id || null;
}
