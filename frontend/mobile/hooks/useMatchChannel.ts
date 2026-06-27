/**
 * hooks/useMatchChannel.ts
 *
 * Subscribes to the private Reverb channel "match.{matchId}" and exposes
 * three real-time event callbacks:
 *
 *  - onMessage     → backend event: `.message.sent`
 *  - onTyping      → backend event: `.typing`
 *  - onReadReceipt → backend event: `.read.receipt`
 *
 * The hook subscribes on mount, unsubscribes on unmount or matchId change.
 *
 * Usage:
 *   useMatchChannel(matchId, {
 *     onMessage: (msg) => setMessages(prev => ...),
 *     onTyping: ()    => showTypingIndicator(),
 *     onReadReceipt: (data) => markMessagesRead(data),
 *   });
 */

import { useEffect, useRef } from 'react';
import { getEcho } from '../services/echo';

export type IncomingMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  sender_role: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type TypingPayload = {
  match_id: string;
  user_id: string;
};

export type ReadReceiptPayload = {
  match_id: string;
  reader_id: string;
  count: number;
  read_at: string;
};

type UseMatchChannelOptions = {
  onMessage?: (data: IncomingMessage) => void;
  onTyping?: (data: TypingPayload) => void;
  onReadReceipt?: (data: ReadReceiptPayload) => void;
};

export function useMatchChannel(
  matchId: string | null | undefined,
  options: UseMatchChannelOptions,
) {
  // Keep options in a ref to avoid re-subscribing when callback functions change identity
  const optionsRef = useRef(options);
  
  // Update the ref on every render to capture the latest callbacks with current closure
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!matchId) return;

    console.log(`🔌 Setting up match channel for match: ${matchId}`);

    const echo = getEcho();
    const channel = echo.private(`match.${matchId}`);

    channel
      .listen('.message.sent', (data: IncomingMessage) => {
        console.log('📨 Message received via WebSocket:', data);
        optionsRef.current.onMessage?.(data);
      })
      .listen('.typing', (data: TypingPayload) => {
        console.log('⌨️ Typing indicator received:', data);
        optionsRef.current.onTyping?.(data);
      })
      .listen('.read.receipt', (data: ReadReceiptPayload) => {
        console.log('✓✓ Read receipt received:', data);
        optionsRef.current.onReadReceipt?.(data);
      });

    return () => {
      console.log(`🔌 Cleaning up match channel for match: ${matchId}`);
      echo.leave(`match.${matchId}`);
    };
  }, [matchId]);
}
