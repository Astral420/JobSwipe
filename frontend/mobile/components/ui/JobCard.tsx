import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii } from './themes';
import { TagBadge } from './Badge';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface StatItem {
  icon: string;
  label: string;
  color: string;
}

export interface JobTag {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'neutral';
}

// ─── CompanyLogo ─────────────────────────────────────────────────────────────
interface CompanyLogoProps {
  abbr: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({ abbr, color, size = 'md' }) => {
  const dim = size === 'sm' ? 38 : size === 'md' ? 48 : 80;
  const fontSize = size === 'lg' ? Typography['2xl'] : size === 'md' ? Typography.lg : Typography.base;
  return (
    <View style={[styles.logo, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: color }]}>
      <Text style={[styles.logoText, { fontSize }]}>{abbr}</Text>
    </View>
  );
};

// ─── JobCardHeader ────────────────────────────────────────────────────────────
interface JobCardHeaderProps {
  company: string;
  abbr: string;
  logoColor: string;
  rating: number;
  onInfo?: (event: GestureResponderEvent) => void;
}

export const JobCardHeader: React.FC<JobCardHeaderProps> = ({
  company, abbr, logoColor, rating, onInfo,
}) => (
  <View style={styles.header}>
    <CompanyLogo abbr={abbr} color={logoColor} size="md" />
    <View style={styles.headerInfo}>
      <Text style={styles.headerCompany}>{company}</Text>
      <View style={styles.ratingRow}>
        <MaterialCommunityIcons name="star" size={13} color={Colors.warning} />
        <Text style={styles.ratingNum}>{rating}</Text>
        <Text style={styles.ratingLabel}> · Glassdoor</Text>
      </View>
    </View>
    <TouchableOpacity style={styles.infoBtn} onPress={onInfo}>
      <MaterialCommunityIcons name="information-outline" size={16} color={Colors.gray400} />
    </TouchableOpacity>
  </View>
);

// ─── JobCardPosition ──────────────────────────────────────────────────────────
interface JobCardPositionProps {
  position: string;
  salary: string;
}

export const JobCardPosition: React.FC<JobCardPositionProps> = ({ position, salary }) => (
  <View style={styles.positionWrap}>
    <Text style={styles.positionRole}>{position}</Text>
    <Text style={styles.positionSalary}>{salary}</Text>
  </View>
);

// ─── JobCardLocation ──────────────────────────────────────────────────────────
interface JobCardLocationProps {
  location: string;
}

export const JobCardLocation: React.FC<JobCardLocationProps> = ({ location }) => (
  <View style={styles.locRow}>
    <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.gray400} />
    <Text style={styles.locText}>{location}</Text>
  </View>
);

// ─── JobCardTags ──────────────────────────────────────────────────────────────
interface JobCardTagsProps {
  tags: JobTag[];
}

export const JobCardTags: React.FC<JobCardTagsProps> = ({ tags }) => (
  <View style={styles.tagsRow}>
    {tags.map((tag, i) => (
      <TagBadge key={i} label={tag.label} variant={tag.variant ?? 'neutral'} />
    ))}
  </View>
);

// ─── JobCardDescription ───────────────────────────────────────────────────────
interface JobCardDescriptionProps {
  description: string;
}

export const JobCardDescription: React.FC<JobCardDescriptionProps> = ({ description }) => (
  <Text style={styles.desc}>{description}</Text>
);

// ─── JobCardStats ─────────────────────────────────────────────────────────────
interface JobCardStatsProps {
  stats: StatItem[];
}

export const JobCardStats: React.FC<JobCardStatsProps> = ({ stats }) => (
  <View style={styles.statsRow}>
    {stats.map((stat, i) => (
      <React.Fragment key={i}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name={stat.icon as any} size={16} color={stat.color} />
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
        {i < stats.length - 1 && <View style={styles.statDivider} />}
      </React.Fragment>
    ))}
  </View>
);

// ─── JobCardHero ─────────────────────────────────────────────────────────────
interface JobCardHeroProps {
  abbr: string;
  logoColor: string;
  heroBg: string;
  children?: React.ReactNode;
}

export const JobCardHero: React.FC<JobCardHeroProps> = ({ abbr, logoColor, heroBg, children }) => (
  <View style={[styles.heroBand, { backgroundColor: heroBg }]}>
    <CompanyLogo abbr={abbr} color={logoColor} size="lg" />
    {children}
  </View>
);

// ─── JobCardMatchBar ──────────────────────────────────────────────────────────
interface JobCardMatchBarProps {
  percent: number;
}

export const JobCardMatchBar: React.FC<JobCardMatchBarProps> = ({ percent }) => {
  const color =
    percent >= 85 ? Colors.success :
    percent >= 70 ? Colors.warning :
    Colors.danger;
  return (
    <View style={styles.matchBarRow}>
      <View style={styles.matchBarTrack}>
        <View style={[styles.matchBarFill, { width: `${percent}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.matchBarPct, { color }]}>{percent}%</Text>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  logo: { alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.white, fontWeight: Typography.bold },

  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing['3'], marginBottom: Spacing['3'],
  },
  headerInfo: { flex: 1 },
  headerCompany: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.gray900 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingNum: { fontSize: Typography.sm, color: Colors.gray500, marginLeft: 2 },
  ratingLabel: { fontSize: Typography.sm, color: Colors.gray400 },
  infoBtn: {
    width: 30, height: 30, borderRadius: Radii.full,
    borderWidth: 1, borderColor: Colors.gray200,
    alignItems: 'center', justifyContent: 'center',
  },

  positionWrap: { marginBottom: Spacing['2'] },
  positionRole: {
    fontSize: Typography['2xl'], fontWeight: Typography.bold,
    color: Colors.gray900, marginBottom: 3, letterSpacing: -0.3,
  },
  positionSalary: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.primary },

  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing['3'] },
  locText: { fontSize: Typography.base, color: Colors.gray400 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'], marginBottom: Spacing['3'] },

  desc: {
    fontSize: Typography.base, color: Colors.gray500,
    lineHeight: Typography.base * Typography.normal,
    marginBottom: Spacing['3'],
  },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: Colors.gray50, borderRadius: Radii.lg, padding: Spacing['3'],
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.gray700 },
  statDivider: { width: 1, height: 16, backgroundColor: Colors.gray200 },

  heroBand: { height: 170, alignItems: 'center', justifyContent: 'center', position: 'relative' },

  matchBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing['2'] },
  matchBarTrack: {
    flex: 1, height: 4, backgroundColor: Colors.gray100,
    borderRadius: Radii.full, overflow: 'hidden',
  },
  matchBarFill: { height: '100%', borderRadius: Radii.full },
  matchBarPct: { fontSize: Typography.xs, fontWeight: Typography.bold, minWidth: 32 },
});
