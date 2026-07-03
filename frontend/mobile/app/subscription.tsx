import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Platform, StatusBar, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../theme';

const { width: SW } = Dimensions.get('window');

// ─── Subscription-specific accent colours (not theme-dependent) ───────────────
const ACCENT = {
  gold:  '#f59e0b',
  plat:  '#cbd5e1',
  swipe: '#06b6d4',
};

type PlanKey = 'free' | 'gold_monthly' | 'gold_yearly' | 'plat_monthly' | 'plat_yearly';
type Plan = {
  key: PlanKey; tier: 'free' | 'gold' | 'platinum';
  name: string; billing: string; price: string | null; billed: string | null;
  badge: string | null; saving: string | null;
  color: string; border: string; bg: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  features: string[]; locked: string[];
  ctaLabel: string | null; ctaTextColor: string;
};

type SwipePack = {
  key: string;
  count: number;
  price: string;
  billed: string;
  perSwipe: string;
  badge: string | null;
  saving: string | null;
  features: string[];
};

const PLANS: Plan[] = [
  {
    key: 'free', tier: 'free', name: 'Free', billing: 'Forever',
    price: null, billed: null, badge: null, saving: null,
    color: '#a855f7', border: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.05)',
    icon: 'star-outline',
    features: ['10 applications / month', 'Basic job matching'],
    locked: ['See who liked you', 'Priority results', 'Advanced insights', 'Career coach'],
    ctaLabel: null, ctaTextColor: '#fff',
  },
  {
    key: 'gold_monthly', tier: 'gold', name: 'Gold', billing: 'Monthly',
    price: '$15.99', billed: 'Billed monthly', badge: 'POPULAR', saving: null,
    color: ACCENT.gold, border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.05)',
    icon: 'lightning-bolt',
    features: ['Unlimited applications', 'Advanced matching', 'See who liked you', 'Priority results'],
    locked: ['Advanced insights', 'Career coach'],
    ctaLabel: 'Upgrade to Gold', ctaTextColor: '#fff',
  },
  {
    key: 'gold_yearly', tier: 'gold', name: 'Gold', billing: 'Yearly',
    price: '$7.99', billed: 'Billed $95.88 / year', badge: 'BEST VALUE', saving: 'Save 50%',
    color: ACCENT.gold, border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.05)',
    icon: 'lightning-bolt',
    features: ['Unlimited applications', 'Advanced matching', 'See who liked you', 'Priority results'],
    locked: ['Advanced insights', 'Career coach'],
    ctaLabel: 'Upgrade to Gold', ctaTextColor: '#fff',
  },
  {
    key: 'plat_monthly', tier: 'platinum', name: 'Platinum', billing: 'Monthly',
    price: '$29.99', billed: 'Billed monthly', badge: null, saving: null,
    color: ACCENT.plat, border: 'rgba(203,213,225,0.3)', bg: 'rgba(148,163,184,0.05)',
    icon: 'diamond-stone',
    features: ['Everything in Gold', 'Advanced insights', 'Dedicated career coach', 'AI-powered matching'],
    locked: [], ctaLabel: 'Upgrade to Platinum', ctaTextColor: '#0f172a',
  },
  {
    key: 'plat_yearly', tier: 'platinum', name: 'Platinum', billing: 'Yearly',
    price: '$19.99', billed: 'Billed $239.88 / year', badge: 'BEST DEAL', saving: 'Save 33%',
    color: ACCENT.plat, border: 'rgba(203,213,225,0.3)', bg: 'rgba(148,163,184,0.05)',
    icon: 'diamond-stone',
    features: ['Everything in Gold', 'Advanced insights', 'Dedicated career coach', 'AI-powered matching'],
    locked: [], ctaLabel: 'Upgrade to Platinum', ctaTextColor: '#0f172a',
  },
];

const SWIPE_PACKS: SwipePack[] = [
  {
    key: 'swipes_5',
    count: 5,
    price: '$0.99',
    billed: 'One-time charge',
    perSwipe: '$0.20 / swipe',
    badge: null,
    saving: null,
    features: ['5 extra applications', 'Never expires', 'Use anytime'],
  },
  {
    key: 'swipes_15',
    count: 15,
    price: '$1.99',
    billed: 'One-time charge',
    perSwipe: '$0.13 / swipe',
    badge: 'POPULAR',
    saving: 'Save 35%',
    features: ['15 extra applications', 'Never expires', 'Use anytime'],
  },
  {
    key: 'swipes_30',
    count: 30,
    price: '$2.99',
    billed: 'One-time charge',
    perSwipe: '$0.10 / swipe',
    badge: 'BEST VALUE',
    saving: 'Save 50%',
    features: ['30 extra applications', 'Never expires', 'Use anytime'],
  },
];

const PLAN_INITIAL   = 1; // gold_monthly
const SWIPE_INITIAL  = 1; // swipes_15
const CARD_W  = SW - 64;
const CARD_GAP = 16;
const SIDE_PAD = (SW - CARD_W) / 2;

const planSnapOffsets  = PLANS.map((_, i) => i * (CARD_W + CARD_GAP));
const swipeSnapOffsets = SWIPE_PACKS.map((_, i) => i * (CARD_W + CARD_GAP));

export default function SubscriptionScreen() {
  const T = useTheme();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();

  const [selectedPlanKey,  setSelectedPlanKey]  = useState<PlanKey>('gold_monthly');
  const [selectedSwipeKey, setSelectedSwipeKey] = useState<string>('swipes_15');
  const [planDot,          setPlanDot]          = useState(PLAN_INITIAL);
  const [swipeDot,         setSwipeDot]         = useState(SWIPE_INITIAL);
  const [activeTab,        setActiveTab]        = useState<'plans' | 'swipes'>('plans');

  const scaleAnim      = useRef(new Animated.Value(1)).current;
  const swipeScaleAnim = useRef(new Animated.Value(1)).current;
  const planFlatRef    = useRef<FlatList<Plan>>(null);
  const swipeFlatRef   = useRef<FlatList<SwipePack>>(null);
  const planScrolled   = useRef(false);
  const swipeScrolled  = useRef(false);

  const paddingTop = topInset > 0 ? topInset : Platform.OS === 'ios' ? 54 : 40;
  const safeBottom = bottomInset > 0 ? bottomInset : 16;

  const selectedPlan  = PLANS.find(p => p.key === selectedPlanKey)!;
  const selectedPack  = SWIPE_PACKS.find(p => p.key === selectedSwipeKey)!;

  // ── Animations ──────────────────────────────────────────────────────────────
  const bounce = (anim: Animated.Value, cb: () => void) =>
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }),
    ]).start(cb);

  const handleSubscribe  = () => bounce(scaleAnim,      () => console.log('Subscribe:', selectedPlanKey));
  const handleBuySwipes  = () => bounce(swipeScaleAnim, () => console.log('Buy swipes:', selectedSwipeKey));

  // ── Plan carousel ────────────────────────────────────────────────────────────
  const onPlanScrollEnd = (e: any) => {
    const i = Math.max(0, Math.min(PLANS.length - 1,
      Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP))));
    setPlanDot(i);
    setSelectedPlanKey(PLANS[i].key);
  };
  const goToPlan = (i: number) => {
    planFlatRef.current?.scrollToIndex({ index: i, animated: true });
    setPlanDot(i);
    setSelectedPlanKey(PLANS[i].key);
  };
  const onPlanLayout = () => {
    if (planScrolled.current) return;
    planScrolled.current = true;
    setTimeout(() => planFlatRef.current?.scrollToIndex({ index: PLAN_INITIAL, animated: false }), 50);
  };

  // ── Swipe carousel ───────────────────────────────────────────────────────────
  const onSwipeScrollEnd = (e: any) => {
    const i = Math.max(0, Math.min(SWIPE_PACKS.length - 1,
      Math.round(e.nativeEvent.contentOffset.x / (CARD_W + CARD_GAP))));
    setSwipeDot(i);
    setSelectedSwipeKey(SWIPE_PACKS[i].key);
  };
  const goToSwipe = (i: number) => {
    swipeFlatRef.current?.scrollToIndex({ index: i, animated: true });
    setSwipeDot(i);
    setSelectedSwipeKey(SWIPE_PACKS[i].key);
  };
  const onSwipeLayout = () => {
    if (swipeScrolled.current) return;
    swipeScrolled.current = true;
    setTimeout(() => swipeFlatRef.current?.scrollToIndex({ index: SWIPE_INITIAL, animated: false }), 50);
  };

  // ── CTA colours (plans) ──────────────────────────────────────────────────────
  const ctaColors: [string, string] =
    selectedPlan.tier === 'platinum' ? ['#cbd5e1', '#94a3b8'] :
    selectedPlan.tier === 'gold'     ? ['#f59e0b', '#d97706'] :
                                       [T.primary, T.primaryDark];
  const ctaIconColor = selectedPlan.tier === 'platinum' ? '#0f172a' : '#fff';

  // ── Render: plan card ────────────────────────────────────────────────────────
  const renderPlanCard = ({ item }: { item: Plan }) => (
    <View style={[pc.card, { width: CARD_W, borderColor: item.border, backgroundColor: item.bg }]}>
      <View style={pc.top}>
        <View style={[pc.iconWrap, { backgroundColor: item.color + '22' }]}>
          <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[pc.name, { color: item.color }]}>{item.name}</Text>
          <Text style={[pc.billing, { color: T.textHint }]}>{item.billing}</Text>
        </View>
        {item.badge && (
          <View style={[pc.badge, { backgroundColor: item.color + '18', borderColor: item.color + '40' }]}>
            <Text style={[pc.badgeText, { color: item.color }]}>{item.badge}</Text>
          </View>
        )}
      </View>

      <View style={pc.priceRow}>
        <Text style={[pc.price, { color: item.color }]}>{item.price ?? 'Free'}</Text>
        {item.price && <Text style={[pc.pricePeriod, { color: T.textHint }]}> / mo</Text>}
        {item.saving && <Text style={pc.saving}>{'  '}{item.saving}</Text>}
      </View>
      <Text style={[pc.billed, { color: T.textHint }]}>{item.billed ?? ' '}</Text>

      <View style={[pc.sep, { backgroundColor: T.borderFaint }]} />

      <View style={{ gap: 10 }}>
        {item.features.map((f, i) => (
          <View key={`inc-${i}`} style={pc.row}>
            <MaterialCommunityIcons name="check-circle" size={14} color={item.color} />
            <Text style={[pc.rowText, { color: T.textSub }]}>{f}</Text>
          </View>
        ))}
        {item.locked.map((f, i) => (
          <View key={`lock-${i}`} style={pc.row}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={T.textHint} />
            <Text style={[pc.rowText, { color: T.textHint }]}>{f}</Text>
          </View>
        ))}
      </View>

      {item.tier === 'free' && (
        <View style={pc.currentPill}>
          <MaterialCommunityIcons name="check-circle" size={12} color={T.primary} />
          <Text style={[pc.currentText, { color: T.primary }]}>Current plan</Text>
        </View>
      )}
    </View>
  );

  // ── Render: swipe pack card ──────────────────────────────────────────────────
  const renderSwipeCard = ({ item }: { item: SwipePack }) => (
    <View style={[pc.card, { width: CARD_W, borderColor: 'rgba(6,182,212,0.35)', backgroundColor: 'rgba(6,182,212,0.05)' }]}>
      <View style={pc.top}>
        <View style={[pc.iconWrap, { backgroundColor: ACCENT.swipe + '22' }]}>
          <MaterialCommunityIcons name="gesture-swipe-right" size={18} color={ACCENT.swipe} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[pc.name, { color: ACCENT.swipe }]}>{item.count} Swipes</Text>
          <Text style={[pc.billing, { color: T.textHint }]}>One-time purchase</Text>
        </View>
        {item.badge && (
          <View style={[pc.badge, { backgroundColor: ACCENT.swipe + '18', borderColor: ACCENT.swipe + '40' }]}>
            <Text style={[pc.badgeText, { color: ACCENT.swipe }]}>{item.badge}</Text>
          </View>
        )}
      </View>

      <View style={pc.priceRow}>
        <Text style={[pc.price, { color: ACCENT.swipe }]}>{item.price}</Text>
        {item.saving && <Text style={pc.saving}>{'  '}{item.saving}</Text>}
      </View>
      <Text style={[pc.billed, { color: T.textHint }]}>{item.perSwipe}</Text>

      <View style={[pc.sep, { backgroundColor: T.borderFaint }]} />

      <View style={{ gap: 10 }}>
        {item.features.map((f, i) => (
          <View key={`f-${i}`} style={pc.row}>
            <MaterialCommunityIcons name="check-circle" size={14} color={ACCENT.swipe} />
            <Text style={[pc.rowText, { color: T.textSub }]}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[s.screen, { paddingTop, paddingBottom: safeBottom, backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[T.bg, T.surface, T.bg]} style={StyleSheet.absoluteFill} />
      <View style={[s.glowBlob, { backgroundColor: T.primaryDark }]} pointerEvents="none" />

      {/* Close */}
      <TouchableOpacity
        style={s.closeBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
      </TouchableOpacity>

      {/* Hero */}
      <View style={s.heroWrap}>
        <View style={[s.heroRing, { borderColor: T.border }]}>
          <LinearGradient colors={[T.primary, T.primaryDark]} style={s.heroGradient}>
            <MaterialCommunityIcons name="lightning-bolt" size={28} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={[s.heroTitle, { color: T.textPrimary }]}>JobSwipe Pro</Text>
        <Text style={[s.heroSub, { color: T.textSub }]}>Land your dream job faster with tools{'\n'}that give you the edge.</Text>
      </View>

      {/* Tab switcher */}
      <View style={[s.tabRow, { backgroundColor: T.surfaceHigh }]}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'plans' && s.tabActive]}
          onPress={() => setActiveTab('plans')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="crown-outline" size={14}
            color={activeTab === 'plans' ? T.textPrimary : T.textHint}
          />
          <Text style={[s.tabText, { color: T.textHint }, activeTab === 'plans' && { color: T.textPrimary }]}>Subscription</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'swipes' && s.tabActiveSwipe]}
          onPress={() => setActiveTab('swipes')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="gesture-swipe-right" size={14}
            color={activeTab === 'swipes' ? T.textPrimary : T.textHint}
          />
          <Text style={[s.tabText, { color: T.textHint }, activeTab === 'swipes' && { color: T.textPrimary }]}>Buy Swipes</Text>
        </TouchableOpacity>
      </View>

      {/* ── PLANS TAB ── */}
      {activeTab === 'plans' ? (
        <>
          <View style={s.carouselWrap}>
            <FlatList<Plan>
              ref={planFlatRef}
              data={PLANS}
              renderItem={renderPlanCard}
              keyExtractor={item => item.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToOffsets={planSnapOffsets}
              snapToAlignment="start"
              decelerationRate="fast"
              onMomentumScrollEnd={onPlanScrollEnd}
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: CARD_GAP }}
              getItemLayout={(_, i) => ({ length: CARD_W + CARD_GAP, offset: (CARD_W + CARD_GAP) * i, index: i })}
              onLayout={onPlanLayout}
              style={{ flex: 1 }}
            />
          </View>

          <View style={s.dotsRow}>
            {PLANS.map((plan, i) => (
              <TouchableOpacity key={plan.key} onPress={() => goToPlan(i)}>
                <View style={[s.dot, {
                  backgroundColor: planDot === i ? plan.color : T.borderFaint,
                  width: planDot === i ? 20 : 6,
                }]} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.selectedLabel, { color: T.textHint }]}>
            {selectedPlan.tier === 'free'
              ? 'You are on the Free plan'
              : `${selectedPlan.name} · ${selectedPlan.billing} — ${selectedPlan.price}/mo`}
          </Text>

          <Animated.View style={[s.ctaWrap, { transform: [{ scale: scaleAnim }] }]}>
            {selectedPlan.tier !== 'free' ? (
              <TouchableOpacity style={s.ctaBtn} onPress={handleSubscribe} activeOpacity={0.9}>
                <LinearGradient
                  colors={ctaColors}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGradient}
                >
                  <MaterialCommunityIcons
                    name={selectedPlan.tier === 'platinum' ? 'diamond-stone' : 'lightning-bolt'}
                    size={18} color={ctaIconColor}
                  />
                  <Text style={[s.ctaText, { color: ctaIconColor }]}>
                    {selectedPlan.ctaLabel} · {selectedPlan.price}/mo
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[s.ctaBtn, s.ctaDisabled, { backgroundColor: T.surfaceHigh }]}>
                <Text style={[s.ctaDisabledText, { color: T.textHint }]}>You're on the Free plan</Text>
              </View>
            )}
          </Animated.View>
        </>
      ) : (
        /* ── SWIPES TAB ── */
        <>
          <View style={s.carouselWrap}>
            <FlatList<SwipePack>
              ref={swipeFlatRef}
              data={SWIPE_PACKS}
              renderItem={renderSwipeCard}
              keyExtractor={item => item.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToOffsets={swipeSnapOffsets}
              snapToAlignment="start"
              decelerationRate="fast"
              onMomentumScrollEnd={onSwipeScrollEnd}
              contentContainerStyle={{ paddingHorizontal: SIDE_PAD, gap: CARD_GAP }}
              getItemLayout={(_, i) => ({ length: CARD_W + CARD_GAP, offset: (CARD_W + CARD_GAP) * i, index: i })}
              onLayout={onSwipeLayout}
              style={{ flex: 1 }}
            />
          </View>

          <View style={s.dotsRow}>
            {SWIPE_PACKS.map((pack, i) => (
              <TouchableOpacity key={pack.key} onPress={() => goToSwipe(i)}>
                <View style={[s.dot, {
                  backgroundColor: swipeDot === i ? ACCENT.swipe : T.borderFaint,
                  width: swipeDot === i ? 20 : 6,
                }]} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.selectedLabel, { color: T.textHint }]}>
            {`${selectedPack.count} Swipes · ${selectedPack.price} · ${selectedPack.perSwipe}`}
          </Text>

          <Animated.View style={[s.ctaWrap, { transform: [{ scale: swipeScaleAnim }] }]}>
            <TouchableOpacity style={s.ctaBtn} onPress={handleBuySwipes} activeOpacity={0.9}>
              <LinearGradient
                colors={['#06b6d4', '#0891b2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaGradient}
              >
                <MaterialCommunityIcons name="gesture-swipe-right" size={18} color="#fff" />
                <Text style={[s.ctaText, { color: '#fff' }]}>
                  Buy {selectedPack.count} Swipes · {selectedPack.price}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {/* Legal */}
      <Text style={[s.legal, { color: T.textHint }]}>
        {activeTab === 'plans'
          ? 'Cancel anytime · Renews automatically · Terms & Privacy apply'
          : 'One-time charge · No subscription · Terms & Privacy apply'}
      </Text>
    </View>
  );
}

// ─── Card styles (layout only — colours applied inline) ───────────────────────
const pc = StyleSheet.create({
  card:        { borderRadius: 20, borderWidth: 1.5, padding: 20 },
  top:         { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name:        { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  billing:     { fontSize: 11, marginTop: 2 },
  badge:       { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  priceRow:    { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  price:       { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  pricePeriod: { fontSize: 14, marginBottom: 5 },
  saving:      { fontSize: 12, fontWeight: '700', color: '#34D399', marginBottom: 5 },
  billed:      { fontSize: 11, marginBottom: 16 },
  sep:         { height: 1, marginBottom: 16 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText:     { fontSize: 13, flex: 1 },
  currentPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'center' },
  currentText: { fontSize: 11, fontWeight: '600' },
});

// ─── Screen styles (layout only — colours applied inline) ─────────────────────
const s = StyleSheet.create({
  screen:   { flex: 1 },
  glowBlob: {
    position: 'absolute', width: SW * 0.9, height: SW * 0.9,
    borderRadius: SW * 0.45, top: -SW * 0.25, alignSelf: 'center',
    opacity: 0.13,
  },
  closeBtn: {
    position: 'absolute', right: 20, top: 60, zIndex: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroWrap:     { alignItems: 'center', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 24 },
  heroRing:     {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  heroTitle:    { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    borderRadius: 14, padding: 4, gap: 4,
  },
  tab:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabActive:      { backgroundColor: 'rgba(168,85,247,0.25)' },
  tabActiveSwipe: { backgroundColor: 'rgba(6,182,212,0.25)' },
  tabText:        { fontSize: 13, fontWeight: '700' },

  carouselWrap: { flex: 1, overflow: 'hidden' },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 4 },
  dot:     { height: 6, borderRadius: 3 },

  selectedLabel: {
    textAlign: 'center', fontSize: 12,
    marginTop: 4, marginBottom: 10, paddingHorizontal: 20,
  },

  ctaWrap:         { paddingHorizontal: 20, marginBottom: 6 },
  ctaBtn:          { borderRadius: 16, overflow: 'hidden' },
  ctaGradient:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  ctaText:         { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  ctaDisabled:     { paddingVertical: 16, alignItems: 'center' },
  ctaDisabledText: { fontSize: 14, fontWeight: '600' },

  legal: {
    fontSize: 10,
    textAlign: 'center', lineHeight: 14, paddingHorizontal: 24, marginBottom: 2,
  },
});