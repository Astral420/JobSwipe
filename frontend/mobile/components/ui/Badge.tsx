import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from './themes';

// ─── SwipeLabel ────────────────────────────────────────────────────────────
interface SwipeLabelProps {
  type?: 'like' | 'pass' | 'super';
  visible?: boolean;
}

export const SwipeLabel: React.FC<SwipeLabelProps> = ({ type = 'like', visible }) => {
  if (!visible) return null;

  const config = {
    like:  { label: 'APPLY', borderColor: Colors.success,  bg: Colors.successLight, text: Colors.success,  side: 'right' },
    pass:  { label: 'SKIP',  borderColor: Colors.danger,   bg: Colors.dangerLight,  text: Colors.danger,   side: 'left'  },
    super: { label: 'SUPER', borderColor: Colors.primary,  bg: Colors.primaryLight, text: Colors.primary,  side: 'center' },
  }[type];

  return (
    <View style={[
      styles.swipeLabel,
      { borderColor: config.borderColor, backgroundColor: config.bg },
      config.side === 'right'  && styles.swipeLabelRight,
      config.side === 'left'   && styles.swipeLabelLeft,
      config.side === 'center' && styles.swipeLabelCenter,
    ]}>
      <Text style={[styles.swipeLabelText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

// ─── MatchBadge ────────────────────────────────────────────────────────────
interface MatchBadgeProps {
  percent: number;
}

export const MatchBadge: React.FC<MatchBadgeProps> = ({ percent }) => {
  const color =
    percent >= 85 ? Colors.success :
    percent >= 70 ? Colors.warning :
    Colors.danger;

  return (
    <View style={styles.matchBadge}>
      <View style={[styles.matchDot, { backgroundColor: color }]} />
      <Text style={styles.matchText}>{percent}% match</Text>
    </View>
  );
};

// ─── StatusPill ────────────────────────────────────────────────────────────
type StatusType = 'applied' | 'screening' | 'interview' | 'offer';

interface StatusPillProps {
  status: StatusType;
}

const STATUS_CONFIG: Record<StatusType, { label: string; bg: string; text: string }> = {
  applied:   { label: 'Applied',   bg: Colors.gray100,      text: Colors.gray500     },
  screening: { label: 'Screening', bg: Colors.warningLight,  text: '#9A3412'          },
  interview: { label: 'Interview', bg: Colors.primaryLight,  text: Colors.primaryDark },
  offer:     { label: 'Offer 🎉',  bg: Colors.successLight,  text: '#166534'          },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
};

// ─── CountBadge ────────────────────────────────────────────────────────────
interface CountBadgeProps {
  count: number;
  color?: string;
  textColor?: string;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  color = Colors.danger,
  textColor = Colors.white,
}) => (
  <View style={[styles.countBadge, { backgroundColor: color }]}>
    <Text style={[styles.countBadgeText, { color: textColor }]}>{count}</Text>
  </View>
);

// ─── TagBadge ──────────────────────────────────────────────────────────────
interface TagBadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'neutral' | 'remote';
}

const TAG_VARIANTS = {
  primary: { bg: Colors.primaryLight, text: Colors.primaryDark },
  success: { bg: Colors.successLight,  text: '#166534'          },
  warning: { bg: Colors.warningLight,  text: '#9A3412'          },
  neutral: { bg: Colors.gray100,       text: Colors.gray600     },
  remote:  { bg: Colors.primaryLight,  text: Colors.primaryDark },
};

export const TagBadge: React.FC<TagBadgeProps> = ({ label, variant = 'neutral' }) => {
  const v = TAG_VARIANTS[variant];
  return (
    <View style={[styles.tagBadge, { backgroundColor: v.bg }]}>
      <Text style={[styles.tagBadgeText, { color: v.text }]}>{label}</Text>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  swipeLabel: {
    position: 'absolute',
    top: Spacing['5'],
    paddingHorizontal: Spacing['5'],
    paddingVertical: Spacing['3'],
    borderRadius: Radii.md,
    borderWidth: 3,
    zIndex: 10,
  },
  swipeLabelRight:  { right: Spacing['5'] },
  swipeLabelLeft:   { left: Spacing['5'] },
  swipeLabelCenter: { alignSelf: 'center', left: undefined, right: undefined },
  swipeLabelText: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.extrabold,
    letterSpacing: 3,
  },

  matchBadge: {
    position: 'absolute',
    top: Spacing['3'],
    right: Spacing['3'],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing['3'],
    paddingVertical: 5,
    gap: 5,
  },
  matchDot: { width: 7, height: 7, borderRadius: Radii.full },
  matchText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.gray900 },

  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing['2'],
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  statusPillText: { fontSize: Typography.xs, fontWeight: Typography.semibold },

  countBadge: {
    position: 'absolute',
    top: -4, right: -4,
    minWidth: 18, height: 18,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  countBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold },

  tagBadge: {
    paddingHorizontal: Spacing['3'],
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  tagBadgeText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
});
