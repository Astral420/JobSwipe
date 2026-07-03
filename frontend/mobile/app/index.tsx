import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { getTheme } from '../theme';

export default function Index() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token    = useAuthStore((s) => s.token);
  const role     = useAuthStore((s) => s.role);
  const theme    = getTheme();

  useEffect(() => {
    if (!hydrated) return;
    
    // Add a small delay to ensure Stack is mounted
    const timer = setTimeout(() => {
      if (token && role) {
        const isCompanyRole = role === 'hr' || role === 'company_admin';
        router.replace(isCompanyRole ? '/(company-tabs)' : '/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [hydrated, token, role]);

  // Wait for hydration before redirecting
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}
