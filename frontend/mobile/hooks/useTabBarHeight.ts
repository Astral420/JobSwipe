import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the total height the floating tab bar occupies at the bottom of the
 * screen (tab content height + system bottom inset).  Use this as
 * `paddingBottom` on every ScrollView / FlatList inside a tab screen so
 * content is never hidden behind the bar.
 */
export function useTabBarHeight(): number {
  const { bottom } = useSafeAreaInsets();
  // Mirror the minimum in _layout.tsx — at least 12px on phones with no
  // gesture bar or hardware buttons (insets.bottom === 0).
  return 56 + Math.max(bottom, 12);
}