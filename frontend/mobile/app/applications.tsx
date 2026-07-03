import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { api } from '../services/api';

type Application = {
  id: number;
  job_id: number;
  job_title: string;
  company_name: string;
  company_logo?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  applied_at: string;
  location?: string;
  work_type?: string;
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'clock-outline' },
  reviewed: { label: 'Reviewed', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', icon: 'eye-outline' },
  accepted: { label: 'Accepted', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'check-circle-outline' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: 'close-circle-outline' },
} as const;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ApplicationsScreen() {
  const T = useTheme();
  const { top } = useSafeAreaInsets();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response: any = await api.get('/applicant/applications');

      // Transform API response
      const apps: Application[] = (response?.applications || []).map((app: any) => ({
        id: app.id,
        job_id: app.job_id,
        job_title: app.job_title || app.job?.title || 'Unknown Position',
        company_name: app.company_name || app.company?.name || 'Unknown Company',
        company_logo: app.company_logo || app.company?.logo_url,
        status: app.status || 'pending',
        applied_at: app.applied_at || app.created_at,
        location: app.location || app.job?.location,
        work_type: app.work_type || app.job?.work_type,
      }));

      setApplications(apps);
    } catch (err: any) {
      console.error('Failed to fetch applications:', err);
      setError(err?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => fetchApplications(true);

  const renderApplication = ({ item }: { item: Application }) => {
    const statusConfig = STATUS_CONFIG[item.status];

    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}
        activeOpacity={0.8}
        onPress={() => {
          // Navigate to job detail if needed
          // router.push(`/jobs/${item.job_id}`);
        }}
      >
        <View style={s.cardHeader}>
          <View style={[s.companyLogo, { backgroundColor: T.primary + '15', borderColor: T.border }]}>
            <Text style={[s.companyInitial, { color: T.primary }]}>
              {item.company_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.jobTitle, { color: T.textPrimary }]} numberOfLines={1}>
              {item.job_title}
            </Text>
            <Text style={[s.companyName, { color: T.textSub }]} numberOfLines={1}>
              {item.company_name}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color + '30' }]}>
            <MaterialCommunityIcons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
            <Text style={[s.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {(item.location || item.work_type) && (
          <View style={s.cardMeta}>
            {item.location && (
              <View style={s.metaItem}>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color={T.textHint} />
                <Text style={[s.metaText, { color: T.textHint }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
            {item.work_type && (
              <View style={s.metaItem}>
                <MaterialCommunityIcons name="laptop" size={12} color={T.textHint} />
                <Text style={[s.metaText, { color: T.textHint }]}>
                  {item.work_type === 'on_site' ? 'On-site' : item.work_type.charAt(0).toUpperCase() + item.work_type.slice(1)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.cardFooter}>
          <MaterialCommunityIcons name="calendar-outline" size={12} color={T.textHint} />
          <Text style={[s.appliedText, { color: T.textHint }]}>
            Applied {formatDate(item.applied_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.screen, { backgroundColor: T.bg, paddingTop: top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: T.borderFaint }]}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={T.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: T.textPrimary }]}>My Applications</Text>
          <Text style={[s.subtitle, { color: T.textHint }]}>
            {applications.length} {applications.length === 1 ? 'application' : 'applications'}
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={[s.emptyText, { color: T.textSub, marginTop: 16 }]}>Loading applications...</Text>
        </View>
      ) : error ? (
        <View style={s.centerContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={[s.emptyTitle, { color: T.textPrimary }]}>Failed to load</Text>
          <Text style={[s.emptyText, { color: T.textSub }]}>{error}</Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: T.primary }]}
            onPress={() => fetchApplications()}
          >
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : applications.length === 0 ? (
        <View style={s.centerContainer}>
          <MaterialCommunityIcons name="briefcase-search-outline" size={48} color={T.textHint} />
          <Text style={[s.emptyTitle, { color: T.textPrimary }]}>No applications yet</Text>
          <Text style={[s.emptyText, { color: T.textSub }]}>
            Start swiping on jobs to apply and track your applications here
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: T.primary }]}
            onPress={() => router.back()}
          >
            <Text style={s.retryBtnText}>Browse Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderApplication}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.primary}
              colors={[T.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, marginTop: 3 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  companyLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInitial: { fontSize: 18, fontWeight: '800' },
  jobTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  companyName: { fontSize: 13 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: { fontSize: 11, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedText: { fontSize: 11 },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
