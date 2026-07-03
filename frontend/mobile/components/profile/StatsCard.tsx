import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface StatsCardProps {
  applied: number;
  pendingMessages: number;
  closedMessages: number;
}

export function StatsCard({ applied, pendingMessages, closedMessages }: StatsCardProps) {
  const T = useTheme();

  const stats = [
    { label: 'Applied', value: String(applied) },
    { label: 'Pending Messages', value: String(pendingMessages) },
    { label: 'Closed Messages', value: String(closedMessages) },
  ];

  return (
    <View style={[styles.statsCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      {stats.map((st, i) => (
        <React.Fragment key={st.label}>
          {i > 0 && <View style={[styles.statSep, { backgroundColor: T.border }]} />}
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: T.textPrimary }]}>{st.value}</Text>
            <Text style={[styles.statLbl, { color: T.textHint }]}>{st.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: { 
    flexDirection: 'row', 
    marginHorizontal: 24, 
    borderRadius: 18, 
    borderWidth: 1.5, 
    paddingVertical: 20,
    marginTop: 20,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  statLbl: { fontSize: 11, marginTop: 5, fontWeight: '600', letterSpacing: 0.3 },
  statSep: { width: 1, height: 36 },
});
