import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

type IconName =
  | 'home-outline'
  | 'briefcase-plus-outline'
  | 'heart-outline'
  | 'office-building-outline';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home-outline' },
  { name: 'applicants', label: 'Jobs', icon: 'briefcase-plus-outline' },
  { name: 'matches', label: 'Matches', icon: 'heart-outline' },
  { name: 'profile', label: 'Profile', icon: 'office-building-outline' },
];

function CustomTabBar({ state, navigation }: any) {
  const T = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.bar, { backgroundColor: T.tabBar, paddingBottom: bottomPad }]}>
      <View style={[styles.topBorder, { backgroundColor: T.borderFaint }]} />

      <View style={styles.row}>
        {state.routes.map((route: any, i: number) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;

          const focused = state.index === i;
          const color = focused ? T.tabActive : T.tabInactive;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={styles.tab}>
              <MaterialCommunityIcons name={tab.icon} size={24} color={color} />
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
              {focused && <View style={[styles.indicator, { backgroundColor: T.tabActive }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function CompanyTabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="applicants" options={{ title: 'Jobs' }} />
      <Tabs.Screen name="matches" options={{ title: 'Matches' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="CreateJobScreen" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  topBorder: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingBottom: 4,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  indicator: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 2,
    borderRadius: 2,
  },
});
