import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ImageBackground,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { BASE_CAROUSEL, FILTERS, GRID_JOBS, TAG_STYLES, filterJobs, type Job, type TagVariant } from '../../constants/jobs';

function TagPill({ label, variant }: { label: string; variant: TagVariant }) {
  const st = TAG_STYLES[variant];
  return (
    <View style={[s.tag, { backgroundColor: st.bg, borderColor: st.border }]}>
      <Text style={[s.tagText, { color: st.text }]}>{label}</Text>
    </View>
  );
}

function JobListCard({ job, onPress }: { job: Job; onPress: (job: Job) => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(job)}>
      <ImageBackground source={job.image} style={s.card} imageStyle={s.cardImg}>
        <View style={s.scrim} />
        <View style={s.cardTop}>
          <View style={[s.logo, { backgroundColor: job.accentColor }]}>
            <Text style={s.logoText}>{job.abbr}</Text>
          </View>
          <View style={s.topMeta}>
            <MaterialCommunityIcons name="clock-outline" size={12} color="rgba(255,255,255,0.68)" />
            <Text style={s.topMetaText}>{job.posted}</Text>
          </View>
        </View>

        <View style={s.cardBody}>
          <Text style={s.role} numberOfLines={1}>{job.role}</Text>
          <Text style={s.company}>{job.company}</Text>
          <View style={s.metaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={s.meta} numberOfLines={1}>{job.location}</Text>
          </View>
          <Text style={s.salary} numberOfLines={1}>{job.salary}</Text>

          <View style={s.tagRow}>
            {job.tags.slice(0, 2).map(tag => (
              <TagPill key={`${job.id}-${tag.label}`} label={tag.label} variant={tag.variant} />
            ))}
          </View>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.footerText}>{job.applicants} applied</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.5)" />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

export default function AllJobsScreen() {
  const T = useTheme();
  const router = useRouter();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string; search?: string; source?: string; distance?: string; salary?: string }>();

  const source = typeof params.source === 'string' ? params.source : 'explore';
  const [activeFilter, setActiveFilter] = useState(
    typeof params.filter === 'string' ? params.filter : 'All'
  );
  const [search, setSearch] = useState(
    typeof params.search === 'string' ? params.search : ''
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const maxDistanceKm =
    typeof params.distance === 'string' ? Number(params.distance) : 50
  const minSalaryK =
    typeof params.salary === 'string' ? Number(params.salary) : 100

  const jobs = filterJobs(source === 'top-matches' ? BASE_CAROUSEL : GRID_JOBS, activeFilter, search, {
    maxDistanceKm,
    minSalaryK,
  });

  const handleOpenJob = (job: Job) => {
    router.push({ pathname: '/jobs/[id]', params: { id: String(job.id) } });
  };

  const title = source === 'top-matches' ? 'Top matches' : 'All jobs';
  const subtitle = source === 'top-matches'
    ? `${jobs.length} strongest matches for you`
    : search.trim().length > 0
      ? `${jobs.length} results for "${search.trim()}"`
      : `${jobs.length} jobs`;

  return (
    <View style={[s.screen, { backgroundColor: T.bg, paddingTop: topInset }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={T.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCopy}>
          <Text style={[s.title, { color: T.textPrimary }]}>{title}</Text>
          <Text style={[s.subtitle, { color: T.textSub }]}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={[s.settingsBtn, { backgroundColor: T.surface, borderColor: T.borderFaint }]}
          onPress={() => setFiltersOpen(open => !open)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={filtersOpen ? 'close' : 'tune-variant'}
            size={18}
            color={T.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={s.summaryRow}>
        <View style={[s.summaryPill, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={13} color={T.primary} />
          <Text style={[s.summaryText, { color: T.textPrimary }]}>{maxDistanceKm} km</Text>
        </View>
        <View style={[s.summaryPill, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
          <MaterialCommunityIcons name="cash-multiple" size={13} color={T.primary} />
          <Text style={[s.summaryText, { color: T.textPrimary }]}>${minSalaryK}k+</Text>
        </View>
      </View>

      {filtersOpen && (
        <View style={s.controls}>
          <View style={[s.searchBar, { backgroundColor: T.surface, borderColor: T.borderFaint }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={T.textHint} />
            <TextInput
              style={[s.searchInput, { color: T.textPrimary }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search roles, companies..."
              placeholderTextColor={T.textHint}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={16} color={T.textHint} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
            style={s.filterScrollView}
          >
            {FILTERS.map(f => f === activeFilter ? (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
                style={[s.chip, s.chipActive, { backgroundColor: T.primary }]}
              >
                <Text style={[s.chipActiveText, { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.75}
                style={[s.chip, s.chipInactive, { backgroundColor: T.surface, borderColor: T.borderFaint }]}
              >
                <Text style={[s.chipInactiveText, { color: T.textSub }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: bottomInset + 24 }]}
      >
        {jobs.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="briefcase-search-outline" size={36} color={T.borderFaint} />
            <Text style={[s.emptyTitle, { color: T.textPrimary }]}>No matching jobs</Text>
            <Text style={[s.emptyText, { color: T.textSub }]}>Try a different search or filter from Explore.</Text>
          </View>
        ) : (
          jobs.map(job => (
            <View key={job.id} style={s.cardWrap}>
              <JobListCard job={job} onPress={handleOpenJob} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: { paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterScrollView: { flexGrow: 0, flexShrink: 0, height: 52 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, alignItems: 'center' },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: {},
  chipInactive: { borderWidth: 1 },
  chipActiveText: { fontSize: 13, fontWeight: '700' },
  chipInactiveText: { fontSize: 13, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 4, flexWrap: 'wrap' },
  summaryPill: {
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryText: { fontSize: 12, fontWeight: '600' },
  scroll: {
    paddingHorizontal: 20,
  },
  cardWrap: {
    marginBottom: 10,
  },
  card: {
    minHeight: 144,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
  },
  cardImg: { borderRadius: 20 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,30,0.8)',
    borderRadius: 20,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topMetaText: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700' },
  cardBody: { gap: 3, marginTop: 2 },
  role: { color: '#fff', fontSize: 16, fontWeight: '800' },
  company: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { color: 'rgba(255,255,255,0.6)', fontSize: 11, flex: 1 },
  salary: { color: '#c084fc', fontSize: 12, fontWeight: '700', marginTop: 1 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 240 },
});
