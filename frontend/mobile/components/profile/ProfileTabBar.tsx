import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export type ProfileTab = 'overview' | 'experience' | 'skills' | 'documents';

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileTabBar({ activeTab, onTabChange }: ProfileTabBarProps) {
  const T = useTheme();
  
  const tabs: { 
    id: ProfileTab; 
    label: string; 
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] 
  }[] = [
    { id: 'overview', label: 'Overview', icon: 'account-outline' },
    { id: 'experience', label: 'Experience', icon: 'briefcase-outline' },
    { id: 'skills', label: 'Skills', icon: 'star-outline' },
    { id: 'documents', label: 'Documents', icon: 'file-document-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && { borderBottomColor: T.primary, borderBottomWidth: 3 }
              ]}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={tab.icon} 
                size={20} 
                color={isActive ? T.primary : T.textHint} 
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? T.primary : T.textHint },
                isActive && { fontWeight: '700' }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
