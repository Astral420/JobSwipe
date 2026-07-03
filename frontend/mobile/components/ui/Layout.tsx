import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, GestureResponderEvent, Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows, cardBase } from './themes';

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: boolean;
  actionIcon?: string;
  onActionPress?: (event: GestureResponderEvent) => void;
  /** Second icon-button on the right */
  action2?: boolean;
  actionIcon2?: string;
  onAction2Press?: (event: GestureResponderEvent) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title, subtitle,
  action, actionIcon, onActionPress,
  action2, actionIcon2, onAction2Press,
}) => (
  <View style={ls.header}>
    <View style={{ flex: 1 }}>
      <Text style={ls.headerTitle}>{title}</Text>
      {subtitle && <Text style={ls.headerSub}>{subtitle}</Text>}
    </View>
    <View style={{ flexDirection: 'row', gap: Spacing['2'] }}>
      {action2 && (
        <TouchableOpacity style={ls.headerIconBtn} onPress={onAction2Press}>
          <MaterialCommunityIcons name={actionIcon2 as any} size={18} color={Colors.gray500} />
        </TouchableOpacity>
      )}
      {action && (
        <TouchableOpacity style={[ls.headerIconBtn, ls.headerIconBtnPrimary]} onPress={onActionPress}>
          <MaterialCommunityIcons name={actionIcon as any} size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ─── ProgressBar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current, total, showLabel = true, color = Colors.primary,
}) => {
  const pct = Math.round((current / total) * 100);
  return (
    <View style={ls.progressWrap}>
      <View style={ls.progressTrack}>
        <View style={[ls.progressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      {showLabel && (
        <Text style={ls.progressLabel}>{total - current} left</Text>
      )}
    </View>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  action?: (event: GestureResponderEvent) => void;
  actionLabel?: string;
  actionIcon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, subtitle, action, actionLabel, actionIcon = 'refresh',
}) => (
  <View style={ls.emptyWrap}>
    <View style={ls.emptyIconWrap}>
      <MaterialCommunityIcons name={icon as any} size={36} color={Colors.primary} />
    </View>
    <Text style={ls.emptyTitle}>{title}</Text>
    <Text style={ls.emptySub}>{subtitle}</Text>
    {action && (
      <TouchableOpacity style={ls.emptyBtn} onPress={action}>
        <MaterialCommunityIcons name={actionIcon as any} size={16} color={Colors.white} />
        <Text style={ls.emptyBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
interface DividerProps {
  color?: string;
  spacing?: number;
}

export const Divider: React.FC<DividerProps> = ({
  color = Colors.gray100, spacing = Spacing['3'],
}) => (
  <View style={{ height: 1, backgroundColor: color, marginVertical: spacing }} />
);

// ─── Spacer ───────────────────────────────────────────────────────────────────
type SpacerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
const SPACER_MAP: Record<SpacerSize, number> = {
  xs: Spacing['1'], sm: Spacing['2'], md: Spacing['4'], lg: Spacing['6'], xl: Spacing['8'],
};

interface SpacerProps { size?: SpacerSize }
export const Spacer: React.FC<SpacerProps> = ({ size = 'md' }) => (
  <View style={{ height: SPACER_MAP[size] }} />
);

// ─── SectionCard ─────────────────────────────────────────────────────────────
interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
  style?: object;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, children, action, actionLabel, style }) => (
  <View style={[ls.sectionCard, style]}>
    {title && (
      <View style={ls.sectionCardHeader}>
        <Text style={ls.sectionCardTitle}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action}>
            <Text style={ls.sectionCardAction}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    )}
    {children}
  </View>
);

// ─── SearchBar ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value, onChangeText, placeholder = 'Search...', onClear,
}) => (
  <View style={ls.searchWrap}>
    <MaterialCommunityIcons name="magnify" size={18} color={Colors.gray400} />
    <TextInput
      style={ls.searchInput}
      placeholder={placeholder}
      placeholderTextColor={Colors.gray400}
      value={value}
      onChangeText={onChangeText}
    />
    {value.length > 0 && onClear && (
      <TouchableOpacity onPress={onClear}>
        <MaterialCommunityIcons name="close-circle" size={16} color={Colors.gray300} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── FilterChips ─────────────────────────────────────────────────────────────
interface FilterChipsProps {
  options: string[];
  active: string;
  onSelect: (option: string) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ options, active, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={ls.chipsRow}
  >
    {options.map(opt => (
      <TouchableOpacity
        key={opt}
        style={[ls.chip, active === opt && ls.chipActive]}
        onPress={() => onSelect(opt)}
      >
        <Text style={[ls.chipText, active === opt && ls.chipTextActive]}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ─── SegmentControl ───────────────────────────────────────────────────────────
interface SegmentOption {
  key: string;
  label: string;
  badge?: number;
}

interface SegmentControlProps {
  options: SegmentOption[];
  active: string;
  onSelect: (key: string) => void;
}

export const SegmentControl: React.FC<SegmentControlProps> = ({ options, active, onSelect }) => (
  <View style={ls.segWrap}>
    <View style={ls.segTrack}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[ls.segBtn, active === opt.key && ls.segBtnActive]}
          onPress={() => onSelect(opt.key)}
        >
          <Text style={[ls.segText, active === opt.key && ls.segTextActive]}>{opt.label}</Text>
          {opt.badge !== undefined && opt.badge > 0 && (
            <View style={[ls.segBadge, active === opt.key && ls.segBadgeActive]}>
              <Text style={[ls.segBadgeText, active === opt.key && ls.segBadgeTextActive]}>
                {opt.badge}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── PreferenceRow ────────────────────────────────────────────────────────────
interface PreferenceRowProps {
  icon: string;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  borderBottom?: boolean;
}

export const PreferenceRow: React.FC<PreferenceRowProps> = ({
  icon, label, value, onChange, borderBottom = true,
}) => (
  <View style={[ls.prefRow, borderBottom && ls.prefRowBorder]}>
    <MaterialCommunityIcons name={icon as any} size={18} color={Colors.gray500} />
    <Text style={ls.prefLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: Colors.gray200, true: Colors.primaryMid }}
      thumbColor={value ? Colors.primary : Colors.gray400}
    />
  </View>
);

// ─── AvatarCircle ─────────────────────────────────────────────────────────────
interface AvatarCircleProps {
  initials: string;
  size?: number;
  color?: string;
  ring?: boolean;
  ringColor?: string;
}

export const AvatarCircle: React.FC<AvatarCircleProps> = ({
  initials, size = 60, color = Colors.primary,
  ring = false, ringColor = Colors.primaryMid,
}) => (
  <View style={ring ? [ls.avatarRing, { width: size + 10, height: size + 10, borderRadius: (size + 10) / 2, borderColor: ringColor }] : undefined}>
    <View style={[ls.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[ls.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  </View>
);

// ─── StatBox ─────────────────────────────────────────────────────────────────
interface StatBoxProps {
  value: string | number;
  label: string;
}

export const StatBox: React.FC<StatBoxProps> = ({ value, label }) => (
  <View style={ls.statBox}>
    <Text style={ls.statBoxVal}>{value}</Text>
    <Text style={ls.statBoxLbl}>{label}</Text>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const ls = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: Spacing['5'], paddingTop: Spacing['4'], paddingBottom: Spacing['3'],
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.gray900, letterSpacing: -0.5 },
  headerSub: { fontSize: Typography.base, color: Colors.gray400, marginTop: 2 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: Radii.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconBtnPrimary: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },

  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing['5'], gap: Spacing['3'],
    marginBottom: Spacing['3'],
  },
  progressTrack: { flex: 1, height: 4, backgroundColor: Colors.gray200, borderRadius: Radii.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.full },
  progressLabel: { fontSize: Typography.xs, color: Colors.gray400, minWidth: 36 },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, padding: Spacing['8'],
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: Radii.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['5'],
  },
  emptyTitle: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.gray900, marginBottom: Spacing['2'], textAlign: 'center' },
  emptySub: { fontSize: Typography.md, color: Colors.gray500, textAlign: 'center', lineHeight: Typography.md * Typography.relaxed, marginBottom: Spacing['6'] },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['2'],
    backgroundColor: Colors.primary, paddingHorizontal: Spacing['6'],
    paddingVertical: Spacing['3'], borderRadius: Radii.lg,
    ...Shadows.colored(Colors.primary),
  },
  emptyBtnText: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.white },

  sectionCard: { ...cardBase, padding: Spacing['4'] + 2, marginBottom: Spacing['3'] },
  sectionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['4'] },
  sectionCardTitle: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCardAction: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.primary },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['2'],
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'],
    borderWidth: 1, borderColor: Colors.gray200,
    marginHorizontal: Spacing['4'], marginBottom: Spacing['3'],
    ...Shadows.xs,
  },
  searchInput: { flex: 1, fontSize: Typography.md, color: Colors.gray900, padding: 0 },

  chipsRow: { paddingHorizontal: Spacing['4'], gap: Spacing['2'], paddingBottom: Spacing['3'] },
  chip: {
    paddingHorizontal: Spacing['4'], paddingVertical: 7,
    borderRadius: Radii.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.gray200,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.gray500 },
  chipTextActive: { color: Colors.white, fontWeight: Typography.semibold },

  segWrap: { paddingHorizontal: Spacing['4'], marginBottom: Spacing['1'] },
  segTrack: { flexDirection: 'row', backgroundColor: Colors.gray100, borderRadius: Radii.lg, padding: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: Radii.md },
  segBtnActive: { backgroundColor: Colors.surface, ...Shadows.xs },
  segText: { fontSize: Typography.md, fontWeight: Typography.medium, color: Colors.gray400 },
  segTextActive: { color: Colors.gray900, fontWeight: Typography.semibold },
  segBadge: { backgroundColor: Colors.gray200, borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  segBadgeActive: { backgroundColor: Colors.primary },
  segBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.gray500 },
  segBadgeTextActive: { color: Colors.white },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  prefRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  prefLabel: { flex: 1, fontSize: Typography.md, color: Colors.gray700 },

  avatarRing: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontWeight: Typography.bold },

  statBox: {
    flex: 1, ...cardBase, padding: Spacing['4'],
    alignItems: 'center',
  },
  statBoxVal: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.gray900, marginBottom: 2 },
  statBoxLbl: { fontSize: Typography.xs, color: Colors.gray400, fontWeight: Typography.medium },
});

// re-export Colors for convenience in tabs that only need a color
export { Colors };