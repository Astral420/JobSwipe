import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useTheme } from '../../theme';
import { jobService, type Job } from '../../services/jobService';

// TODO: Add tests for job list screen
// Test cases should cover:
// - Loading jobs from API
// - Handling empty state
// - Filtering by status
// - Optimistic updates with rollback
// - Error handling for network failures
// - Pull-to-refresh functionality

const SEED_PRIMARY = '#a855f7';

// Icon mapping for different job types
const JOB_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  'frontend': 'code-braces',
  'backend': 'server-outline',
  'fullstack': 'laptop',
  'designer': 'pencil-ruler',
  'product': 'lightbulb-outline',
  'marketing': 'bullhorn-outline',
  'sales': 'handshake-outline',
  'default': 'briefcase-outline',
};

const JOB_COLORS = [SEED_PRIMARY, '#4ade80', '#60a5fa', '#f472b6', '#fb923c'];

export type JobPost = {
  id: number;
  title: string;
  dept: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  applicants: number;
  status: 'open' | 'paused' | 'closed';
  location?: string;
  location_region?: string;
};

type Filter = 'all' | 'open' | 'paused';
type ApplicantsRouteParams = {
  applicants: {
    newJobId?: number;
    editJobId?: number;
  };
};

// Helper to map API job to display format
const mapJobToDisplay = (job: Job, index: number): JobPost => {
  const titleLower = job.title.toLowerCase();
  let icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'briefcase-outline';
  
  // Try to match icon based on title
  for (const [key, value] of Object.entries(JOB_ICONS)) {
    if (titleLower.includes(key)) {
      icon = value;
      break;
    }
  }
  
  return {
    id: job.id,
    title: job.title,
    dept: job.location_region || job.location || 'General',
    description: job.description,
    icon,
    color: JOB_COLORS[index % JOB_COLORS.length],
    applicants: job.applicants_count || 0,
    status: job.status === 'active' ? 'open' : 'paused',
    location: job.location,
    location_region: job.location_region,
  };
};

export default function JobPostingsScreen() {
  const T = useTheme();
  const tabBarHeight = useTabBarHeight();
  const { top: topInset } = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ApplicantsRouteParams, 'applicants'>>();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = jobs.filter((j) => (filter === 'all' ? true : j.status === filter));

  // Load jobs from API
  const loadJobs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      const apiJobs = await jobService.list();
      const displayJobs = apiJobs.map((job, index) => mapJobToDisplay(job, index));
      setJobs(displayJobs);
    } catch (err: any) {
      console.error('Failed to load jobs:', err);
      setError(err?.message || 'Failed to load jobs');
      Alert.alert('Error', 'Failed to load job postings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Handle new job created
  useEffect(() => {
    const newJobId = route.params?.newJobId;
    if (newJobId) {
      // Reload jobs to get the new one
      loadJobs(false);
      navigation.setParams({ newJobId: undefined });
    }
  }, [route.params?.newJobId, loadJobs, navigation]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJobs(false);
  }, [loadJobs]);

  // Toggle job status (pause/reopen) with confirmation and optimistic update
  const toggleStatus = useCallback(async (id: number) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    const action = job.status === 'open' ? 'pause' : 'reopen';
    const actionText = action === 'pause' ? 'Pause' : 'Reopen';
    
    Alert.alert(
      `${actionText} Job?`,
      `Are you sure you want to ${action} "${job.title}"?${action === 'pause' ? ' Applicants won\'t be able to see this job while paused.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          onPress: async () => {
            // Optimistic update
            const previousJobs = [...jobs];
            setJobs(prev => prev.map(j => 
              j.id === id ? { ...j, status: j.status === 'open' ? 'paused' as const : 'open' as const } : j
            ));

            try {
              if (action === 'pause') {
                await jobService.close(id);
              } else {
                await jobService.reopen(id);
              }
            } catch (err: any) {
              console.error(`Failed to ${action} job:`, err);
              // Rollback on error
              setJobs(previousJobs);
              Alert.alert('Error', `Failed to ${action} job. Please try again.`);
            }
          },
        },
      ]
    );
  }, [jobs]);

  // Delete job with confirmation and optimistic update
  const removeJob = useCallback(async (id: number) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    Alert.alert(
      'Delete Job?',
      `Are you sure you want to delete "${job.title}"?\n\nThis will remove the job posting and all associated data. This action will be logged for audit purposes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            const previousJobs = [...jobs];
            setJobs(prev => prev.filter(j => j.id !== id));
            if (selected === id) setSelected(null);

            try {
              await jobService.delete(id);
            } catch (err: any) {
              console.error('Failed to delete job:', err);
              // Rollback on error
              setJobs(previousJobs);
              Alert.alert('Error', 'Failed to delete job. Please try again.');
            }
          },
        },
      ]
    );
  }, [jobs, selected]);

  // Navigate to edit job
  const editJob = useCallback((id: number) => {
    navigation.navigate('CreateJobScreen', { editJobId: id });
  }, [navigation]);

  const openCount = jobs.filter((j) => j.status === 'open').length;
  const totalApps = jobs.reduce((a, j) => a + j.applicants, 0);

  // Loading state
  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: topInset, backgroundColor: T.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={[s.loadingText, { color: T.textSub, marginTop: 16 }]}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: topInset, backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />

      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: T.textPrimary }]}>Job Posts</Text>
          <Text style={[s.headerSub, { color: T.textHint }]}>{openCount} active · {totalApps} total applicants</Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { borderColor: T.border, backgroundColor: T.surfaceHigh }]}
          onPress={() => navigation.navigate('CreateJobScreen')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={14} color={T.primary} />
          <Text style={[s.addBtnText, { color: T.primary }]}>New Post</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        {(['all', 'open', 'paused'] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                s.filterChip,
                { backgroundColor: T.surfaceHigh, borderColor: T.border },
                active && { backgroundColor: T.primary + '18', borderColor: T.primary + '55' },
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipText, { color: active ? T.primary : T.textHint }]}>
                {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Paused'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
            colors={[T.primary]}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="briefcase-off-outline" size={40} color={T.textHint} />
            <Text style={[s.emptyText, { color: T.textSub }]}>
              {error ? 'Failed to load jobs' : 'No job posts yet'}
            </Text>
            <Text style={[s.emptyHint, { color: T.textHint }]}>
              {error ? 'Pull down to retry' : 'Tap "New Post" to add your first one'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected === item.id;
          return (
            <TouchableOpacity
              style={[
                s.card,
                { backgroundColor: T.surface, borderColor: T.border },
                isSelected && { borderColor: T.primary + '66', backgroundColor: T.surfaceHigh },
              ]}
              onPress={() => setSelected(isSelected ? null : item.id)}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <View style={[s.iconWrap, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: T.textPrimary }]}>{item.title}</Text>
                  <Text style={[s.cardDept, { color: T.textHint }]}>{item.dept}</Text>
                </View>
                <View style={[s.statusPill, item.status === 'open' ? s.statusOpen : { backgroundColor: T.borderFaint }]}>
                  <Text style={[s.statusText, { color: item.status === 'open' ? '#4ade80' : T.textHint }]}>
                    {item.status === 'open' ? 'Open' : 'Paused'}
                  </Text>
                </View>
              </View>

              <View style={s.cardStats}>
                <View style={s.statItem}>
                  <MaterialCommunityIcons name="account-group-outline" size={13} color={T.textHint} />
                  <Text style={[s.statText, { color: T.textHint }]}>{item.applicants} applicants</Text>
                </View>
                <View style={[s.statDot, { backgroundColor: T.textHint }]} />
                <View style={s.statItem}>
                  <MaterialCommunityIcons name="briefcase-outline" size={13} color={T.textHint} />
                  <Text style={[s.statText, { color: T.textHint }]}>{item.dept}</Text>
                </View>
              </View>

              {isSelected && (
                <View style={s.cardActions}>
                  <View style={[s.divider, { backgroundColor: T.borderFaint }]} />
                  <Text style={[s.descriptionLabel, { color: T.textSub }]}>Description</Text>
                  <Text style={[s.descriptionText, { color: T.textPrimary }]}>{item.description}</Text>
                  <View style={[s.divider, { backgroundColor: T.borderFaint }]} />
                  <View style={s.actionsRow}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => editJob(item.id)} activeOpacity={0.8}>
                      <MaterialCommunityIcons name="pencil-outline" size={15} color={T.primary} />
                      <Text style={[s.actionText, { color: T.primary }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.actionBtn} onPress={() => toggleStatus(item.id)} activeOpacity={0.8}>
                      <MaterialCommunityIcons
                        name={item.status === 'open' ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={15}
                        color={item.status === 'open' ? T.textHint : '#4ade80'}
                      />
                      <Text style={[s.actionText, { color: item.status === 'open' ? T.textHint : '#4ade80' }]}>
                        {item.status === 'open' ? 'Pause' : 'Reopen'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.actionBtn} onPress={() => removeJob(item.id)} activeOpacity={0.8}>
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color={T.danger} />
                      <Text style={[s.actionText, { color: T.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  addBtnText: { fontSize: 12, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardDept: { fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusOpen: { backgroundColor: 'rgba(74,222,128,0.1)' },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11 },
  statDot: { width: 3, height: 3, borderRadius: 2 },
  cardActions: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },
  descriptionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  descriptionText: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13 },
  loadingText: { fontSize: 14, fontWeight: '600' },
});
