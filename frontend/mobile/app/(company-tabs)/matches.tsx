import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Dimensions, TextInput, Image,
  Keyboard, KeyboardEvent, BackHandler, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// TODO: Add tests for company matches screen
// Test cases should cover:
// - Loading matches from API
// - Filtering by status
// - Messaging integration
// - Close match functionality
// - Review submission
// - Error handling

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:          '#0f0a1e',
  surface:     '#16102a',
  surfaceHigh: '#1e1535',
  border:      'rgba(168,85,247,0.18)',
  borderFaint: 'rgba(255,255,255,0.07)',
  primary:     '#a855f7',
  primaryDark: '#7c3aed',
  textPrimary: '#ffffff',
  textSub:     'rgba(255,255,255,0.55)',
  textHint:    'rgba(255,255,255,0.35)',
  warning:     '#f59e0b',
  warningLight:'rgba(245,158,11,0.12)',
  success:     '#22c55e',
  successLight:'rgba(34,197,94,0.12)',
  rose:        '#ec4899',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'new' | 'screening' | 'interview' | 'offer' | 'closed';

type Match = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: Status;
  lastMsg?: string;
  time?: string;
  unread: number;
  expired?: boolean;
  applicantId: number;
  jobId: number;
  jobTitle?: string;
};

const PIPELINE_STAGES: {
  key: Status; label: string; icon: string; bg: string; text: string;
}[] = [
  { key: 'new',       label: 'New',       icon: 'account-plus-outline',   bg: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.5)' },
  { key: 'screening', label: 'Screening', icon: 'account-search-outline', bg: T.warningLight,           text: '#fbbf24'               },
  { key: 'interview', label: 'Interview', icon: 'video-outline',          bg: 'rgba(168,85,247,0.15)',  text: '#c084fc'               },
  { key: 'offer',     label: 'Offer 🎉',  icon: 'star-outline',           bg: T.successLight,           text: '#4ade80'               },
  { key: 'closed',    label: 'Closed',    icon: 'lock-outline',           bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)' },
];

// ─── Chat data ────────────────────────────────────────────────────────────────
type ChatMessage = { id: number; from: 'me' | 'them'; text: string; time: string; };

// ─── Review types ─────────────────────────────────────────────────────────────
type Review = {
  id: number; applicantId: string; rating: number;
  title: string; body: string; date: string;
};

// ─── Ghost cards ──────────────────────────────────────────────────────────────
function GhostCard({ rotate, translateX, translateY, blur }: {
  rotate: string; translateX: number; translateY: number; blur?: boolean;
}) {
  return (
    <View style={[s.ghostCard, { transform: [{ rotate }, { translateX }, { translateY }], opacity: blur ? 0.4 : 0.85 }]}>
      <View style={s.ghostPhoto}>
        <MaterialCommunityIcons name="account" size={44} color="rgba(168,85,247,0.3)" />
      </View>
      <View style={s.ghostMeta}>
        <View style={[s.ghostLine, { width: 72 }]} />
        <View style={[s.ghostLine, { width: 46, marginTop: 6 }]} />
      </View>
    </View>
  );
}

function EmptyMatchesState() {
  const T = useTheme();
  return (
    <View style={s.emptyWrap}>
      <View style={s.ghostStack}>
        <GhostCard rotate="8deg"  translateX={42}  translateY={10} blur />
        <GhostCard rotate="-4deg" translateX={-10} translateY={0} />
        <View style={s.boltBadge}>
          <MaterialCommunityIcons name="lightning-bolt" size={17} color="#fff" />
        </View>
      </View>
      <Text style={[s.emptyTitle, { color: T.textPrimary }]}>No applicants yet.{'\n'}Start swiping to find talent!</Text>
      <Text style={[s.emptySub, { color: T.textSub }]}>Swipe on candidate profiles to match with top applicants for your open roles.</Text>
      <TouchableOpacity style={[s.boostBtn, { backgroundColor: T.primary, shadowColor: T.primary }]} activeOpacity={0.85}>
        <View style={s.boostIconWrap}>
          <MaterialCommunityIcons name="rocket-launch" size={15} color="#fff" />
        </View>
        <Text style={s.boostBtnText}>Boost Job Post</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={[s.editProfileText, { color: T.textSub }]}>Edit Job Listing</Text>
      </TouchableOpacity>
    </View>
  );
}

function SegmentTabs({ tabs, active, onSelect }: {
  tabs: { key: string; label: string; badge?: number }[];
  active: string;
  onSelect: (key: string) => void;
}) {
  const T = useTheme();
  return (
    <View style={[s.segWrap, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[s.segTab, isActive && { backgroundColor: T.primary }]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.75}
          >
            <Text style={[s.segTabText, { color: isActive ? '#fff' : T.textSub }]}>{tab.label}</Text>
            {!!tab.badge && tab.badge > 0 && (
              <View style={s.segBadge}>
                <Text style={s.segBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ApplicantAvatar({ uri, size = 52 }: { uri: string; size?: number }) {
  const T = useTheme();
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: T.border }}
    />
  );
}

// ─── Conversation Screen ──────────────────────────────────────────────────────
function ConversationScreen({
  applicant,
  onBack,
  tabBarHeight,
}: {
  applicant: Match;
  onBack: () => void;
  tabBarHeight: number;
}) {
  const T = useTheme();
  const authRole = useAuthStore((s) => s.role);
  const { top: topInset } = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs: any = await api.get(`/matches/${applicant.id}/messages`);
      const payload = Array.isArray(msgs) ? msgs : (Array.isArray(msgs?.data) ? msgs.data : []);
      const items = payload.map((m: any) => ({
        id: m.id,
        from: m.sender?.role === authRole ? 'me' as const : 'them' as const,
        text: m.body ?? '',
        time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      }));
      setMessages(items.reverse());
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [applicant.id, authRole]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    const SCREEN_H = Dimensions.get('screen').height;
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardHeight(SCREEN_H - e.endCoordinates.screenY);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 100);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Client-side optimistic update
    const tempId = Date.now();
    setMessages((prev) => [...prev, { id: tempId, from: 'me', text, time: now }]);
    setDraft('');
    scrollToBottom();

    try {
      await api.post(`/matches/${applicant.id}/messages`, { body: text });
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const stage = PIPELINE_STAGES.find(st => st.key === applicant.status);

  return (
    <View style={[cs.screen, { paddingTop: topInset, backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={cs.header}>
        <TouchableOpacity onPress={onBack} style={[cs.backBtn, { backgroundColor: T.surface, borderColor: T.borderFaint }]} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={T.primary} />
        </TouchableOpacity>
        <Image source={{ uri: applicant.avatar }} style={cs.headerAvatar} />
        <View style={cs.headerInfo}>
          <Text style={[cs.headerName, { color: T.textPrimary }]}>{applicant.name}</Text>
          {isTyping
            ? <Text style={[cs.typingLabel, { color: T.primary }]}>typing...</Text>
            : <Text style={[cs.headerRole, { color: T.textSub }]}>{applicant.role}</Text>
          }
        </View>
        {stage && (
          <View style={[cs.statusBadge, { backgroundColor: stage.bg }]}>
            <Text style={[cs.statusBadgeText, { color: stage.text }]}>{stage.label}</Text>
          </View>
        )}
      </View>
      <View style={[cs.headerDivider, { backgroundColor: T.borderFaint }]} />

      {/* Messages + input */}
      <View style={[{ flex: 1 }, keyboardHeight > 0 && { marginBottom: keyboardHeight }]}>
        <ScrollView
          ref={scrollRef}
          style={cs.msgScroll}
          contentContainerStyle={[
            cs.msgContent,
            { paddingBottom: keyboardHeight > 0 ? 16 : tabBarHeight + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(false)}
        >
          {messages.map((msg, i) => {
            const isMe = msg.from === 'me';
            const prevMsg = messages[i - 1];
            const nextMsg = messages[i + 1];
            const isFirstInGroup = i === 0 || prevMsg.from !== msg.from;
            const isLastInGroup  = i === messages.length - 1 || nextMsg?.from !== msg.from;

            return (
              <View
                key={msg.id}
                style={[
                  cs.bubbleWrap,
                  isMe ? cs.bubbleWrapMe : cs.bubbleWrapThem,
                  isFirstInGroup && { marginTop: 8 },
                ]}
              >
                {!isMe && isFirstInGroup && (
                  <Image source={{ uri: applicant.avatar }} style={cs.bubbleAvatar} />
                )}
                {!isMe && !isFirstInGroup && <View style={cs.bubbleAvatarSpacer} />}
                <View style={cs.bubbleCol}>
                  <View style={[
                    cs.bubble,
                    isMe ? [cs.bubbleMe, { backgroundColor: T.primary }] : [cs.bubbleThem, { backgroundColor: T.surfaceHigh, borderColor: T.borderFaint }],
                    !isMe && isFirstInGroup && cs.bubbleThemFirst,
                    !isMe && isLastInGroup  && cs.bubbleThemLast,
                    isMe  && isFirstInGroup && cs.bubbleMeFirst,
                    isMe  && isLastInGroup  && cs.bubbleMeLast,
                  ]}>
                    <Text style={[cs.bubbleText, isMe ? cs.bubbleTextMe : [cs.bubbleTextThem, { color: T.textPrimary }]]}>
                      {msg.text}
                    </Text>
                  </View>
                  {isLastInGroup && (
                    <Text style={[cs.bubbleTime, { color: T.textHint }, isMe ? cs.bubbleTimeMe : cs.bubbleTimeThem]}>
                      {msg.time}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {isTyping && (
            <View style={[cs.bubbleWrap, cs.bubbleWrapThem, { marginTop: 8 }]}>
              <Image source={{ uri: applicant.avatar }} style={cs.bubbleAvatar} />
              <View style={[cs.bubble, cs.bubbleThem, cs.typingBubble, { backgroundColor: T.surfaceHigh, borderColor: T.borderFaint }]}>
                <View style={cs.typingDots}>
                  <View style={[cs.typingDot, cs.typingDot1]} />
                  <View style={[cs.typingDot, cs.typingDot2]} />
                  <View style={[cs.typingDot, cs.typingDot3]} />
                </View>
              </View>
            </View>
          )}

          {applicant.expired && (
            <View style={[cs.expiredBanner, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
              <MaterialCommunityIcons name="lock-outline" size={13} color={T.textHint} />
              <Text style={[cs.expiredBannerText, { color: T.textHint }]}>This conversation has closed</Text>
            </View>
          )}
        </ScrollView>

        {!applicant.expired && (
          <View style={[cs.inputBar, { paddingBottom: keyboardHeight > 0 ? 8 : tabBarHeight + 8, backgroundColor: T.bg, borderTopColor: T.borderFaint }]}>
            <TextInput
              style={[cs.input, { backgroundColor: T.surface, borderColor: T.borderFaint, color: T.textPrimary }]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message…"
              placeholderTextColor={T.textHint}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[cs.sendBtn, { backgroundColor: T.primary }, !draft.trim() && cs.sendBtnDisabled]}
              onPress={sendMessage}
              activeOpacity={0.85}
              disabled={!draft.trim()}
            >
              <MaterialCommunityIcons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CompanyMatchesScreen() {
  const T = useTheme();
  const tabBarHeight = useTabBarHeight();
  const { top: topInset } = useSafeAreaInsets();
  
  // API state
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('matches');
  const [selectedConversation, setSelectedConversation] = useState<Match | null>(null);

  // Review state
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittedReviews, setSubmittedReviews] = useState<Review[]>([]);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Computed values
  const newMatches = matches.filter(m => m.status === 'new' && !m.expired);
  const activeMatches = matches.filter(m => !m.expired);
  const closedMatches = matches.filter(m => m.expired || m.status === 'closed');
  const totalUnread = matches.reduce((a, m) => a + m.unread, 0);
  const hasMatches = matches.length > 0;

  // Fetch matches from API
  const fetchMatches = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      const response: any = await api.get('/company/matches');
      
      // The axios interceptor unwraps `response.data` (the API envelope's `data` field),
      // so `response` here is the Laravel paginator: { data: [...], current_page, ... }
      const items: any[] = response?.data ?? [];
      
      const transformedMatches: Match[] = items.map((item: any) => {
        // `item.applicant` is the PostgreSQL ApplicantProfile.
        // `item.applicant.profile_data` is the MongoDB profile attached by the backend.
        const applicant = item.applicant ?? {};
        const profile = applicant.profile_data ?? {};
        
        // Map backend statuses (pending/accepted/closed/expired/declined) to UI statuses
        const rawStatus = item.status ?? 'pending';
        let uiStatus: Status;
        if (rawStatus === 'pending') uiStatus = 'new';
        else if (rawStatus === 'accepted') uiStatus = 'screening';
        else if (rawStatus === 'closed' || rawStatus === 'expired' || rawStatus === 'declined') uiStatus = 'closed';
        else uiStatus = 'new';

        const jobTitle = item.job_posting?.title ?? item.job_title ?? 'Not specified';

        return {
          id: String(item.id),
          name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown',
          role: profile.job_preferences?.desired_position ?? profile.desired_position ?? jobTitle,
          avatar: profile.profile_photo_url ?? '',
          status: uiStatus,
          lastMsg: item.last_message?.body ?? '',
          time: item.last_message?.created_at ? formatTime(item.last_message.created_at) : '',
          unread: item.unread_count ?? 0,
          expired: rawStatus === 'closed' || rawStatus === 'expired' || rawStatus === 'declined',
          applicantId: item.applicant_id ?? applicant.user_id,
          jobId: item.job_posting_id,
          jobTitle,
        };
      });
      
      setMatches(transformedMatches);
    } catch (err: any) {
      console.error('Failed to fetch matches:', err);
      setError(err?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatches(false);
  }, [fetchMatches]);

  // Format time helper
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    if (diffMins < 2880) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const selectedApplicant = closedMatches.find(a => a.id === selectedApplicantId);

  const handleSubmitReview = async () => {
    if (!selectedApplicantId || reviewRating === 0 || !reviewTitle.trim() || !reviewBody.trim()) return;
    
    try {
      // Find the match to get company ID
      const match = matches.find(m => m.id === selectedApplicantId);
      if (!match) return;
      
      // Submit review to API
      await api.post('/reviews', {
        company_id: match.jobId, // This should be company_id, need to verify backend
        rating: reviewRating,
        title: reviewTitle.trim(),
        body: reviewBody.trim(),
      });
      
      const review: Review = {
        id: Date.now(),
        applicantId: selectedApplicantId,
        rating: reviewRating,
        title: reviewTitle.trim(),
        body: reviewBody.trim(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      };
      
      setSubmittedReviews(prev => [review, ...prev]);
      setReviewSubmitted(true);
      setReviewRating(0);
      setReviewTitle('');
      setReviewBody('');
      
      setTimeout(() => {
        setReviewSubmitted(false);
        setSelectedApplicantId(null);
      }, 1800);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  const openApplicant = (id: string) => {
    setSelectedApplicantId(id);
    setReviewRating(0);
    setReviewTitle('');
    setReviewBody('');
    setReviewSubmitted(false);
  };

  const tabs = [
    { key: 'matches',  label: 'Matches',  badge: newMatches.length },
    { key: 'messages', label: 'Messages', badge: totalUnread },
    { key: 'reviews',  label: 'Review',   badge: 0 },
  ];

  // ── Full-screen conversation swap (mirrors teammate's pattern exactly) ──────
  if (selectedConversation) {
    return (
      <ConversationScreen
        applicant={selectedConversation}
        onBack={() => {
          setSelectedConversation(null);
          // Refresh matches when returning from conversation
          fetchMatches(false);
        }}
        tabBarHeight={tabBarHeight}
      />
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: topInset, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={{ color: T.textSub, marginTop: 16, fontSize: 14 }}>Loading matches...</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[s.screen, { paddingTop: topInset, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={T.danger} />
        <Text style={{ color: T.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Failed to load matches</Text>
        <Text style={{ color: T.textSub, fontSize: 14, marginTop: 8, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: T.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 }}
          onPress={() => fetchMatches()}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: topInset, backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={[s.pageTitle, { color: T.textPrimary }]}>Matches</Text>
          <TouchableOpacity style={[s.filterBtn, { backgroundColor: T.primary }]} activeOpacity={0.85}>
            <MaterialCommunityIcons name="filter-variant" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segment tabs */}
      <SegmentTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: tabBarHeight + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
            colors={[T.primary]}
          />
        }
      >
        {/* ══════════════ MATCHES TAB ══════════════ */}
        {activeTab === 'matches' && (
          hasMatches ? (
            <>
              <View style={s.sectionRow}>
                <Text style={[s.sectionTitle, { color: T.textPrimary }]}>New applicants</Text>
                <TouchableOpacity><Text style={[s.viewAll, { color: T.primary }]}>View all</Text></TouchableOpacity>
              </View>
              <View style={[s.card, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={s.newMatchRow}>
                    {newMatches.map(m => (
                      <TouchableOpacity key={m.id} style={s.newMatchItem} activeOpacity={0.8} onPress={() => setSelectedConversation(m)}>
                        <View style={{ position: 'relative' }}>
                          <ApplicantAvatar uri={m.avatar} size={56} />
                          <View style={s.newDot}>
                            <MaterialCommunityIcons name="lightning-bolt" size={9} color="#fff" />
                          </View>
                        </View>
                        <Text style={[s.newMatchName, { color: T.textPrimary }]} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                        <Text style={[s.newMatchRole, { color: T.textHint }]} numberOfLines={1}>{m.role}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={[s.sectionRow, { marginTop: 4 }]}>
                <Text style={[s.sectionTitle, { color: T.textPrimary }]}>Applicant pipeline</Text>
              </View>
              <View style={[s.card, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
                {PIPELINE_STAGES.filter(stage => stage.key !== 'closed').map((stage, si) => {
                  const stageApplicants = activeMatches.filter(p => p.status === stage.key);
                  if (!stageApplicants.length) return null;
                  return (
                    <View key={stage.key}>
                      {si > 0 && <View style={[s.divider, { backgroundColor: T.borderFaint }]} />}
                      <View style={s.stageHeader}>
                        <View style={[s.stagePill, { backgroundColor: stage.bg }]}>
                          <MaterialCommunityIcons name={stage.icon as any} size={12} color={stage.text} />
                          <Text style={[s.stagePillText, { color: stage.text }]}>{stage.label}</Text>
                        </View>
                        <Text style={[s.stageCount, { color: T.textHint }]}>{stageApplicants.length}</Text>
                      </View>
                      {stageApplicants.map(app => (
                        <TouchableOpacity key={app.id} style={s.pipelineRow} activeOpacity={0.8} onPress={() => setSelectedConversation(app)}>
                          <ApplicantAvatar uri={app.avatar} size={40} />
                          <View style={s.pipelineInfo}>
                            <Text style={[s.pipelineName, { color: T.textPrimary }]}>{app.name}</Text>
                            <Text style={[s.pipelineRole, { color: T.textSub }]}>{app.role}</Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={18} color={T.textHint} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <EmptyMatchesState />
          )
        )}

        {/* ══════════════ MESSAGES TAB ══════════════ */}
        {activeTab === 'messages' && (
          <>
            <View style={s.sectionRow}>
              <Text style={[s.sectionTitle, { color: T.textPrimary }]}>Recent conversations</Text>
            </View>
            <View style={[s.card, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
              {matches.map((msg, i) => (
                <View key={msg.id}>
                  {i > 0 && <View style={[s.divider, { backgroundColor: T.borderFaint }]} />}
                  <TouchableOpacity
                    style={[s.msgRow, msg.expired && s.msgRowExpired]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedConversation(msg)}
                  >
                    <View style={{ position: 'relative' }}>
                      <ApplicantAvatar uri={msg.avatar} size={48} />
                      {msg.unread > 0 && !msg.expired && (
                        <View style={s.unreadBadge}>
                          <Text style={s.unreadBadgeText}>{msg.unread}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.msgBody}>
                      <View style={s.msgTopRow}>
                        <Text style={[s.msgName, { color: T.textPrimary }, msg.expired && s.msgFaded]}>{msg.name}</Text>
                        <Text style={[s.msgTime, { color: T.textHint }]}>{msg.time}</Text>
                      </View>
                      <Text style={[s.msgRole, { color: T.textSub }, msg.expired && s.msgFaded]}>{msg.role}</Text>
                      <Text style={[s.msgPreview, msg.expired && s.msgFaded]} numberOfLines={1}>
                        {msg.lastMsg}
                      </Text>
                      {msg.expired ? (
                        <View style={s.expiredRow}>
                          <View style={s.closedTag}>
                            <MaterialCommunityIcons name="lock-outline" size={10} color={T.textHint} />
                            <Text style={s.closedTagText}>Conversation closed</Text>
                          </View>
                          <TouchableOpacity
                            style={s.leaveReviewBtn}
                            activeOpacity={0.8}
                            onPress={() => { openApplicant(msg.id); setActiveTab('reviews'); }}
                          >
                            <MaterialCommunityIcons name="star-outline" size={11} color={T.primary} />
                            <Text style={s.leaveReviewBtnText}>Leave a review</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={[
                          s.statusPill,
                          msg.status === 'screening' && { backgroundColor: T.warningLight },
                          msg.status === 'interview' && { backgroundColor: 'rgba(168,85,247,0.15)' },
                          msg.status === 'offer'     && { backgroundColor: T.successLight },
                          msg.status === 'new'       && { backgroundColor: 'rgba(255,255,255,0.07)' },
                        ]}>
                          <Text style={[
                            s.statusPillText,
                            msg.status === 'screening' && { color: '#fbbf24' },
                            msg.status === 'interview' && { color: '#c084fc' },
                            msg.status === 'offer'     && { color: '#4ade80' },
                            msg.status === 'new'       && { color: 'rgba(255,255,255,0.5)' },
                          ]}>
                            {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══════════════ REVIEWS TAB ══════════════ */}
        {activeTab === 'reviews' && (
          <>
            {selectedApplicant ? (
              <>
                <TouchableOpacity style={s.backBtn} onPress={() => setSelectedApplicantId(null)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="arrow-left" size={18} color={T.primary} />
                  <Text style={[s.backBtnText, { color: T.primary }]}>All applicants</Text>
                </TouchableOpacity>

                <View style={[s.detailCard, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
                  <View style={s.detailHeader}>
                    <ApplicantAvatar uri={selectedApplicant.avatar} size={64} />
                    <View style={{ marginLeft: 14 }}>
                      <Text style={[s.detailName, { color: T.textPrimary }]}>{selectedApplicant.name}</Text>
                      <Text style={[s.detailRole, { color: T.textSub }]}>{selectedApplicant.role}</Text>
                      <View style={s.closedTag}>
                        <MaterialCommunityIcons name="lock-outline" size={10} color={T.textHint} />
                        <Text style={s.closedTagText}>Conversation closed</Text>
                      </View>
                    </View>
                  </View>

                  <View style={s.detailDivider} />
                  <Text style={s.detailSectionLabel}>RATE THIS APPLICANT</Text>

                  {reviewSubmitted ? (
                    <View style={s.successCard}>
                      <MaterialCommunityIcons name="check-circle" size={40} color={T.success} />
                      <Text style={s.successCardTitle}>Review submitted!</Text>
                      <Text style={s.successCardSub}>Thank you for your feedback.</Text>
                    </View>
                  ) : (
                    <>
                      <View style={s.starsRow}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <TouchableOpacity key={star} onPress={() => setReviewRating(star)} activeOpacity={0.7}>
                            <MaterialCommunityIcons
                              name={star <= reviewRating ? 'star' : 'star-outline'}
                              size={36}
                              color={star <= reviewRating ? T.warning : T.borderFaint}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      {reviewRating > 0 && (
                        <Text style={s.ratingLabel}>
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][reviewRating]}
                        </Text>
                      )}
                      <Text style={[s.fieldLabel, { color: T.textSub }]}>Review title</Text>
                      <TextInput
                        style={[s.textField, { backgroundColor: T.surfaceHigh, borderColor: T.borderFaint, color: T.textPrimary }]}
                        value={reviewTitle}
                        onChangeText={setReviewTitle}
                        placeholder="Summarise your experience with this applicant…"
                        placeholderTextColor={T.textHint}
                        maxLength={80}
                      />
                      <Text style={[s.fieldLabel, { color: T.textSub }]}>Your review</Text>
                      <TextInput
                        style={[s.textField, s.textArea, { backgroundColor: T.surfaceHigh, borderColor: T.borderFaint, color: T.textPrimary }]}
                        value={reviewBody}
                        onChangeText={setReviewBody}
                        placeholder="Share details about communication, skills, interview performance…"
                        placeholderTextColor={T.textHint}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[s.submitBtn, { backgroundColor: T.primary }, (!reviewRating || !reviewTitle.trim() || !reviewBody.trim()) && s.submitBtnDisabled]}
                        onPress={handleSubmitReview}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="send" size={16} color="#fff" />
                        <Text style={s.submitBtnText}>Submit Review</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {submittedReviews.filter(r => r.applicantId === selectedApplicant.id).length > 0 && (
                    <>
                      <View style={s.detailDivider} />
                      <Text style={s.detailSectionLabel}>YOUR PREVIOUS REVIEWS</Text>
                      {submittedReviews
                        .filter(r => r.applicantId === selectedApplicant.id)
                        .map((rev, i) => (
                          <View key={rev.id} style={[s.reviewCard, i > 0 && { marginTop: 12 }]}>
                            <View style={s.reviewStarsRow}>
                              {[1, 2, 3, 4, 5].map(s2 => (
                                <MaterialCommunityIcons
                                  key={s2}
                                  name={s2 <= rev.rating ? 'star' : 'star-outline'}
                                  size={13}
                                  color={s2 <= rev.rating ? T.warning : T.borderFaint}
                                />
                              ))}
                              <Text style={s.reviewDate}>{rev.date}</Text>
                            </View>
                            <Text style={[s.reviewTitle, { color: T.textPrimary }]}>{rev.title}</Text>
                            <Text style={[s.reviewBody, { color: T.textSub }]}>{rev.body}</Text>
                          </View>
                        ))}
                    </>
                  )}
                </View>
              </>
            ) : (
              closedMatches.length === 0 ? (
                <View style={s.reviewsEmptyWrap}>
                  <MaterialCommunityIcons name="star-off-outline" size={40} color={T.borderFaint} />
                  <Text style={[s.reviewsEmptyTitle, { color: T.textSub }]}>No closed conversations yet</Text>
                  <Text style={[s.reviewsEmptySub, { color: T.textHint }]}>
                    You can leave a review once a conversation with an applicant has closed.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionTitle, { color: T.textPrimary }]}>Closed conversations</Text>
                  </View>
                  <View style={[s.card, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
                    {closedMatches.map((app: Match, i: number) => {
                      const appReviews = submittedReviews.filter(r => r.applicantId === app.id);
                      return (
                        <View key={app.id}>
                          {i > 0 && <View style={[s.divider, { backgroundColor: T.borderFaint }]} />}
                          <TouchableOpacity
                            style={s.applicantListRow}
                            onPress={() => openApplicant(app.id)}
                            activeOpacity={0.8}
                          >
                            <ApplicantAvatar uri={app.avatar} size={48} />
                            <View style={s.applicantListInfo}>
                              <Text style={[s.applicantListName, { color: T.textPrimary }]}>{app.name}</Text>
                              <Text style={[s.applicantListRole, { color: T.textSub }]}>{app.role}</Text>
                              {appReviews.length > 0 ? (
                                <View style={s.reviewedRow}>
                                  <MaterialCommunityIcons name="check-circle" size={12} color={T.success} />
                                  <Text style={s.reviewedText}>Reviewed</Text>
                                </View>
                              ) : (
                                <Text style={s.reviewHint}>Tap to leave a review</Text>
                              )}
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={T.textHint} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </>
              )
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Main screen styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },

  header:    { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 28, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.5 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  segWrap: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: T.surface, borderRadius: 14,
    borderWidth: 1, borderColor: T.borderFaint, padding: 4,
  },
  segTab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, gap: 6 },
  segTabActive:     { backgroundColor: T.primary },
  segTabText:       { fontSize: 13, fontWeight: '600', color: T.textSub },
  segTabTextActive: { color: '#fff', fontWeight: '700' },
  segBadge:         { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  segBadgeText:     { fontSize: 10, fontWeight: '700', color: '#fff' },

  scroll: { paddingHorizontal: 20 },

  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: T.textPrimary },
  viewAll:      { fontSize: 13, fontWeight: '600', color: T.primary },

  card:    { backgroundColor: T.surface, borderRadius: 20, borderWidth: 1, borderColor: T.borderFaint, padding: 14, marginBottom: 16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: T.borderFaint, marginVertical: 8 },

  // Empty state
  emptyWrap:      { alignItems: 'center', paddingTop: 24, paddingHorizontal: 32 },
  ghostStack:     { width: SCREEN_WIDTH - 64, height: 210, position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ghostCard:      { position: 'absolute', width: 136, height: 182, borderRadius: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6, overflow: 'hidden' },
  ghostPhoto:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,85,247,0.08)' },
  ghostMeta:      { padding: 12, backgroundColor: T.surface },
  ghostLine:      { height: 8, borderRadius: 4, backgroundColor: T.borderFaint },
  boltBadge:      { position: 'absolute', top: 14, left: '28%' as any, width: 34, height: 34, borderRadius: 17, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, zIndex: 10 },
  emptyTitle:     { fontSize: 21, fontWeight: '800', color: T.textPrimary, textAlign: 'center', lineHeight: 30, marginBottom: 12, letterSpacing: -0.3 },
  emptySub:       { fontSize: 14, color: T.textSub, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  boostBtn:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.primary, borderRadius: 50, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 16, width: '100%', justifyContent: 'center', shadowColor: T.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 4 },
  boostIconWrap:  { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  boostBtnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  editProfileText:{ fontSize: 15, fontWeight: '600', color: T.textSub, textDecorationLine: 'underline' },

  // New applicants
  newMatchRow:  { flexDirection: 'row', gap: 16, paddingBottom: 4 },
  newMatchItem: { alignItems: 'center', width: 70 },
  newDot:       { position: 'absolute', bottom: 1, right: 1, width: 18, height: 18, borderRadius: 9, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.surface },
  newMatchName: { fontSize: 11, fontWeight: '600', color: T.textPrimary, textAlign: 'center', marginTop: 6 },
  newMatchRole: { fontSize: 10, color: T.textHint, textAlign: 'center', marginTop: 1 },

  // Pipeline
  stageHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stagePill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stagePillText: { fontSize: 12, fontWeight: '700' },
  stageCount:    { fontSize: 12, color: T.textHint, fontWeight: '600' },
  pipelineRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  pipelineInfo:  { flex: 1 },
  pipelineName:  { fontSize: 15, fontWeight: '600', color: T.textPrimary },
  pipelineRole:  { fontSize: 13, color: T.textSub, marginTop: 1 },

  // Messages
  msgRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  msgRowExpired:   { opacity: 0.5 },
  unreadBadge:     { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: T.primary, borderWidth: 2, borderColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  msgBody:         { flex: 1 },
  msgTopRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  msgName:         { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  msgTime:         { fontSize: 11, color: T.textHint },
  msgRole:         { fontSize: 13, color: T.textSub, marginBottom: 3 },
  msgPreview:      { fontSize: 13, color: T.textSub, lineHeight: 18, marginBottom: 6 },
  msgFaded:        { color: 'rgba(255,255,255,0.25)' },
  statusPill:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusPillText:  { fontSize: 11, fontWeight: '700' },
  expiredRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  closedTag:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.borderFaint, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  closedTagText:   { fontSize: 11, fontWeight: '600', color: T.textHint },
  leaveReviewBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: T.border },
  leaveReviewBtnText: { fontSize: 11, fontWeight: '700', color: T.primary },

  // Reviews
  backBtn:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 6 },
  backBtnText:        { fontSize: 14, fontWeight: '600', color: T.primary },
  detailCard:         { backgroundColor: T.surface, borderRadius: 20, borderWidth: 1, borderColor: T.borderFaint, padding: 18, marginBottom: 16 },
  detailHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailName:         { fontSize: 20, fontWeight: '800', color: T.textPrimary, letterSpacing: -0.3, marginBottom: 3 },
  detailRole:         { fontSize: 14, color: T.textSub, marginBottom: 8 },
  detailDivider:      { height: StyleSheet.hairlineWidth, backgroundColor: T.borderFaint, marginVertical: 16 },
  detailSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: T.textHint, marginBottom: 12 },
  successCard:        { alignItems: 'center', paddingVertical: 28, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', gap: 8, marginBottom: 12 },
  successCardTitle:   { fontSize: 18, fontWeight: '700', color: '#4ade80' },
  successCardSub:     { fontSize: 14, color: 'rgba(74,222,128,0.6)' },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: T.textSub, marginBottom: 6, marginTop: 12 },
  starsRow:           { flexDirection: 'row', gap: 6, marginBottom: 6 },
  ratingLabel:        { fontSize: 13, fontWeight: '600', color: T.warning, marginBottom: 12 },
  textField:          { backgroundColor: T.surfaceHigh, borderRadius: 14, borderWidth: 1, borderColor: T.borderFaint, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: T.textPrimary, marginBottom: 10 },
  textArea:           { minHeight: 100, paddingTop: 10 },
  submitBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.primary, borderRadius: 50, paddingVertical: 14, marginTop: 4 },
  submitBtnDisabled:  { opacity: 0.4 },
  submitBtnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },
  applicantListRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  applicantListInfo:  { flex: 1 },
  applicantListName:  { fontSize: 15, fontWeight: '600', color: T.textPrimary },
  applicantListRole:  { fontSize: 13, color: T.textSub, marginTop: 1 },
  reviewedRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reviewedText:       { fontSize: 11, color: '#4ade80', fontWeight: '600' },
  reviewHint:         { fontSize: 11, color: T.primary, marginTop: 4 },
  reviewsEmptyWrap:   { alignItems: 'center', paddingVertical: 60, gap: 12 },
  reviewsEmptyTitle:  { fontSize: 17, fontWeight: '700', color: T.textSub, textAlign: 'center' },
  reviewsEmptySub:    { fontSize: 13, color: T.textHint, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  reviewCard:         { gap: 5 },
  reviewStarsRow:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewDate:         { fontSize: 11, color: T.textHint, marginLeft: 6 },
  reviewTitle:        { fontSize: 14, fontWeight: '600', color: T.textPrimary },
  reviewBody:         { fontSize: 13, color: T.textSub, lineHeight: 20 },
});

// ─── Conversation screen styles ───────────────────────────────────────────────
const cs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },

  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderFaint, alignItems: 'center', justifyContent: 'center' },
  headerAvatar:   { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: T.border },
  headerInfo:     { flex: 1 },
  headerName:     { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  headerRole:     { fontSize: 12, color: T.textSub, marginTop: 1 },
  typingLabel:    { fontSize: 12, color: T.primary, fontStyle: 'italic', marginTop: 1 },
  statusBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText:{ fontSize: 11, fontWeight: '700' },
  headerDivider:  { height: StyleSheet.hairlineWidth, backgroundColor: T.borderFaint },

  msgScroll:   { flex: 1 },
  msgContent:  { paddingHorizontal: 16, paddingTop: 16, gap: 4 },

  bubbleWrap:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  bubbleWrapMe:   { justifyContent: 'flex-end' },
  bubbleWrapThem: { justifyContent: 'flex-start' },

  bubbleAvatar:       { width: 28, height: 28, borderRadius: 9, marginBottom: 2 },
  bubbleAvatarSpacer: { width: 28 },
  bubbleCol:          { maxWidth: SCREEN_WIDTH * 0.72, gap: 3 },

  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:        { backgroundColor: T.primary, borderBottomRightRadius: 4 },
  bubbleThem:      { backgroundColor: T.surfaceHigh, borderWidth: 1, borderColor: T.borderFaint, borderBottomLeftRadius: 4 },
  bubbleMeFirst:   { borderTopRightRadius: 18 },
  bubbleMeLast:    { borderBottomRightRadius: 4 },
  bubbleThemFirst: { borderTopLeftRadius: 18 },
  bubbleThemLast:  { borderBottomLeftRadius: 4 },

  bubbleText:     { fontSize: 14, lineHeight: 20 },
  bubbleTextMe:   { color: '#fff' },
  bubbleTextThem: { color: T.textPrimary },
  bubbleTime:     { fontSize: 10, color: T.textHint },
  bubbleTimeMe:   { textAlign: 'right' },
  bubbleTimeThem: { textAlign: 'left' },

  typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
  typingDots:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typingDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: T.textHint },
  typingDot1:   {},
  typingDot2:   { opacity: 0.65 },
  typingDot3:   { opacity: 0.35 },

  expiredBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.borderFaint, alignSelf: 'center' },
  expiredBannerText: { fontSize: 12, color: T.textHint, fontWeight: '600' },

  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: T.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.borderFaint },
  input:           { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: T.surface, borderRadius: 22, borderWidth: 1, borderColor: T.borderFaint, paddingHorizontal: 16, paddingVertical: 11, fontSize: 14, color: T.textPrimary },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
});
