import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { EditProfileDropdown } from './EditProfileDropdown';

interface ProfileHeaderProps {
  coverPhoto: string | null;
  avatarPhoto: string | null;
  profileName: string;
  profileHeadline: string;
  profileLocation: string;
  saving: boolean;
  topInset: number;
  onSettingsPress: () => void;
  onEditBasicInfo: () => void;
  onEditExperience: () => void;
  onEditEducation: () => void;
  onEditSkills: () => void;
  onEditPhotos: () => void;
}

export function ProfileHeader({
  coverPhoto,
  avatarPhoto,
  profileName,
  profileHeadline,
  profileLocation,
  saving,
  topInset,
  onSettingsPress,
  onEditBasicInfo,
  onEditExperience,
  onEditEducation,
  onEditSkills,
  onEditPhotos,
}: ProfileHeaderProps) {
  const T = useTheme();

  const dropdownOptions = [
    {
      id: 'basic-info',
      label: 'Basic Information',
      icon: 'account-edit-outline' as const,
      onPress: onEditBasicInfo,
    },
    {
      id: 'photos',
      label: 'Photos & Cover',
      icon: 'camera-outline' as const,
      onPress: onEditPhotos,
    },
    {
      id: 'experience',
      label: 'Work Experience',
      icon: 'briefcase-outline' as const,
      onPress: onEditExperience,
    },
    {
      id: 'education',
      label: 'Education',
      icon: 'school-outline' as const,
      onPress: onEditEducation,
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: 'star-outline' as const,
      onPress: onEditSkills,
    },
  ];

  return (
    <>
      {/* Cover Photo */}
      <View style={[styles.coverWrap, { height: 200 + topInset, backgroundColor: T.surfaceHigh }]}>
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.coverFallback, { borderBottomColor: T.borderFaint }]}>
            <MaterialCommunityIcons name="image-outline" size={40} color={T.textHint} />
          </View>
        )}
        
        {/* Gradient overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />

        {/* Settings Button */}
        <TouchableOpacity
          style={[styles.settingsBtn, { 
            top: topInset + 16, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            borderColor: 'rgba(255,255,255,0.2)' 
          }]}
          onPress={onSettingsPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="cog-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Hero Row - Avatar & Edit Dropdown */}
      <View style={[styles.heroRow, { paddingHorizontal: 24 }]}>
        <View>
          {avatarPhoto ? (
            <Image source={{ uri: avatarPhoto }} style={[styles.avatar, { borderColor: T.bg }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: T.surfaceHigh, borderColor: T.bg }]}>
              <Text style={[styles.avatarInitials, { color: T.textPrimary }]}>
                {profileName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'JD'}
              </Text>
            </View>
          )}
        </View>

        <EditProfileDropdown saving={saving} options={dropdownOptions} />
      </View>

      {/* Profile Info */}
      <View style={[styles.heroInfo, { paddingHorizontal: 24 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Text style={[styles.name, { color: T.textPrimary }]}>{profileName}</Text>
          <MaterialCommunityIcons name="check-decagram" size={15} color={T.primary} />
        </View>
        <Text style={[styles.headline, { color: T.textSub }]}>{profileHeadline}</Text>
        <View style={styles.locRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={11} color={T.textHint} />
          <Text style={[styles.loc, { color: T.textHint }]}>{profileLocation}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  coverWrap: { width: '100%', overflow: 'hidden' },
  coverFallback: { alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1 },
  settingsBtn: { 
    position: 'absolute', 
    right: 16, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1 
  },
  heroRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between', 
    marginTop: -44, 
    marginBottom: 14 
  },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4 },
  avatarFallback: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 4 
  },
  avatarInitials: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  heroInfo: { paddingBottom: 20, paddingTop: 4 },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.7 },
  headline: { fontSize: 15, marginBottom: 6, fontWeight: '500' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  loc: { fontSize: 13, fontWeight: '500' },
});
