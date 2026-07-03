import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme'; // ← centralised theme

type IconName =
  | 'home-outline'
  | 'heart-outline'
  | 'chat-outline'
  | 'account-circle-outline';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index',   label: 'Home',     icon: 'home-outline'           },
  { name: 'matches', label: 'Messages', icon: 'chat-outline'           },
  { name: 'profile', label: 'Profile',  icon: 'account-circle-outline' },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const T      = useTheme();                           // ← live tokens
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.bar, { backgroundColor: T.tabBar, paddingBottom: bottomPad }]}>
      <View style={[styles.topBorder, { backgroundColor: T.borderFaint }]} />

      <View style={styles.row}>
        {state.routes.map((route: any, i: number) => {
          const focused = state.index === i;
          const tab     = TABS[i];
          const color   = focused ? T.tabActive : T.tabInactive;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <MaterialCommunityIcons name={(tab?.icon ?? 'home-outline') as any} size={24} color={color} />
              <Text style={[styles.label, { color }]}>{tab?.label ?? route.name}</Text>
              {focused && <View style={[styles.indicator, { backgroundColor: T.tabActive }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home'     }} />
      <Tabs.Screen name="matches" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile'  }} />
    </Tabs>
  );
}

// Only structural / size styles here — colours are applied inline from T
const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
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
