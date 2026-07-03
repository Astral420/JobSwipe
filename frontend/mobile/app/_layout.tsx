import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { getTheme } from '../theme';
import { AlertProvider } from '../components/ui/AlertProvider';

export default function RootLayout() {
  const hydrate  = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const token    = useAuthStore((s) => s.token);
  const role     = useAuthStore((s) => s.role);
  const isOnboarding = useAuthStore((s) => s.isOnboarding);
  const theme    = getTheme();
  const segments = useSegments() as string[];

  // Read persisted token once on mount
  useEffect(() => {
    hydrate();
  }, []);

  // Redirect once hydration is done
  useEffect(() => {
    if (!hydrated) return;
    
    // Add a small delay to ensure Stack is mounted
    const timer = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      const inApplicantTabs = segments[0] === '(tabs)';
      const inCompanyTabs = segments[0] === '(company-tabs)';
      const isCompanyRole = role === 'hr' || role === 'company_admin';

      if (token && role) {
        // Don't redirect away from auth screens while onboarding is in progress
        if (isOnboarding && inAuthGroup) return;

        // Only redirect if we're in auth group or undefined, but not if we're already in the correct tab group
        if (inAuthGroup || (segments[0] === undefined && !inApplicantTabs && !inCompanyTabs)) {
          router.replace(isCompanyRole ? '/(company-tabs)' : '/(tabs)');
          return;
        }

        if (isCompanyRole && inApplicantTabs) {
          router.replace('/(company-tabs)');
          return;
        }

        if (!isCompanyRole && inCompanyTabs) {
          router.replace('/(tabs)');
        }
        return;
      }

      if (!inAuthGroup && segments[0] !== undefined) {
        router.replace('/(auth)/login');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [hydrated, token, role, isOnboarding, segments]);

  // Enforce company onboarding completion (only for company_admin)
  useEffect(() => {
    if (!hydrated || !token || role !== 'company_admin') return;
    if (segments[0] === '(auth)') return;
    if (isOnboarding) return; // Skip check during active onboarding

    let cancelled = false;

    const enforceCompanyOnboarding = async () => {
      try {
        const status = await api.get('/profile/onboarding/status') as {
          completed?: boolean;
          onboarding_step?: number | string;
        };

        if (cancelled) return;

        const completed = status?.completed === true || status?.onboarding_step === 'completed';
        const isOnCompanyProfile = segments[0] === '(company-tabs)' && segments[1] === 'profile';

        // Only redirect if onboarding is NOT completed and user is not already on profile
        if (!completed && !isOnCompanyProfile) {
          router.replace('/(company-tabs)/profile');
        }
      } catch {
        // If status fetch fails, keep the current route instead of hard-blocking navigation.
      }
    };

    void enforceCompanyOnboarding();

    return () => {
      cancelled = true;
    };
  }, [hydrated, token, role, isOnboarding, segments]);

  // Blank screen while AsyncStorage is being read
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(company-tabs)" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="team-management" />
        <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Job Details' }} />
        <Stack.Screen name="messages/[conversationId]" options={{ headerShown: true }} />
      </Stack>
      <AlertProvider />
    </>
  );
}
