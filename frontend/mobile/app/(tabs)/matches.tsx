import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  TextInput,
  Keyboard,
  KeyboardEvent,
  Platform,
  BackHandler,
  Image,
  ImageSourcePropType,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { CompanyLogo, CountBadge, Radii, Spacing, StatusPill } from '../../components/ui';
import { useTheme } from '../../theme';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useAuthStore } from '../../store/authStore';
import { useMatchChannel, type IncomingMessage } from '../../hooks/useMatchChannel';

const SCREEN_WIDTH = Dimensions.get('window').width;
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

type Status = 'applied' | 'screening' | 'interview' | 'offer';
type MatchState = 'pending' | 'expired' | 'active' | 'closed';
type MatchId = string;

type MatchCompany = {
  id: MatchId;
  abbr: string;
  color: string;
  company: string;
  role: string;
  status: Status;
  prompt: string;
  startedAt?: number;
  matchCreatedAt: number;
  badgeCount: number;
};

type Conversation = {
  id: MatchId;
  companyId: MatchId;
  abbr: string;
  color: string;
  company: string;
  role: string;
  status: Status;
  lastMsg: string;
  time: string;
  unread: number;
  state: 'active' | 'closed' | 'expired';
};

type ChatMessage = {
  id: string | number;
  from: 'me' | 'them';
  text: string;
  time: string;
  read?: boolean;
  sending?: boolean;
};

type Review = {
  id: number;
  companyId: MatchId;
  rating: number;
  title: string;
  body: string;
  date: string;
};

type CompanyReviewDetails = {
  location: string;
  about: string;
  banner: ImageSourcePropType;
  photos: ImageSourcePropType[];
};

const now = Date.now();

function mapBackendStatusToUiStatus(status?: string): Status {
  switch (status) {
    case 'accepted':
      return 'interview';
    case 'closed':
      return 'offer';
    case 'declined':
      return 'screening';
    case 'expired':
      return 'screening';
    case 'pending':
    default:
      return 'applied';
  }
}

function mapBackendStatusToConversationState(status?: string): 'active' | 'closed' | 'expired' {
  if (status === 'closed') return 'closed';
  if (status === 'declined' || status === 'expired') return 'expired';
  return 'active';
}

// ── Mock data replaced by API ─────────────────────────────────────────────────
// MATCH_COMPANIES, INITIAL_CONVERSATIONS, INITIAL_MESSAGES, AUTO_REPLIES, COMPANY_REVIEW_DETAILS
// are no longer hardcoded. All data is fetched from the backend.

function getReviewDetails(conversation: Conversation): CompanyReviewDetails {
  return {
    location: 'Remote',
    about: `${conversation.company} is hiring for ${conversation.role} and aims to provide a clear, respectful, and well-structured experience for candidates throughout the process.`,
    banner: require('../assets/images/accenture.jpg'),
    photos: [
      require('../assets/images/accenture.jpg'),
      require('../assets/images/accenture2.jpg'),
      require('../assets/images/accenture3.jpg'),
    ],
  };
}

function statusBg(status: Status) {
  const map: Record<Status, string> = {
    applied: 'rgba(255,255,255,0.08)',
    screening: 'rgba(245,158,11,0.12)',
    interview: 'rgba(168,85,247,0.16)',
    offer: 'rgba(34,197,94,0.12)',
  };
  return map[status];
}

function statusColor(status: Status) {
  const map: Record<Status, string> = {
    applied: 'rgba(255,255,255,0.55)',
    screening: '#f59e0b',
    interview: '#a855f7',
    offer: '#22c55e',
  };
  return map[status];
}

function getMatchState(match: MatchCompany, currentTime: number): MatchState {
  if (match.startedAt) return 'active';
  if (currentTime - match.matchCreatedAt >= REPLY_WINDOW_MS) return 'expired';
  return 'pending';
}

function getTimeLeft(match: MatchCompany, currentTime: number) {
  return Math.max(0, REPLY_WINDOW_MS - (currentTime - match.matchCreatedAt));
}

function formatRemainingTime(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m left`;
  if (minutes === 0) return `${hours}h left`;
  return `${hours}h ${minutes}m left`;
}

function formatRingValue(ms: number) {
  const totalHours = ms / (60 * 60 * 1000);
  if (totalHours >= 1) return `${Math.ceil(totalHours)}h`;
  return `${Math.max(1, Math.ceil(ms / (60 * 1000)))}m`;
}

function formatConversationTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CountdownRing({
  progress,
  color,
  label,
}: {
  progress: number;
  color: string;
  label: string;
}) {
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringLabel}>
        <Text style={styles.ringValue}>{label}</Text>
      </View>
    </View>
  );
}

function MatchCarousel({
  matches,
  currentTime,
  onOpen,
  onDecline,
  decliningMatchId,
}: {
  matches: MatchCompany[];
  currentTime: number;
  onOpen: (matchId: MatchId) => void;
  onDecline: (matchId: MatchId, companyName: string) => void;
  decliningMatchId: MatchId | null;
}) {
  const T = useTheme();

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: '#191233' }]}>New matches</Text>
        <Text style={[styles.sectionAction, { color: T.primary }]}>{matches.length}</Text>
      </View>

      <View style={styles.matchPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchPanelRow}>
          {matches.map((match) => {
            const state = getMatchState(match, currentTime);
            const timeLeft = getTimeLeft(match, currentTime);
            const progress = timeLeft / REPLY_WINDOW_MS;
            const expired = state === 'expired';

            return (
              <View key={match.id} style={styles.matchCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.85}
                  onPress={() => onOpen(match.id)}
                >
                  <View style={styles.matchAvatarWrap}>
                    <CountdownRing
                      progress={progress}
                      color={expired ? '#f43f5e' : match.color}
                      label=""
                    />
                    <View style={styles.matchAvatarInner}>
                      <CompanyLogo abbr={match.abbr} color={expired ? '#d8d1ea' : match.color} size="md" />
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>{match.badgeCount}</Text>
                    </View>
                  </View>

                  <Text style={styles.matchName} numberOfLines={1}>{match.company}</Text>
                  <Text style={styles.matchRole} numberOfLines={1}>{match.role}</Text>
                  <Text style={[styles.matchMeta, expired && styles.matchMetaExpired]}>
                    {expired ? 'Expired' : formatRingValue(timeLeft)}
                  </Text>
                </TouchableOpacity>

                {/* Subtle decline button */}
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDecline(match.id, match.company);
                  }}
                  disabled={decliningMatchId === match.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.declineBtnText}>
                    {decliningMatchId === match.id ? 'Declining...' : 'Not interested'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}

function MessagesList({
  conversations,
  onOpenConversation,
  onOpenReview,
  hasMatches,
}: {
  conversations: Conversation[];
  onOpenConversation: (conversationId: MatchId) => void;
  onOpenReview: (companyId: MatchId) => void;
  hasMatches: boolean;
}) {
  const T = useTheme();

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={hasMatches ? "message-text-outline" : "briefcase-search-outline"}
          size={48}
          color="rgba(124,58,237,0.24)"
        />
        <Text style={styles.emptyTitle}>
          {hasMatches ? 'No conversations yet' : 'No matches yet'}
        </Text>
        <Text style={styles.emptyCopy}>
          {hasMatches
            ? 'Open a match above to start chatting and build your connection.'
            : 'Start swiping to discover opportunities that match your profile!'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: '#191233' }]}>Conversations</Text>
      </View>

      <View style={styles.messagePanel}>
        {conversations.map((conversation, index) => {
          const isClosed = conversation.state === 'closed';
          const isExpired = conversation.state === 'expired';
          const isInactive = isClosed || isExpired;

          return (
            <View key={conversation.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TouchableOpacity
                style={[styles.msgRow, isInactive && styles.msgRowClosed]}
                activeOpacity={0.85}
                onPress={() => onOpenConversation(conversation.id)}
              >
                <View style={{ position: 'relative' }}>
                  <CompanyLogo
                    abbr={conversation.abbr}
                    color={isInactive ? 'rgba(124,58,237,0.18)' : conversation.color}
                    size="md"
                  />
                  {conversation.unread > 0 && !isInactive ? <CountBadge count={conversation.unread} /> : null}
                </View>

                <View style={styles.msgBody}>
                  <View style={styles.msgTopRow}>
                    <Text style={[styles.msgCompany, isInactive && styles.msgFaded]}>{conversation.company}</Text>
                    <Text style={styles.msgTime}>{conversation.time}</Text>
                  </View>

                  <Text style={[styles.msgRole, isInactive && styles.msgFaded]}>{conversation.role}</Text>
                  <Text style={[styles.msgPreview, isInactive && styles.msgFaded]} numberOfLines={1}>
                    {conversation.lastMsg}
                  </Text>

                  {isClosed ? (
                    <View style={styles.messageActions}>
                      <View style={styles.closedTag}>
                        <MaterialCommunityIcons name="lock-outline" size={10} color="#8f8aa4" />
                        <Text style={styles.closedTagText}>Conversation closed</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.reviewButton, { borderColor: T.primary, backgroundColor: `${T.primary}12` }]}
                        onPress={() => onOpenReview(conversation.companyId)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="star-outline" size={12} color={T.primary} />
                        <Text style={[styles.reviewButtonText, { color: T.primary }]}>Leave a review</Text>
                      </TouchableOpacity>
                    </View>
                  ) : isExpired ? (
                    <View style={styles.closedTag}>
                      <MaterialCommunityIcons name="clock-alert-outline" size={10} color="#8f8aa4" />
                      <Text style={styles.closedTagText}>Conversation expired</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </>
  );
}

function ConversationScreen({
  company,
  conversation,
  currentTime,
  tabBarHeight,
  onBack,
  onSendFirstMessage,
  onOpenReview,
}: {
  company: MatchCompany | null;
  conversation: Conversation | null;
  currentTime: number;
  tabBarHeight: number;
  onBack: () => void;
  onSendFirstMessage: (companyId: MatchId, text: string, time: string) => void;
  onOpenReview: (companyId: MatchId) => void;
}) {
  const T = useTheme();
  const authRole = useAuthStore((s) => s.role);
  const { top: topInset } = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  const fallbackCompany = company ?? (conversation ? {
    id: conversation.companyId,
    abbr: conversation.abbr,
    color: conversation.color,
    company: conversation.company,
    role: conversation.role,
    status: conversation.status,
    prompt: conversation.lastMsg,
    matchCreatedAt: currentTime,
    badgeCount: conversation.unread,
  } : null);

  const isPendingMatch = !!company && !company.startedAt && !conversation;
  const isExpiredMatch = !!company && getMatchState(company, currentTime) === 'expired' && !conversation;
  const isClosedConversation = conversation?.state === 'closed';
  const isExpiredConversation = conversation?.state === 'expired';
  const isReadOnlyConversation = isClosedConversation || isExpiredConversation;
  const canChat = !isExpiredMatch && !isReadOnlyConversation && !!fallbackCompany;

  // ── Initial message load ────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    const targetId = fallbackCompany?.id;
    if (!targetId) { setMessages([]); return; }
    try {
      const msgs: any = await api.get(`/matches/${targetId}/messages`);
      const payload = Array.isArray(msgs) ? msgs : (Array.isArray(msgs?.data) ? msgs.data : []);
      const items: ChatMessage[] = payload.map((m: any) => ({
        id: m.id,
        from: m.sender?.role === authRole ? 'me' as const : 'them' as const,
        text: m.body ?? '',
        time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        read: !!m.read_at,
      }));
      setMessages(items.reverse());
    } catch {
      setMessages([]);
    }
  }, [fallbackCompany?.id, authRole]);

  // ── Mark messages as read ────────────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    if (!fallbackCompany?.id) return;
    try {
      await api.patch(`/matches/${fallbackCompany.id}/messages/read`, {});
    } catch { /* silent */ }
  }, [fallbackCompany?.id]);

  // ── Real-time: subscribe to match channel ───────────────────────────────────
  useMatchChannel(fallbackCompany?.id, {
    onMessage: (data: IncomingMessage) => {
      console.log('🔥 onMessage callback fired in ConversationScreen', {
        data,
        authRole,
        currentMessagesCount: messages.length,
      });

      const isMe = data.sender_role === authRole;
      const newMsg: ChatMessage = {
        id: data.id,
        from: isMe ? 'me' : 'them',
        text: data.body,
        time: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: !!data.read_at,
      };

      console.log('📝 New message object created:', newMsg);

      setMessages((prev) => {
        console.log('📊 Current messages before update:', prev.length);
        const exists = prev.some((m) => m.id === data.id);
        console.log('❓ Message already exists?', exists);

        if (exists) return prev;

        const without = isMe
          ? prev.filter((m) => !(m.sending && m.text === data.body))
          : prev;

        const updated = [...without, newMsg];
        console.log('✅ Updated messages:', updated.length, 'New message added:', newMsg.text.substring(0, 20));
        return updated;
      });

      if (!isMe) markAsRead();
    },
    onTyping: () => {
      console.log('⌨️ onTyping callback fired');
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
    },
    onReadReceipt: () => {
      setMessages((prev) =>
        prev.map((m) => (m.from === 'me' ? { ...m, read: true } : m))
      );
    },
  });

  useEffect(() => {
    fetchMessages();
    markAsRead();

    // Poll every 4 s as a reliable fallback for WebSocket delivery.
    // WS stays active — if it fires the message appears instantly;
    // the poll guarantees it shows up even when WS events are dropped.
    const pollInterval = setInterval(() => {
      fetchMessages();
      markAsRead();
    }, 4000);

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      clearInterval(pollInterval);
    };
  }, [fetchMessages, markAsRead]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });

    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        if (Platform.OS === 'android') {
          const windowHeight = Dimensions.get('window').height;
          setKeyboardHeight(Math.max(0, windowHeight - e.endCoordinates.screenY));
        } else {
          setKeyboardHeight(e.endCoordinates.height);
        }
      },
    );

    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
    return () => clearTimeout(timeout);
  }, [messages.length]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  // Debounced typing indicator — fires at most once every 2 seconds
  const emitTyping = useCallback(() => {
    if (!fallbackCompany?.id || !canChat) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;
    api.post(`/matches/${fallbackCompany.id}/messages/typing`, {}).catch(() => { });
  }, [fallbackCompany?.id, canChat]);

  const sendMessage = async () => {
    if (!fallbackCompany) return;
    const text = draft.trim();
    if (!text || !canChat) return;

    const sentAt = formatConversationTime();
    const tempId = Date.now();
    const tempMsg: ChatMessage = { id: tempId, from: 'me', text, time: sentAt, sending: true };
    setMessages((prev) => [...prev, tempMsg]);
    setDraft('');
    scrollToBottom();

    try {
      // If this is a pending match and the first message, accept the match first
      if (isPendingMatch && messages.length === 0) {
        await api.post(`/applicant/matches/${fallbackCompany.id}/accept`, {});
        onSendFirstMessage(fallbackCompany.id, text, sentAt);
      } else {
        onSendFirstMessage(fallbackCompany.id, text, sentAt);
      }

      // Persist message to backend
      await api.post(`/matches/${fallbackCompany.id}/messages`, { body: text });
      // Fallback re-fetch if WS doesn't deliver within 3s
      setTimeout(() => {
        setMessages((prev) => {
          const stillPending = prev.some((m) => m.sending && m.text === text);
          if (stillPending) fetchMessages();
          return prev;
        });
      }, 3000);
    } catch (err) {
      console.error('Failed to send message or accept match:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const bannerText = (() => {
    if (isPendingMatch && company) return `Send your first message within ${formatRemainingTime(getTimeLeft(company, currentTime))} to keep this conversation active.`;
    if (isExpiredMatch || isExpiredConversation) return 'This conversation expired because no message was sent within the 24-hour reply window.';
    if (isClosedConversation) return 'This conversation is closed. You can still leave a review, but you can no longer send messages.';
    return null;
  })();

  if (!fallbackCompany) return null;

  return (
    <View style={[styles.chatScreen, { backgroundColor: T.bg, paddingTop: topInset }]}>
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />

      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: '#fff', borderColor: 'rgba(124,58,237,0.12)' }]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={T.primary} />
        </TouchableOpacity>

        <View style={[styles.chatHeaderLogo, { backgroundColor: fallbackCompany.color }]}>
          <Text style={styles.chatHeaderLogoText}>{fallbackCompany.abbr}</Text>
        </View>

        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderCompany}>{fallbackCompany.company}</Text>
          {isTyping
            ? <Text style={[styles.chatHeaderRole, { color: T.primary, fontStyle: 'italic' }]}>typing...</Text>
            : <Text style={styles.chatHeaderRole}>{fallbackCompany.role}</Text>
          }
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={[styles.chatContent, { paddingBottom: keyboardHeight > 0 ? 16 : tabBarHeight + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {bannerText ? (
          <View style={styles.chatBanner}>
            <MaterialCommunityIcons
              name={isExpiredMatch || isExpiredConversation ? 'clock-alert-outline' : isClosedConversation ? 'lock-outline' : 'message-badge-outline'}
              size={14}
              color={T.primary}
            />
            <Text style={styles.chatBannerText}>{bannerText}</Text>
          </View>
        ) : null}

        {messages.map((message, index) => {
          const isMe = message.from === 'me';
          const previous = messages[index - 1];
          const next = messages[index + 1];
          const isFirst = index === 0 || previous.from !== message.from;
          const isLast = index === messages.length - 1 || next.from !== message.from;

          return (
            <View
              key={message.id}
              style={[
                styles.bubbleWrap,
                isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem,
                isFirst && { marginTop: 8 },
              ]}
            >
              {!isMe && isFirst ? (
                <View style={[styles.chatAvatar, { backgroundColor: fallbackCompany.color }]}>
                  <Text style={styles.chatAvatarText}>{fallbackCompany.abbr}</Text>
                </View>
              ) : !isMe ? (
                <View style={styles.chatAvatarSpacer} />
              ) : null}

              <View style={styles.bubbleCol}>
                <View
                  style={[
                    styles.bubble,
                    isMe ? [styles.bubbleMe, { backgroundColor: message.sending ? `${T.primary}aa` : T.primary }] : styles.bubbleThem,
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: isMe ? '#fff' : '#1f1838' }]}>{message.text}</Text>
                </View>
                {isLast ? (
                  <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                    {message.time}{message.sending ? ' · Sending…' : ''}
                  </Text>
                ) : null}
                {isMe && isLast && message.read && index === messages.length - 1 ? (
                  <Text style={[styles.bubbleTime, styles.bubbleTimeMe, { color: T.primary, fontSize: 10, marginTop: 2 }]}>
                    ✓✓ Read
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}


      </ScrollView>

      {isClosedConversation ? (
        <View style={[styles.chatFooterLocked, { paddingBottom: tabBarHeight + 10 }]}>
          <TouchableOpacity
            style={[styles.footerReviewButton, { backgroundColor: T.primary }]}
            activeOpacity={0.85}
            onPress={() => onOpenReview(fallbackCompany.id)}
          >
            <MaterialCommunityIcons name="star-outline" size={16} color="#fff" />
            <Text style={styles.footerReviewButtonText}>Leave a review</Text>
          </TouchableOpacity>
        </View>
      ) : canChat ? (
        <View
          style={[
            styles.chatInputBar,
            {
              paddingBottom: keyboardHeight > 0 ? 8 : tabBarHeight + 8,
              borderTopColor: 'rgba(124,58,237,0.12)',
            },
          ]}
        >
          <TextInput
            style={styles.chatInput}
            value={draft}
            onChangeText={(t) => { setDraft(t); emitTyping(); }}
            placeholder={isPendingMatch ? 'Start the conversation...' : 'Message...'}
            placeholderTextColor="#9f98b7"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.chatSendButton, { backgroundColor: T.primary }, !draft.trim() && styles.chatSendButtonDisabled]}
            activeOpacity={0.85}
            onPress={sendMessage}
            disabled={!draft.trim()}
          >
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.chatFooterLocked, { paddingBottom: tabBarHeight + 10 }]}>
          <MaterialCommunityIcons name="message-off-outline" size={16} color="#9f98b7" />
          <Text style={styles.chatFooterLockedText}>
            {isExpiredMatch || isExpiredConversation ? 'Conversation expired' : 'Messaging locked'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ReviewScreen({
  conversation,
  reviews,
  tabBarHeight,
  onBack,
  onSubmit,
}: {
  conversation: Conversation;
  reviews: Review[];
  tabBarHeight: number;
  onBack: () => void;
  onSubmit: (rating: number, title: string, body: string) => void;
}) {
  const T = useTheme();
  const { top: topInset } = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const details = getReviewDetails(conversation);
  const activePhoto = details.photos[selectedPhotoIndex] ?? details.banner;

  return (
    <View style={[styles.reviewScreen, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.reviewScroll, { paddingBottom: tabBarHeight + 28 }]}>
        <View style={styles.reviewBannerWrap}>
          <Image source={details.banner} style={styles.reviewBannerImage} resizeMode="cover" />
          <View style={styles.reviewBannerOverlay} />

          <View style={[styles.reviewHeader, { paddingTop: topInset + 8 }]}>
            <TouchableOpacity style={styles.reviewBackButton} activeOpacity={0.7} onPress={onBack}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.reviewHero}>
            <View style={[styles.reviewHeroLogo, { backgroundColor: conversation.color }]}>
              <Text style={styles.reviewHeroLogoText}>{conversation.abbr}</Text>
            </View>
            <Text style={styles.reviewCompany}>{conversation.company}</Text>
            <Text style={styles.reviewRoleLabel}>{conversation.role}</Text>
            <View style={styles.reviewMetaRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color="rgba(255,255,255,0.88)" />
              <Text style={styles.reviewMetaText}>{details.location}</Text>
            </View>
            <View style={styles.reviewClosedTag}>
              <MaterialCommunityIcons name="lock-outline" size={12} color="#d9d5e6" />
              <Text style={styles.reviewClosedTagText}>Closed conversation</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewCardPanel}>
          <Text style={styles.reviewSectionEyebrow}>About the company</Text>
          <Text style={styles.reviewAboutTitle}>{conversation.company}</Text>
          <Text style={styles.reviewAboutLocation}>{details.location}</Text>
          <Text style={styles.reviewAboutCopy}>{details.about}</Text>
        </View>

        <View style={styles.reviewCardPanel}>
          <Text style={styles.reviewSectionEyebrow}>Company photos</Text>
          <Image source={activePhoto} style={styles.reviewGalleryMain} resizeMode="cover" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewThumbRow}>
            {details.photos.map((photo, index) => {
              const selected = index === selectedPhotoIndex;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.85}
                  onPress={() => setSelectedPhotoIndex(index)}
                  style={[styles.reviewThumbWrap, selected && { borderColor: conversation.color }]}
                >
                  <Image source={photo} style={styles.reviewThumb} resizeMode="cover" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.reviewCardPanel}>
          <Text style={styles.reviewSectionEyebrow}>Write a review</Text>
          <Text style={styles.reviewSectionTitle}>Rate your experience</Text>

          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} activeOpacity={0.75} onPress={() => setRating(star)}>
                <MaterialCommunityIcons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={star <= rating ? '#f59e0b' : '#d2c8ef'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.reviewLabel}>Review title</Text>
          <TextInput
            style={styles.reviewInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Summarise your experience..."
            placeholderTextColor="#9f98b7"
            maxLength={80}
          />

          <Text style={styles.reviewLabel}>Your review</Text>
          <TextInput
            style={[styles.reviewInput, styles.reviewTextArea]}
            value={body}
            onChangeText={setBody}
            placeholder="Share details about communication, interview flow, and overall experience..."
            placeholderTextColor="#9f98b7"
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitReviewButton, { backgroundColor: T.primary }, (!rating || !title.trim() || !body.trim()) && styles.submitReviewButtonDisabled]}
            activeOpacity={0.85}
            onPress={() => onSubmit(rating, title.trim(), body.trim())}
            disabled={!rating || !title.trim() || !body.trim()}
          >
            <MaterialCommunityIcons name="send" size={16} color="#fff" />
            <Text style={styles.submitReviewButtonText}>Submit review</Text>
          </TouchableOpacity>
        </View>

        {reviews.length > 0 ? (
          <View style={styles.reviewHistory}>
            <Text style={styles.reviewSectionTitle}>Your previous reviews</Text>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewHistoryCard}>
                <View style={styles.reviewHistoryTop}>
                  <View style={styles.reviewHistoryStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialCommunityIcons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={13}
                        color={star <= review.rating ? '#f59e0b' : '#d2c8ef'}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewHistoryDate}>{review.date}</Text>
                </View>
                <Text style={styles.reviewHistoryTitle}>{review.title}</Text>
                <Text style={styles.reviewHistoryBody}>{review.body}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

export default function MatchesTab() {
  const T = useTheme();
  const tabBarHeight = useTabBarHeight();
  const { top: topInset } = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [matchCompanies, setMatchCompanies] = useState<MatchCompany[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<MatchId | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<MatchId | null>(null);
  const [reviewCompanyId, setReviewCompanyId] = useState<MatchId | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<Review[]>([]);
  const [decliningMatchId, setDecliningMatchId] = useState<MatchId | null>(null);

  // ── Decline match function ──────────────────────────────────────────────
  const handleDeclineMatch = (matchId: MatchId, companyName: string) => {
    Alert.alert(
      'Decline Match',
      `Are you sure you want to decline this match with ${companyName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setDecliningMatchId(matchId);
            try {
              await api.post(`/applicant/matches/${matchId}/decline`, {});

              // Remove match from local state
              setMatchCompanies(prev => prev.filter(m => m.id !== matchId));
              setConversations(prev => prev.filter(c => c.id !== matchId));

              // Show brief feedback
              Alert.alert('Match Declined', 'This match has been removed from your list.');
            } catch (err: any) {
              console.error('Decline match error:', err);
              Alert.alert('Error', err?.message || 'Failed to decline match. Please try again.');
            } finally {
              setDecliningMatchId(null);
            }
          },
        },
      ]
    );
  };

  // ── Load matches and conversations from API ──────────────────────────────
  useEffect(() => {
    const COLORS = ['#7c3aed', '#9333ea', '#a855f7', '#6366f1', '#06b6d4', '#22c55e'];
    const getColor = (i: number) => COLORS[i % COLORS.length];
    const getAbbr = (name: string) => name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    api.get('/applicant/matches').then((matchesRaw: any) => {
      const items = Array.isArray(matchesRaw)
        ? matchesRaw
        : (Array.isArray(matchesRaw?.data) ? matchesRaw.data : []);

      const matches = items.map((m: any, i: number) => {
        const job = m.job_posting ?? m.jobPosting ?? {};
        const company = job.company ?? {};
        const companyName = company.company_name ?? m.company_name ?? 'Company';
        const matchedAt = m.matched_at ?? m.created_at;
        const status = m.status as string | undefined;
        const startedAt = status && status !== 'pending' ? Date.now() : undefined;

        return {
          id: String(m.id),
          abbr: getAbbr(companyName),
          color: getColor(i),
          company: companyName,
          role: job.title ?? m.job_title ?? '',
          status: mapBackendStatusToUiStatus(status),
          prompt: m.initial_message ?? '',
          startedAt,
          matchCreatedAt: matchedAt ? new Date(matchedAt).getTime() : now,
          badgeCount: m.unread_count ?? 0,
        };
      });
      setMatchCompanies(matches);

      const convs = items
        .filter((m: any) => (m.status ?? 'pending') !== 'pending')
        .map((m: any, i: number) => {
          const job = m.job_posting ?? m.jobPosting ?? {};
          const company = job.company ?? {};
          const companyName = company.company_name ?? m.company_name ?? 'Company';
          const status = m.status as string | undefined;
          const lastMessageAt = m.responded_at ?? m.matched_at ?? m.created_at;

          return {
            id: String(m.id),
            companyId: String(m.id),
            abbr: getAbbr(companyName),
            color: getColor(i),
            company: companyName,
            role: job.title ?? m.job_title ?? '',
            status: mapBackendStatusToUiStatus(status),
            lastMsg: m.initial_message ?? 'Conversation started.',
            time: lastMessageAt ? new Date(lastMessageAt).toLocaleDateString() : '',
            unread: m.unread_count ?? 0,
            state: mapBackendStatusToConversationState(status),
          };
        });
      setConversations(convs);
    }).catch(() => { /* keep empty arrays on error */ });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const unreadMessages = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
  const reviewConversation = reviewCompanyId ? conversations.find((item) => item.companyId === reviewCompanyId) ?? null : null;
  const selectedMatch = selectedMatchId
    ? matchCompanies.find((item) => item.id === selectedMatchId) ?? null
    : null;

  const visibleMatches = matchCompanies.filter((match) => !match.startedAt && getMatchState(match, currentTime) !== 'expired');
  const expiredConversations: Conversation[] = matchCompanies
    .filter((match) => !match.startedAt && getMatchState(match, currentTime) === 'expired')
    .map((match) => ({
      id: `expired-${match.id}`,
      companyId: match.id,
      abbr: match.abbr,
      color: match.color,
      company: match.company,
      role: match.role,
      status: match.status,
      lastMsg: 'This conversation expired because no message was sent in time.',
      time: 'Expired',
      unread: 0,
      state: 'expired',
    }));
  const visibleConversations = [...expiredConversations, ...conversations];
  const selectedConversation = selectedConversationId
    ? visibleConversations.find((item) => item.id === selectedConversationId) ?? null
    : null;

  const openPendingMatch = (matchId: MatchId) => {
    setSelectedMatchId(matchId);
  };

  const openConversation = (conversationId: MatchId) => {
    setConversations((prev) =>
      prev.map((item) => (item.id === conversationId ? { ...item, unread: 0 } : item)),
    );
    setSelectedConversationId(conversationId);
  };

  const handleSendFirstMessage = (companyId: MatchId, text: string, time: string) => {
    const existingConversation = conversations.find((item) => item.companyId === companyId);

    if (existingConversation) {
      setConversations((prev) =>
        prev.map((item) =>
          item.companyId === companyId
            ? { ...item, lastMsg: text, time, unread: 0 }
            : item,
        ),
      );
      return;
    }

    const match = matchCompanies.find((item) => item.id === companyId);
    if (!match) return;

    const newConversation: Conversation = {
      id: String(Date.now()),
      companyId: match.id,
      abbr: match.abbr,
      color: match.color,
      company: match.company,
      role: match.role,
      status: match.status,
      lastMsg: text,
      time,
      unread: 0,
      state: 'active',
    };

    setMatchCompanies((prev) =>
      prev.map((item) =>
        item.id === companyId ? { ...item, startedAt: Date.now() } : item,
      ),
    );
    setConversations((prev) => [newConversation, ...prev]);
    setSelectedConversationId(newConversation.id);
    setSelectedMatchId(null);
  };

  const handleSubmitReview = (rating: number, title: string, body: string) => {
    if (!reviewConversation) return;

    setSubmittedReviews((prev) => [
      {
        id: Date.now(),
        companyId: reviewConversation.companyId,
        rating,
        title,
        body,
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      },
      ...prev,
    ]);
    setReviewCompanyId(null);
  };

  if (reviewConversation) {
    return (
      <ReviewScreen
        conversation={reviewConversation}
        reviews={submittedReviews.filter((review) => review.companyId === reviewConversation.companyId)}
        tabBarHeight={tabBarHeight}
        onBack={() => setReviewCompanyId(null)}
        onSubmit={handleSubmitReview}
      />
    );
  }

  if (selectedMatch || selectedConversation) {
    return (
      <ConversationScreen
        company={selectedMatch}
        conversation={selectedConversation}
        currentTime={currentTime}
        tabBarHeight={tabBarHeight}
        onBack={() => {
          setSelectedMatchId(null);
          setSelectedConversationId(null);
        }}
        onSendFirstMessage={handleSendFirstMessage}
        onOpenReview={setReviewCompanyId}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#f6f2ff', paddingTop: topInset }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Matches</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.pageScroll,
          { paddingBottom: tabBarHeight + 28 },
          // Center content when there are no matches and no conversations
          (visibleMatches.length === 0 && visibleConversations.length === 0) && styles.pageScrollCentered
        ]}
      >
        {visibleMatches.length > 0 && (
          <MatchCarousel
            matches={visibleMatches}
            currentTime={currentTime}
            onOpen={openPendingMatch}
            onDecline={handleDeclineMatch}
            decliningMatchId={decliningMatchId}
          />
        )}
        <MessagesList
          conversations={visibleConversations}
          onOpenConversation={openConversation}
          onOpenReview={setReviewCompanyId}
          hasMatches={visibleMatches.length > 0}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1b1438',
    letterSpacing: -0.6,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pageScroll: { paddingHorizontal: 20 },
  pageScrollCentered: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - 200,
  },
  sectionRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  sectionAction: { fontSize: 14, fontWeight: '800' },
  matchPanel: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 18,
    shadowColor: '#1a1233',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  matchPanelRow: {
    paddingRight: 8,
    gap: 12,
  },
  matchCard: {
    width: 86,
    alignItems: 'center',
  },
  matchAvatarWrap: {
    width: 68,
    height: 68,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAvatarInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  matchName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1b1438',
    textAlign: 'center',
  },
  matchRole: {
    marginTop: 2,
    fontSize: 11,
    color: '#9a93b1',
    textAlign: 'center',
  },
  matchMeta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  matchMetaExpired: {
    color: '#ef4444',
  },
  declineBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  declineBtnText: {
    fontSize: 10,
    color: '#9a93b1',
    textAlign: 'center',
  },
  ringWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 0,
    fontWeight: '900',
    color: '#231942',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1b1438',
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: '#8f8aa4',
    textAlign: 'center',
  },
  messagePanel: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#1a1233',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(26,18,51,0.08)',
    marginVertical: 8,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  msgRowClosed: {
    opacity: 0.68,
  },
  msgBody: { flex: 1 },
  msgTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  msgCompany: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b1438',
  },
  msgTime: {
    fontSize: 11,
    color: '#a29ab8',
  },
  msgRole: {
    fontSize: 13,
    color: '#8f8aa4',
    marginBottom: 4,
  },
  msgPreview: {
    fontSize: 13,
    color: '#6a6480',
    marginBottom: 6,
  },
  msgFaded: {
    color: '#9e99af',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  closedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(143,138,164,0.12)',
  },
  closedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8f8aa4',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  reviewButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatScreen: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderLogoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderCompany: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1b1438',
  },
  chatHeaderRole: {
    fontSize: 12,
    color: '#8f8aa4',
    marginTop: 2,
  },
  chatStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chatStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatScroll: { flex: 1 },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  chatBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.1)',
  },
  chatBannerText: {
    flex: 1,
    color: '#6a6480',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  bubbleWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 2,
  },
  bubbleWrapMe: { justifyContent: 'flex-end' },
  bubbleWrapThem: { justifyContent: 'flex-start' },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  chatAvatarText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  chatAvatarSpacer: {
    width: 28,
  },
  bubbleCol: {
    maxWidth: SCREEN_WIDTH * 0.72,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.08)',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    color: '#a29ab8',
    marginTop: 3,
  },
  bubbleTimeMe: {
    textAlign: 'right',
  },
  bubbleTimeThem: {
    textAlign: 'left',
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.08)',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#a29ab8',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#1b1438',
    fontSize: 14,
  },
  chatSendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.35,
  },
  chatFooterLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(124,58,237,0.12)',
  },
  chatFooterLockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9f98b7',
  },
  footerReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  footerReviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  reviewScreen: {
    flex: 1,
  },
  reviewHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 20,
  },
  reviewBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  reviewScroll: {
    paddingBottom: 36,
  },
  reviewBannerWrap: {
    height: 360,
    marginBottom: 18,
    justifyContent: 'flex-end',
    backgroundColor: '#140f23',
  },
  reviewBannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  reviewBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,5,16,0.56)',
  },
  reviewHero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 6,
  },
  reviewHeroLogo: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  reviewHeroLogoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  reviewCompany: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.8,
  },
  reviewRoleLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewMetaText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewClosedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  reviewClosedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f5f3ff',
  },
  reviewCardPanel: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    marginHorizontal: 20,
  },
  reviewSectionEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#8f8aa4',
    marginBottom: 12,
  },
  reviewAboutTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1b1438',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  reviewAboutLocation: {
    fontSize: 15,
    color: '#7a7392',
    fontWeight: '700',
    marginBottom: 14,
  },
  reviewAboutCopy: {
    fontSize: 16,
    lineHeight: 28,
    color: '#2c2445',
  },
  reviewGalleryMain: {
    width: '100%',
    height: 240,
    borderRadius: 24,
    marginBottom: 14,
  },
  reviewThumbRow: {
    gap: 10,
    paddingRight: 4,
  },
  reviewThumbWrap: {
    width: 94,
    height: 94,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: '#ede9fe',
  },
  reviewThumb: {
    width: '100%',
    height: '100%',
  },
  reviewSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1b1438',
    marginBottom: 14,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#615a78',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.1)',
    backgroundColor: '#faf8ff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1b1438',
    marginBottom: 14,
  },
  reviewTextArea: {
    minHeight: 120,
  },
  submitReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
  submitReviewButtonDisabled: {
    opacity: 0.4,
  },
  submitReviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  reviewHistory: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 20,
  },
  reviewHistoryCard: {
    paddingTop: 14,
  },
  reviewHistoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewHistoryStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewHistoryDate: {
    fontSize: 11,
    color: '#a29ab8',
  },
  reviewHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1b1438',
    marginBottom: 4,
  },
  reviewHistoryBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6a6480',
  },
});
