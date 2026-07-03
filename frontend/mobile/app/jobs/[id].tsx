import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ImageBackground, Image,
  Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type TagVariant = 'remote' | 'full' | 'hybrid' | 'contract' | 'onsite' | 'cloud';

const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  remote:   { bg: 'rgba(168,85,247,0.22)', text: '#d8b4fe', border: 'rgba(168,85,247,0.35)' },
  full:     { bg: 'rgba(34,197,94,0.18)',  text: '#86efac', border: 'rgba(34,197,94,0.28)'  },
  hybrid:   { bg: 'rgba(56,189,248,0.18)', text: '#7dd3fc', border: 'rgba(56,189,248,0.28)' },
  contract: { bg: 'rgba(251,191,36,0.18)', text: '#fde68a', border: 'rgba(251,191,36,0.28)' },
  onsite:   { bg: 'rgba(251,113,133,0.18)',text: '#fda4af', border: 'rgba(251,113,133,0.28)'},
  cloud:    { bg: 'rgba(56,189,248,0.18)', text: '#7dd3fc', border: 'rgba(56,189,248,0.28)' },
};

// ─── Job data (mirrors jobs.tsx) ──────────────────────────────────────────────
const JOBS = [
  {
    id: 1, abbr: 'TF', company: 'TechFlow Inc', role: 'Sr. React Native Engineer',
    salary: '$120k – $150k / yr', location: 'San Francisco · Remote',
    distanceKm: 3.9,
    tags: [
      { label: 'Remote',    variant: 'remote' },
      { label: 'Full-time', variant: 'full'   },
    ],
    match: 92, posted: '2h ago', applicants: 34,
    accentColor: '#a855f7',
    aboutRole: 'Lead the development of a high-impact React Native app used by millions. Own architecture decisions, mentor junior engineers, and collaborate closely with product and design.',
    requirements: 'React Native · TypeScript · GraphQL · 5+ yrs',
    glassdoorRating: 4.3,
    image: require('../assets/images/accenture.jpg') as any,
    companyPhotos: [
      require('../assets/images/accenture.jpg') as any,
      require('../assets/images/accenture2.jpg') as any,
      require('../assets/images/accenture3.jpg') as any,
    ],
    reviews: [
      { name: 'Jordan M.', role: 'Senior Engineer', rating: 4, date: 'Mar 2024', text: 'Great engineering culture and real ownership over the product. Teams move fast.' },
      { name: 'Priya S.', role: 'Mobile Developer', rating: 5, date: 'Jan 2024', text: 'Excellent mentorship and growth opportunities. Best team I have worked with.' },
      { name: 'Alex R.', role: 'Tech Lead', rating: 4, date: 'Nov 2023', text: 'Challenging problems and competitive pay. Leadership is transparent.' },
    ],
  },
  {
    id: 2, abbr: 'DS', company: 'DataStream', role: 'ML Engineer',
    salary: '$140k – $180k / yr', location: 'Boston · On-site',
    distanceKm: 8.2,
    tags: [
      { label: 'On-site',   variant: 'onsite' },
      { label: 'Full-time', variant: 'full'   },
    ],
    match: 85, posted: '1d ago', applicants: 22,
    accentColor: '#1e40af',
    aboutRole: 'Design and deploy production ML systems at scale. Work closely with data scientists and engineers to turn research into real-world impact across our core product.',
    requirements: 'Python · PyTorch · Spark · 4+ yrs',
    glassdoorRating: 4.1,
    image: require('../assets/images/socia.png') as any,
    companyPhotos: [
      require('../assets/images/socia.png') as any,
      require('../assets/images/socia2.jpg') as any,
      require('../assets/images/socia3.jpg') as any,
    ],
    reviews: [
      { name: 'Marcus T.', role: 'Data Scientist', rating: 4, date: 'Apr 2024', text: 'Strong technical team and cutting-edge projects. Great place to grow in ML.' },
      { name: 'Lin W.', role: 'ML Engineer', rating: 5, date: 'Feb 2024', text: 'Top-tier infrastructure and genuinely smart colleagues. Highly recommend.' },
      { name: 'Sofia K.', role: 'Research Engineer', rating: 3, date: 'Dec 2023', text: 'Interesting work, though the on-site requirement can be demanding at times.' },
    ],
  },
  {
    id: 3, abbr: 'IL', company: 'InnovateLabs', role: 'Product Designer',
    salary: '$100k – $130k / yr', location: 'New York · Hybrid',
    distanceKm: 15.4,
    tags: [
      { label: 'Hybrid',    variant: 'hybrid' },
      { label: 'Full-time', variant: 'full'   },
    ],
    match: 78, posted: '5h ago', applicants: 61,
    accentColor: '#9f1239',
    aboutRole: 'Shape the future of our product experience. Create user-centric designs from research to delivery, and work hand-in-hand with engineers to ship pixel-perfect interfaces.',
    requirements: 'Figma · Design Systems · Research · 3+ yrs',
    glassdoorRating: 4.5,
    image: require('../assets/images/alorica.jpg') as any,
    companyPhotos: [
      require('../assets/images/alorica.jpg') as any,
      require('../assets/images/alorica2.jpg') as any,
      require('../assets/images/alorica3.jpg') as any,
    ],
    reviews: [
      { name: 'Tariq L.', role: 'Product Designer', rating: 4, date: 'Feb 2024', text: 'Solid creative culture and real collaboration with engineering. Leadership listens.' },
      { name: 'Keiko P.', role: 'UX Researcher', rating: 5, date: 'Dec 2023', text: 'Best design team I have worked in. Blameless culture and genuinely supportive.' },
      { name: 'Sam W.', role: 'Visual Designer', rating: 4, date: 'Oct 2023', text: 'Great scope of work and a real say in design decisions. Pay is competitive.' },
    ],
  },
  {
    id: 4, abbr: 'CP', company: 'CloudPeak', role: 'Backend Engineer',
    salary: '$110k – $140k / yr', location: 'Austin · Remote',
    distanceKm: 20.1,
    tags: [
      { label: 'Remote',   variant: 'remote'   },
      { label: 'Contract', variant: 'contract' },
    ],
    match: 88, posted: '3h ago', applicants: 15,
    accentColor: '#166534',
    aboutRole: 'Build and scale robust backend systems that power our SaaS platform. Own services end-to-end in a microservices architecture with high reliability standards.',
    requirements: 'Go · PostgreSQL · Kafka · 4+ yrs',
    glassdoorRating: 4.0,
    image: require('../assets/images/accenture2.jpg') as any,
    companyPhotos: [
      require('../assets/images/accenture2.jpg') as any,
      require('../assets/images/accenture3.jpg') as any,
      require('../assets/images/accenture.jpg') as any,
    ],
    reviews: [
      { name: 'Omar F.', role: 'Backend Engineer', rating: 4, date: 'Mar 2024', text: 'Remote-first culture done right. Great async communication and clear expectations.' },
      { name: 'Mei L.', role: 'SRE', rating: 4, date: 'Jan 2024', text: 'Technically strong team. On-call is well-managed with solid runbooks.' },
      { name: 'Dave K.', role: 'Platform Engineer', rating: 4, date: 'Oct 2023', text: 'Interesting distributed systems challenges. Leadership is responsive to feedback.' },
    ],
  },
  {
    id: 5, abbr: 'NA', company: 'Nexus AI', role: 'AI Product Manager',
    salary: '$130k – $160k / yr', location: 'Seattle · Hybrid',
    distanceKm: 32.7,
    tags: [
      { label: 'Hybrid',    variant: 'hybrid' },
      { label: 'Full-time', variant: 'full'   },
    ],
    match: 74, posted: '2d ago', applicants: 89,
    accentColor: '#7c3aed',
    aboutRole: 'Define the product roadmap for AI-powered features. Collaborate with research, design, and engineering to bring cutting-edge AI capabilities into the hands of users.',
    requirements: 'AI/ML · Product Strategy · Roadmapping · 4+ yrs',
    glassdoorRating: 4.7,
    image: require('../assets/images/socia2.jpg') as any,
    companyPhotos: [
      require('../assets/images/socia2.jpg') as any,
      require('../assets/images/socia3.jpg') as any,
      require('../assets/images/socia.png') as any,
    ],
    reviews: [
      { name: 'Rachel N.', role: 'Product Manager', rating: 5, date: 'Apr 2024', text: 'Incredible mission and talented team. High-velocity environment with real impact.' },
      { name: 'Chris B.', role: 'Senior PM', rating: 4, date: 'Feb 2024', text: 'Fast-moving and innovative. You need to be comfortable with ambiguity to thrive.' },
      { name: 'Aisha M.', role: 'Associate PM', rating: 5, date: 'Jan 2024', text: 'Best job I have had. The culture is genuinely collaborative and growth-focused.' },
    ],
  },
  {
    id: 6, abbr: 'PW', company: 'Pixel Works', role: 'iOS Engineer',
    salary: '$115k – $145k / yr', location: 'Los Angeles · Remote',
    distanceKm: 44.0,
    tags: [
      { label: 'Remote',    variant: 'remote' },
      { label: 'Full-time', variant: 'full'   },
    ],
    match: 81, posted: '6h ago', applicants: 44,
    accentColor: '#be185d',
    aboutRole: 'Build beautiful, performant iOS experiences for a consumer app with millions of daily active users. Take ownership of entire features from architecture to App Store release.',
    requirements: 'Swift · UIKit · SwiftUI · 3+ yrs',
    glassdoorRating: 4.4,
    image: require('../assets/images/alorica2.jpg') as any,
    companyPhotos: [
      require('../assets/images/alorica2.jpg') as any,
      require('../assets/images/alorica3.jpg') as any,
      require('../assets/images/alorica.jpg') as any,
    ],
    reviews: [
      { name: 'Tyler J.', role: 'iOS Engineer', rating: 4, date: 'Mar 2024', text: 'Great product and tight-knit mobile team. Code reviews are thorough and helpful.' },
      { name: 'Nadia R.', role: 'Senior iOS Dev', rating: 5, date: 'Jan 2024', text: 'Remote culture is excellent. Flexible hours and strong engineering standards.' },
      { name: 'Ben H.', role: 'Staff Engineer', rating: 4, date: 'Nov 2023', text: 'Solid pay and interesting technical challenges. Management actually listens.' },
    ],
  },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_WIDTH = SCREEN_WIDTH - 40;

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating, size = 14, gold }: { rating: number; size?: number; gold: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={gold}
        />
      ))}
    </View>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────
function TagPill({ label, variant }: { label: string; variant: string }) {
  const st = TAG_STYLES[variant] ?? TAG_STYLES.cloud;
  return (
    <View style={[s.tag, { backgroundColor: st.bg, borderColor: st.border }]}>
      <Text style={[s.tagText, { color: st.text }]}>{label}</Text>
    </View>
  );
}

// ─── JobDetailScreen ──────────────────────────────────────────────────────────
export default function JobDetailScreen() {
  const T = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [saved, setSaved] = useState(false);

  const job = JOBS.find(j => j.id === Number(id)) ?? JOBS[0];

  return (
    <View style={[s.screen, { backgroundColor: T.bg, paddingTop: topInset }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={T.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.topBarTitle, { color: T.textPrimary }]}>Job Description</Text>
        <View style={s.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 100 }]}
      >
        {/* ── Cover photo + title block ────────────────────────────────── */}
        <View style={s.titleBlock}>
          {/* Cover photo with gradient overlay */}
          <ImageBackground
            source={job.image}
            style={s.coverPhoto}
            imageStyle={s.coverPhotoImg}
            resizeMode="cover"
          >
            {/* Dark gradient scrim so text is always legible */}
            <View style={s.coverScrim} />

            {/* Company name floated top-left over the image */}
            <View style={s.coverTopRow}>
              <View style={[s.coverBadge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <Text style={s.coverBadgeText}>{job.company}</Text>
              </View>
            </View>

            {/* Logo sits on the bottom edge, half-inside the cover */}
            <View style={s.coverLogoWrap}>
              <View style={[s.logo, s.coverLogo, { backgroundColor: job.accentColor, borderColor: T.bg }]}>
                <Text style={s.logoText}>{job.abbr}</Text>
              </View>
            </View>
          </ImageBackground>

          {/* Info below the cover */}
          <View style={s.titleInfo}>
            <Text style={[s.roleTitle, { color: T.textPrimary }]}>{job.role}</Text>
            <Text style={s.salary}>{job.salary}</Text>

            <View style={s.distanceRow}>
              <MaterialCommunityIcons name="map-marker-distance" size={14} color={T.textHint} />
              <Text style={[s.distanceText, { color: T.textSub }]}>{job.distanceKm.toFixed(1)} km away</Text>
            </View>

            <View style={s.locationRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={T.textHint} />
              <Text style={[s.locationText, { color: T.textSub }]}>{job.location}</Text>
            </View>

            <View style={s.tagRow}>
              {job.tags.map(t => (
                <TagPill key={t.label} label={t.label} variant={t.variant} />
              ))}
            </View>
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: T.borderFaint }]} />

        {/* ── About the Role ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: T.textHint }]}>ABOUT THE ROLE</Text>
          <Text style={[s.bodyText, { color: T.textPrimary }]}>{job.aboutRole}</Text>
        </View>

        <View style={[s.divider, { backgroundColor: T.borderFaint }]} />

        {/* ── Company Photos ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: T.textHint }]}>COMPANY PHOTOS</Text>

          {/* Main photo */}
          <TouchableOpacity activeOpacity={0.95} style={s.mainPhotoWrap}>
            <Image
              source={job.companyPhotos[selectedPhoto]}
              style={s.mainPhoto}
              resizeMode="cover"
            />
            <View style={s.photoZoomBtn}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Thumbnails */}
          <View style={s.thumbRow}>
            {job.companyPhotos.map((photo, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedPhoto(i)}
                activeOpacity={0.85}
                style={[
                  s.thumbWrap,
                  { borderColor: 'rgba(255,255,255,0.12)' },
                  i === selectedPhoto && { borderColor: T.primary, borderWidth: 2 },
                ]}
              >
                <Image source={photo} style={s.thumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: T.borderFaint }]} />

        {/* ── Requirements ────────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: T.textHint }]}>REQUIREMENTS</Text>
          <View style={s.requirementsRow}>
            <MaterialCommunityIcons name="briefcase-outline" size={16} color={T.textSub} />
            <Text style={[s.requirementsText, { color: T.textPrimary }]}>{job.requirements}</Text>
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: T.borderFaint }]} />

        {/* ── Company Rating ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: T.textHint }]}>COMPANY RATING</Text>
          <View style={s.ratingRow}>
            <MaterialCommunityIcons name="star" size={18} color={T.gold} />
            <Text style={[s.ratingValue, { color: T.textPrimary }]}>{job.glassdoorRating.toFixed(1)}</Text>
            <Text style={[s.ratingSource, { color: T.textSub }]}>· Glassdoor</Text>
          </View>
        </View>

        <View style={[s.divider, { backgroundColor: T.borderFaint }]} />

        {/* ── Employee Reviews ────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.reviewsHeader}>
            <Text style={[s.sectionLabel, { color: T.textHint }]}>EMPLOYEE REVIEWS</Text>
            <Text style={[s.reviewCount, { color: T.textSub }]}>{job.reviews.length} reviews</Text>
          </View>

          {job.reviews.map((review, i) => (
            <View
              key={i}
              style={[
                s.reviewCard,
                { backgroundColor: T.surface, borderColor: T.borderFaint },
                i < job.reviews.length - 1 && { marginBottom: 12 },
                i === job.reviews.length - 1 && { opacity: 0.45 },
              ]}
            >
              {/* Avatar */}
              <View style={s.reviewTop}>
                <View style={[s.reviewAvatar, { backgroundColor: T.primaryDark }]}>
                  <Text style={s.reviewAvatarText}>{review.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.reviewNameRow}>
                    <Text style={[s.reviewName, { color: T.textPrimary }]}>{review.name}</Text>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <StarRating rating={review.rating} size={12} gold={T.gold} />
                      <Text style={[s.reviewDate, { color: T.textHint }]}>{review.date}</Text>
                    </View>
                  </View>
                  <Text style={[s.reviewRole, { color: T.textSub }]}>{review.role}</Text>
                </View>
              </View>
              <Text style={[s.reviewText, { color: T.textSub }]}>{review.text}</Text>
            </View>
          ))}

          {/* Premium gate */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[s.premiumGate, { backgroundColor: T.surfaceHigh }]}
          >
            <View style={s.premiumLeft}>
              <View style={s.lockCircle}>
                <MaterialCommunityIcons name="lock" size={16} color={T.gold} />
              </View>
              <Text style={[s.premiumText, { color: T.textPrimary }]}>View all reviews</Text>
            </View>
            <View style={[s.premiumBadge, { backgroundColor: T.gold }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={13} color="#000" />
              <Text style={s.premiumBadgeText}>Premium</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={T.textSub} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Apply CTA ─────────────────────────────────────────────────────── */}
      <View style={[s.ctaBar, { backgroundColor: T.bg, borderTopColor: T.borderFaint, paddingBottom: bottomInset + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.saveBtn, { backgroundColor: T.surface, borderColor: T.borderFaint }]}
          onPress={() => setSaved(v => !v)}
        >
          <MaterialCommunityIcons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? T.primary : T.textSub}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.applyBtn, { backgroundColor: job.accentColor }]}
        >
          <Text style={s.applyBtnText}>Quick Apply</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 18, fontWeight: '700',
    textAlign: 'center',
  },
  topBarSpacer: {
    width: 36 + 8, // mirror backBtn + marginRight to keep title truly centred
  },

  scroll: { paddingHorizontal: 0 },

  // Title block
  titleBlock:  { paddingBottom: 20 },

  // Cover photo
  coverPhoto:  {
    width: '100%', height: 200,
    marginBottom: 36,          // extra space for the logo overhang
    position: 'relative',
  },
  coverPhotoImg: { borderRadius: 16 },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  coverTopRow: {
    position: 'absolute', top: 12, left: 12,
  },
  coverBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  coverBadgeText: {
    fontSize: 12, fontWeight: '700', color: '#fff',
  },
  coverLogoWrap: {
    position: 'absolute',
    bottom: -28,               // half the logo height (56/2)
    left: 20,
  },
  coverLogo: {
    width: 56, height: 56, borderRadius: 16,
    borderWidth: 3, borderColor: 'transparent',  // overridden inline with T.bg
  },

  titleInfo:  { paddingHorizontal: 20, paddingTop: 8 },

  logo:       { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoText:   { fontSize: 16, fontWeight: '800', color: '#fff' },

  roleTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  salary:    { fontSize: 18, fontWeight: '700', color: '#c084fc', marginBottom: 12 },

  distanceRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  distanceText: { fontSize: 13 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  locationText: { fontSize: 13 },

  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: '700' },
  
  section: { paddingVertical: 20, paddingHorizontal: 20 },
  divider:  { height: 1, marginVertical: 4, marginHorizontal: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 12,
  },
  bodyText: { fontSize: 16, lineHeight: 26 },

  // Company photos
  mainPhotoWrap: {
    borderRadius: 16, overflow: 'hidden',
    width: PHOTO_WIDTH, height: 220, marginBottom: 12,
    position: 'relative',
  },
  mainPhoto: { width: '100%', height: '100%' },
  photoZoomBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  thumbRow: { flexDirection: 'row', gap: 10 },
  thumbWrap: {
    width: 80, height: 68, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1,
  },
  thumb: { width: '100%', height: '100%' },

  // Requirements
  requirementsRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requirementsText: { fontSize: 15, fontWeight: '600' },

  // Rating
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingValue: { fontSize: 18, fontWeight: '800' },
  ratingSource:{ fontSize: 15 },

  // Reviews
  reviewsHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  reviewCount: { fontSize: 13, fontWeight: '600' },
  reviewCard: {
    borderRadius: 16, padding: 16,
    borderWidth: 1,
  },
  reviewTop:    { flexDirection: 'row', gap: 12, marginBottom: 10 },
  reviewAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  reviewNameRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  reviewName: { fontSize: 15, fontWeight: '700' },
  reviewRole: { fontSize: 12, marginTop: 1 },
  reviewDate: { fontSize: 11 },
  reviewText: { fontSize: 14, lineHeight: 22 },

  // Premium gate
  premiumGate: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    gap: 8,
  },
  premiumLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  premiumText:  { fontSize: 15, fontWeight: '600' },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  premiumBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },

  // CTA bar
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 25,
  },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});