import React, { useState, useEffect } from 'react';
import { View, ScrollView, StatusBar, ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { uploadSingleFile } from '../../utils/fileUpload';
import { ProfileHeader, ProfileTabBar, StatsCard, SettingsSheet, type ProfileTab } from '../../components/profile';
import { EditBasicInfoSheet } from '../../components/profile/EditBasicInfoSheet';
import { EditExperienceSheet } from '../../components/profile/EditExperienceSheet';
import { EditEducationSheet } from '../../components/profile/EditEducationSheet';
import { EditSkillsSheet } from '../../components/profile/EditSkillsSheet';
import { AlertHelper } from '../../components/ui/CustomAlert';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type ExperienceItem = {
  id: number;
  role: string;
  company: string;
  period: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
};

type EducationItem = {
  id: number;
  degree: string;
  school: string;
  period: string;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileTab() {
  const T = useTheme();
  const tabBarHeight = useTabBarHeight();
  const { top: topInset } = useSafeAreaInsets();
  const clearToken = useAuthStore((s) => s.clearToken);

  // UI State
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showEditBasicInfo, setShowEditBasicInfo] = useState(false);
  const [showEditExperience, setShowEditExperience] = useState(false);
  const [showEditEducation, setShowEditEducation] = useState(false);
  const [showEditSkills, setShowEditSkills] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile Data
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileHeadline, setProfileHeadline] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileAbout, setProfileAbout] = useState('');
  const [hardSkills, setHardSkills] = useState<string[]>([]);
  const [softSkills, setSoftSkills] = useState<string[]>([]);
  const [stats, setStats] = useState({ applied: 0, pendingMessages: 0, closedMessages: 0 });
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [coverLetterUrl, setCoverLetterUrl] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [portfolioInput, setPortfolioInput] = useState('');
  const [uploadingDocumentType, setUploadingDocumentType] = useState<'resume' | 'cover-letter' | null>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  // Track changes
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [coverChanged, setCoverChanged] = useState(false);

  // ── Load Profile Data ─────────────────────────────────────────────────────
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/profile/applicant');
      const profile = data?.profile ?? data;
      if (!profile) return;

      const firstName = profile.first_name ?? '';
      const lastName = profile.last_name ?? '';
      const fullName = `${firstName} ${lastName}`.trim();

      setProfileName(fullName || 'User');
      setProfileLocation(profile.location || '');
      setProfileAbout(profile.bio || '');
      setProfileHeadline(profile.job_preferences?.desired_position || '');
      
      if (profile.profile_photo_url) setAvatarPhoto(profile.profile_photo_url);
      if (profile.cover_url) setCoverPhoto(profile.cover_url);

      if (profile.stats) {
        setStats({
          applied: profile.stats.applied ?? 0,
          pendingMessages: profile.stats.pending_messages ?? 0,
          closedMessages: profile.stats.closed_messages ?? 0,
        });
      }

      // Load experience
      if (Array.isArray(profile.work_experience)) {
        const EXP_COLORS = [T.primary, '#4ade80', '#60a5fa', '#f472b6', '#fb923c'];
        const EXP_ICONS: React.ComponentProps<typeof MaterialCommunityIcons>['name'][] = [
          'code-braces',
          'laptop',
          'briefcase-outline',
          'rocket-launch-outline',
          'office-building-outline',
        ];

        const expData = profile.work_experience.map((e: any, i: number) => ({
          id: i + 1,
          role: e.position ?? e.role ?? '',
          company: e.company ?? '',
          period: `${e.start_date ?? ''}${e.end_date ? ` - ${e.end_date}` : ''}`.trim(),
          icon: EXP_ICONS[i % EXP_ICONS.length],
          color: EXP_COLORS[i % EXP_COLORS.length],
        }));
        setExperience(expData);
      }

      // Load education
      if (Array.isArray(profile.education)) {
        const eduData = profile.education.map((e: any, i: number) => ({
          id: i + 1,
          degree: e.degree ?? '',
          school: e.institution ?? e.school ?? '',
          period: e.graduation_year ? String(e.graduation_year) : '',
        }));
        setEducation(eduData);
      }

      // Load skills
      if (profile.skills && typeof profile.skills === 'object') {
        if (Array.isArray(profile.skills.hard_skills)) {
          setHardSkills(profile.skills.hard_skills);
        }
        if (Array.isArray(profile.skills.soft_skills)) {
          setSoftSkills(profile.skills.soft_skills);
        }
      }

      // Load document URLs
      setResumeUrl(null);
      setCoverLetterUrl(null);
      setPortfolioUrl(null);
      if (profile.resume_url) setResumeUrl(profile.resume_url);
      if (profile.cover_letter_url) setCoverLetterUrl(profile.cover_letter_url);
      if (profile.portfolio_url) {
        setPortfolioUrl(profile.portfolio_url);
        setPortfolioInput(profile.portfolio_url);
      } else {
        setPortfolioInput('');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      AlertHelper.error('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Image Pickers ─────────────────────────────────────────────────────────
  const pickAvatar = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!r.canceled) {
      setAvatarPhoto(r.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const pickCover = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
    });
    if (!r.canceled) {
      setCoverPhoto(r.assets[0].uri);
      setCoverChanged(true);
    }
  };

  // ── Save Profile ──────────────────────────────────────────────────────────
  const handleSaveBasicInfo = async (data: { name: string; headline: string; country: string; region: string; province: string; city: string; street: string; about: string }) => {
    setSaving(true);
    try {
      const [firstName = '', ...rest] = data.name.trim().split(/\s+/);
      const lastName = rest.join(' ');

      // Construct full location based on country
      const isPhilippines = data.country === 'Philippines';
      const locationParts = isPhilippines
        ? [data.street, data.city, data.province, data.country].filter(Boolean)
        : [data.street, data.city, data.region, data.country].filter(Boolean);
      const fullLocation = locationParts.join(', ');

      // Save basic info
      await api.patch('/profile/applicant/basic-info', {
        first_name: firstName || data.name.trim() || 'Applicant',
        last_name: lastName || '-',
        location: fullLocation,
        location_city: data.city,
        location_region: data.region,
        location_country: data.country,
        bio: data.about,
      });

      // Update job preferences (headline)
      if (data.headline) {
        await api.patch('/profile/applicant/job-preferences', {
          desired_position: data.headline,
        });
      }

      AlertHelper.success('Success', 'Profile updated successfully!');
      await loadProfile();
    } catch (err: any) {
      console.error('Profile save error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to save profile. Please try again.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setUploading(false);

    try {
      const [firstName = '', ...rest] = profileName.trim().split(/\s+/);
      const lastName = rest.join(' ');

      // Save basic info
      await api.patch('/profile/applicant/basic-info', {
        first_name: firstName || profileName.trim() || 'Applicant',
        last_name: lastName || '-',
        location: profileLocation,
        bio: profileAbout,
      });

      // Upload avatar if changed
      if (avatarChanged && avatarPhoto && !avatarPhoto.startsWith('http')) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadSingleFile(
            { uri: avatarPhoto, name: `avatar_${Date.now()}.jpg` },
            'image'
          );
          await api.patch('/profile/applicant/photo', {
            profile_photo_url: uploadedUrl,
          });
          setAvatarPhoto(uploadedUrl);
          setAvatarChanged(false);
        } catch (err) {
          console.error('Avatar upload failed:', err);
          AlertHelper.warning('Upload Error', 'Failed to upload profile photo. Other changes were saved.');
        } finally {
          setUploading(false);
        }
      }

      // Upload cover if changed
      if (coverChanged && coverPhoto && !coverPhoto.startsWith('http')) {
        setUploading(true);
        try {
          const uploadedUrl = await uploadSingleFile(
            { uri: coverPhoto, name: `cover_${Date.now()}.jpg` },
            'image'
          );
          await api.patch('/profile/applicant/cover-photo', {
            cover_url: uploadedUrl,
          });
          setCoverPhoto(uploadedUrl);
          setCoverChanged(false);
        } catch (err) {
          console.error('Cover photo upload failed:', err);
          AlertHelper.warning('Upload Error', 'Failed to upload cover photo. Other changes were saved.');
        } finally {
          setUploading(false);
        }
      }

      AlertHelper.success('Success', 'Profile updated successfully!');
      await loadProfile();
    } catch (err: any) {
      console.error('Profile save error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  // ── Dropdown Handlers ─────────────────────────────────────────────────────
  const handleEditBasicInfo = () => {
    setShowEditBasicInfo(true);
  };

  const handleEditPhotos = async () => {
    AlertHelper.show(
      'Edit Photos',
      'Choose what to edit',
      [
        {
          text: 'Change Avatar',
          onPress: () => {
            // Close first alert, then show camera/gallery selection
            setTimeout(() => {
              AlertHelper.show(
                'Change Avatar',
                'Choose photo source',
                [
                  {
                    text: 'Camera',
                    onPress: () => {
                      setTimeout(async () => {
                        const r = await ImagePicker.launchCameraAsync({
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.85,
                        });
                        if (!r.canceled) {
                          setAvatarPhoto(r.assets[0].uri);
                          setAvatarChanged(true);
                          setSaving(true);
                          setUploading(true);
                          try {
                            const uploadedUrl = await uploadSingleFile(
                              { uri: r.assets[0].uri, name: `avatar_${Date.now()}.jpg` },
                              'image'
                            );
                            await api.patch('/profile/applicant/photo', {
                              profile_photo_url: uploadedUrl,
                            });
                            setAvatarPhoto(uploadedUrl);
                            setAvatarChanged(false);
                            AlertHelper.success('Success', 'Profile photo updated!');
                            await loadProfile();
                          } catch (err) {
                            console.error('Avatar upload failed:', err);
                            AlertHelper.error('Error', 'Failed to upload profile photo.');
                          } finally {
                            setSaving(false);
                            setUploading(false);
                          }
                        }
                      }, 300);
                    },
                  },
                  {
                    text: 'Gallery',
                    onPress: () => {
                      setTimeout(async () => {
                        const r = await ImagePicker.launchImageLibraryAsync({
                          allowsEditing: true,
                          aspect: [1, 1],
                          quality: 0.85,
                        });
                        if (!r.canceled) {
                          setAvatarPhoto(r.assets[0].uri);
                          setAvatarChanged(true);
                          setSaving(true);
                          setUploading(true);
                          try {
                            const uploadedUrl = await uploadSingleFile(
                              { uri: r.assets[0].uri, name: `avatar_${Date.now()}.jpg` },
                              'image'
                            );
                            await api.patch('/profile/applicant/photo', {
                              profile_photo_url: uploadedUrl,
                            });
                            setAvatarPhoto(uploadedUrl);
                            setAvatarChanged(false);
                            AlertHelper.success('Success', 'Profile photo updated!');
                            await loadProfile();
                          } catch (err) {
                            console.error('Avatar upload failed:', err);
                            AlertHelper.error('Error', 'Failed to upload profile photo.');
                          } finally {
                            setSaving(false);
                            setUploading(false);
                          }
                        }
                      }, 300);
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
                'info'
              );
            }, 300);
          },
        },
        {
          text: 'Change Cover Photo',
          onPress: () => {
            // Close first alert, then show camera/gallery selection
            setTimeout(() => {
              AlertHelper.show(
                'Change Cover Photo',
                'Choose photo source',
                [
                  {
                    text: 'Camera',
                    onPress: () => {
                      setTimeout(async () => {
                        const r = await ImagePicker.launchCameraAsync({
                          allowsEditing: true,
                          aspect: [3, 1],
                          quality: 0.85,
                        });
                        if (!r.canceled) {
                          setCoverPhoto(r.assets[0].uri);
                          setCoverChanged(true);
                          setSaving(true);
                          setUploading(true);
                          try {
                            const uploadedUrl = await uploadSingleFile(
                              { uri: r.assets[0].uri, name: `cover_${Date.now()}.jpg` },
                              'image'
                            );
                            await api.patch('/profile/applicant/cover-photo', {
                              cover_url: uploadedUrl,
                            });
                            setCoverPhoto(uploadedUrl);
                            setCoverChanged(false);
                            AlertHelper.success('Success', 'Cover photo updated!');
                            await loadProfile();
                          } catch (err) {
                            console.error('Cover photo upload failed:', err);
                            AlertHelper.error('Error', 'Failed to upload cover photo.');
                          } finally {
                            setSaving(false);
                            setUploading(false);
                          }
                        }
                      }, 300);
                    },
                  },
                  {
                    text: 'Gallery',
                    onPress: () => {
                      setTimeout(async () => {
                        const r = await ImagePicker.launchImageLibraryAsync({
                          allowsEditing: true,
                          aspect: [3, 1],
                          quality: 0.85,
                        });
                        if (!r.canceled) {
                          setCoverPhoto(r.assets[0].uri);
                          setCoverChanged(true);
                          setSaving(true);
                          setUploading(true);
                          try {
                            const uploadedUrl = await uploadSingleFile(
                              { uri: r.assets[0].uri, name: `cover_${Date.now()}.jpg` },
                              'image'
                            );
                            await api.patch('/profile/applicant/cover-photo', {
                              cover_url: uploadedUrl,
                            });
                            setCoverPhoto(uploadedUrl);
                            setCoverChanged(false);
                            AlertHelper.success('Success', 'Cover photo updated!');
                            await loadProfile();
                          } catch (err) {
                            console.error('Cover photo upload failed:', err);
                            AlertHelper.error('Error', 'Failed to upload cover photo.');
                          } finally {
                            setSaving(false);
                            setUploading(false);
                          }
                        }
                      }, 300);
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
                'info'
              );
            }, 300);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      'info'
    );
  };

  const handleEditExperience = () => {
    setShowEditExperience(true);
  };

  const handleAddExperience = async (data: { role: string; company: string; startDate: string; endDate: string; description: string }) => {
    try {
      const isCurrent = data.endDate === 'Present' || data.endDate === 'present' || !data.endDate;
      
      await api.post('/profile/applicant/experience', {
        position: data.role,
        company: data.company,
        start_date: data.startDate,
        end_date: isCurrent ? null : data.endDate,
        description: data.description,
        is_current: isCurrent,
      });
      AlertHelper.success('Success', 'Work experience added!');
      await loadProfile();
    } catch (err: any) {
      console.error('Add experience error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to add work experience.');
      throw err;
    }
  };

  const handleDeleteExperience = async (index: number) => {
    try {
      await api.delete(`/profile/applicant/experience/${index}`);
      AlertHelper.success('Success', 'Work experience deleted!');
      await loadProfile();
    } catch (err: any) {
      console.error('Delete experience error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to delete work experience.');
      throw err;
    }
  };

  const handleEditEducation = () => {
    setShowEditEducation(true);
  };

  const handleAddEducation = async (data: { degree: string; school: string; fieldOfStudy: string; startDate: string; endDate: string }) => {
    try {
      // Extract year from end date for graduation_year (YYYY-MM-DD format)
      const graduationYear = data.endDate ? parseInt(data.endDate.split('-')[0], 10) : null;
      
      await api.post('/profile/applicant/education', {
        degree: data.degree,
        institution: data.school,
        field: data.fieldOfStudy,  // Profile edit API expects 'field', not 'field_of_study'
        graduation_year: graduationYear,  // Profile edit API expects 'graduation_year', not start/end dates
      });
      AlertHelper.success('Success', 'Education added!');
      await loadProfile();
    } catch (err: any) {
      console.error('Add education error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to add education.');
      throw err;
    }
  };

  const handleDeleteEducation = async (index: number) => {
    try {
      await api.delete(`/profile/applicant/education/${index}`);
      AlertHelper.success('Success', 'Education deleted!');
      await loadProfile();
    } catch (err: any) {
      console.error('Delete education error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to delete education.');
      throw err;
    }
  };

  const handleEditSkills = () => {
    setShowEditSkills(true);
  };

  const handleSaveSkills = async (data: { hardSkills: string[]; softSkills: string[] }) => {
    try {
      await api.patch('/profile/applicant/skills', {
        hard_skills: data.hardSkills,
        soft_skills: data.softSkills,
      });
      AlertHelper.success('Success', 'Skills updated!');
      await loadProfile();
    } catch (err: any) {
      console.error('Save skills error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to save skills.');
      throw err;
    }
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      const path = new URL(url).pathname;
      const fileName = path.split('/').pop();
      return fileName ? decodeURIComponent(fileName) : 'Uploaded file';
    } catch {
      return 'Uploaded file';
    }
  };

  const handleOpenDocument = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      AlertHelper.error('Error', 'Unable to open this link right now.');
    }
  };

  const handleUploadDocument = async (documentType: 'resume' | 'cover-letter') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const file = result.assets[0];
      const fileName = file.name || `${documentType.replace('-', '_')}_${Date.now()}.pdf`;

      setUploadingDocumentType(documentType);
      const uploadedUrl = await uploadSingleFile(
        {
          uri: file.uri,
          name: fileName,
          type: file.mimeType ?? undefined,
          size: file.size ?? undefined,
        },
        'document'
      );

      if (documentType === 'resume') {
        await api.patch('/profile/applicant/resume', { resume_url: uploadedUrl });
        AlertHelper.success('Success', 'Resume updated.');
      } else {
        await api.patch('/profile/applicant/cover-letter', { cover_letter_url: uploadedUrl });
        AlertHelper.success('Success', 'Cover letter updated.');
      }

      await loadProfile();
    } catch (err: any) {
      console.error(`${documentType} upload error:`, err);
      AlertHelper.error('Error', err?.message || 'Failed to upload document.');
    } finally {
      setUploadingDocumentType(null);
    }
  };

  const handleSavePortfolio = async () => {
    const trimmed = portfolioInput.trim();
    if (!trimmed) {
      AlertHelper.error('Error', 'Please enter a portfolio URL.');
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        AlertHelper.error('Error', 'Portfolio URL must start with http:// or https://');
        return;
      }

      setSavingPortfolio(true);
      await api.patch('/profile/applicant/portfolio', { portfolio_url: trimmed });
      AlertHelper.success('Success', 'Portfolio updated.');
      await loadProfile();
    } catch (err: any) {
      console.error('Portfolio save error:', err);
      AlertHelper.error('Error', err?.message || 'Failed to update portfolio.');
    } finally {
      setSavingPortfolio(false);
    }
  };

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      /* ignore */
    }
    await clearToken();
    router.replace('/(auth)/login');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: T.bg }]}>
      <StatusBar
        barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Settings Sheet */}
      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={() => {
          setShowSettings(false);
          setShowSignOutModal(true);
        }}
      />

      {/* Edit Basic Info Sheet */}
      <EditBasicInfoSheet
        visible={showEditBasicInfo}
        onClose={() => setShowEditBasicInfo(false)}
        onSave={handleSaveBasicInfo}
        initialData={{
          name: profileName,
          headline: profileHeadline,
          location: profileLocation,
          about: profileAbout,
        }}
      />

      {/* Edit Experience Sheet */}
      <EditExperienceSheet
        visible={showEditExperience}
        onClose={() => setShowEditExperience(false)}
        onAdd={handleAddExperience}
        onDelete={handleDeleteExperience}
        experiences={experience}
      />

      {/* Edit Education Sheet */}
      <EditEducationSheet
        visible={showEditEducation}
        onClose={() => setShowEditEducation(false)}
        onAdd={handleAddEducation}
        onDelete={handleDeleteEducation}
        education={education}
      />

      {/* Edit Skills Sheet */}
      <EditSkillsSheet
        visible={showEditSkills}
        onClose={() => setShowEditSkills(false)}
        onSave={handleSaveSkills}
        initialData={{
          hardSkills,
          softSkills,
        }}
      />

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.overlay}>
          <View style={[styles.overlayCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text style={[styles.overlayText, { color: T.textPrimary }]}>Uploading photos...</Text>
            <Text style={[styles.overlaySubtext, { color: T.textSub }]}>Please wait</Text>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={[styles.overlay, { backgroundColor: T.bg }]}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={[styles.overlayText, { color: T.textPrimary }]}>Loading profile...</Text>
        </View>
      )}

      {/* Sign Out Modal */}
      {showSignOutModal && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowSignOutModal(false)}
          />
          <View style={[styles.modal, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: T.dangerBg }]}>
              <MaterialCommunityIcons name="logout" size={28} color={T.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: T.textPrimary }]}>Sign Out</Text>
            <Text style={[styles.modalMessage, { color: T.textSub }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: T.textSub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: T.danger }]}
                onPress={async () => {
                  setShowSignOutModal(false);
                  await handleSignOut();
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
      >
        {/* Profile Header */}
        <ProfileHeader
          coverPhoto={coverPhoto}
          avatarPhoto={avatarPhoto}
          profileName={profileName}
          profileHeadline={profileHeadline}
          profileLocation={profileLocation}
          saving={saving}
          topInset={topInset}
          onSettingsPress={() => setShowSettings(true)}
          onEditBasicInfo={handleEditBasicInfo}
          onEditExperience={handleEditExperience}
          onEditEducation={handleEditEducation}
          onEditSkills={handleEditSkills}
          onEditPhotos={handleEditPhotos}
        />

        {/* Tab Bar */}
        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            <StatsCard
              applied={stats.applied}
              pendingMessages={stats.pendingMessages}
              closedMessages={stats.closedMessages}
            />

            {/* My Applications Button */}
            <TouchableOpacity
              style={[styles.applicationsBtn, { backgroundColor: T.surface, borderColor: T.border }]}
              activeOpacity={0.8}
              onPress={() => router.push('/applications')}
            >
              <View style={[styles.applicationsBtnIcon, { backgroundColor: T.primary + '18' }]}>
                <MaterialCommunityIcons name="briefcase-outline" size={20} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.applicationsBtnTitle, { color: T.textPrimary }]}>
                  My Applications
                </Text>
                <Text style={[styles.applicationsBtnSub, { color: T.textHint }]}>
                  View all your job applications
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={T.textHint} />
            </TouchableOpacity>

            {/* About Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: T.textHint }]}>ABOUT</Text>
              <Text style={[styles.aboutText, { color: T.textSub }]}>
                {profileAbout || 'No bio added yet'}
              </Text>
            </View>
          </>
        )}

        {activeTab === 'experience' && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: T.textHint }]}>EXPERIENCE</Text>
            {experience.length === 0 ? (
              <Text style={[styles.emptyText, { color: T.textHint }]}>
                No work experience added yet
              </Text>
            ) : (
              <View style={{ gap: 16 }}>
                {experience.map((exp) => (
                  <View key={exp.id} style={styles.expRow}>
                    <View style={[styles.expIcon, { backgroundColor: exp.color + '18' }]}>
                      <MaterialCommunityIcons name={exp.icon} size={15} color={exp.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expRole, { color: T.textPrimary }]}>{exp.role}</Text>
                      <Text style={[styles.expMeta, { color: T.textHint }]}>
                        {exp.company} · {exp.period}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.separator, { backgroundColor: T.borderFaint }]} />

            <Text style={[styles.sectionTitle, { color: T.textHint }]}>EDUCATION</Text>
            {education.length === 0 ? (
              <Text style={[styles.emptyText, { color: T.textHint }]}>No education added yet</Text>
            ) : (
              <View style={{ gap: 16 }}>
                {education.map((edu) => (
                  <View key={edu.id} style={styles.expRow}>
                    <View style={[styles.expIcon, { backgroundColor: T.primary + '18' }]}>
                      <MaterialCommunityIcons name="school-outline" size={15} color={T.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.expRole, { color: T.textPrimary }]}>{edu.degree}</Text>
                      <Text style={[styles.expMeta, { color: T.textHint }]}>
                        {edu.school} · {edu.period}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'skills' && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: T.textHint }]}>TECHNICAL SKILLS</Text>
            {hardSkills.length === 0 ? (
              <Text style={[styles.emptyText, { color: T.textHint }]}>No technical skills added yet</Text>
            ) : (
              <View style={styles.skillsContainer}>
                {hardSkills.map((skill) => (
                  <View key={skill} style={[styles.skillChip, { backgroundColor: T.primary + '18', borderColor: T.primary }]}>
                    <Text style={[styles.skillText, { color: T.primary }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.separator, { backgroundColor: T.borderFaint }]} />

            <Text style={[styles.sectionTitle, { color: T.textHint }]}>SOFT SKILLS</Text>
            {softSkills.length === 0 ? (
              <Text style={[styles.emptyText, { color: T.textHint }]}>No soft skills added yet</Text>
            ) : (
              <View style={styles.skillsContainer}>
                {softSkills.map((skill) => (
                  <View key={skill} style={[styles.skillChip, { backgroundColor: '#4ade8018', borderColor: '#4ade80' }]}>
                    <Text style={[styles.skillText, { color: '#4ade80' }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'documents' && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: T.textHint }]}>DOCUMENTS</Text>

            <View style={[styles.documentCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.expIcon, { backgroundColor: T.primary + '18' }]}>
                <MaterialCommunityIcons name="file-pdf-box" size={18} color={T.primary} />
              </View>
              <View style={styles.documentMain}>
                <Text style={[styles.expRole, { color: T.textPrimary }]}>Resume</Text>
                <Text style={[styles.expMeta, { color: T.textHint }]}>
                  {resumeUrl ? getFileNameFromUrl(resumeUrl) : 'Not uploaded'}
                </Text>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={[styles.docActionBtn, { backgroundColor: T.primary, opacity: uploadingDocumentType === 'resume' ? 0.8 : 1 }]}
                  onPress={() => handleUploadDocument('resume')}
                  disabled={uploadingDocumentType !== null}
                >
                  {uploadingDocumentType === 'resume' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.docActionBtnText}>{resumeUrl ? 'Replace' : 'Upload'}</Text>
                  )}
                </TouchableOpacity>
                {resumeUrl && (
                  <TouchableOpacity
                    style={[styles.docActionBtn, styles.docViewBtn, { borderColor: T.border }]}
                    onPress={() => handleOpenDocument(resumeUrl)}
                    disabled={uploadingDocumentType !== null}
                  >
                    <Text style={[styles.docViewBtnText, { color: T.textPrimary }]}>View</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.documentCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <View style={[styles.expIcon, { backgroundColor: '#4ade8018' }]}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color="#4ade80" />
              </View>
              <View style={styles.documentMain}>
                <Text style={[styles.expRole, { color: T.textPrimary }]}>Cover Letter</Text>
                <Text style={[styles.expMeta, { color: T.textHint }]}>
                  {coverLetterUrl ? getFileNameFromUrl(coverLetterUrl) : 'Not uploaded'}
                </Text>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={[styles.docActionBtn, { backgroundColor: T.primary, opacity: uploadingDocumentType === 'cover-letter' ? 0.8 : 1 }]}
                  onPress={() => handleUploadDocument('cover-letter')}
                  disabled={uploadingDocumentType !== null}
                >
                  {uploadingDocumentType === 'cover-letter' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.docActionBtnText}>{coverLetterUrl ? 'Replace' : 'Upload'}</Text>
                  )}
                </TouchableOpacity>
                {coverLetterUrl && (
                  <TouchableOpacity
                    style={[styles.docActionBtn, styles.docViewBtn, { borderColor: T.border }]}
                    onPress={() => handleOpenDocument(coverLetterUrl)}
                    disabled={uploadingDocumentType !== null}
                  >
                    <Text style={[styles.docViewBtnText, { color: T.textPrimary }]}>View</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.documentCard, { backgroundColor: T.surface, borderColor: T.border, alignItems: 'flex-start' }]}>
              <View style={[styles.expIcon, { backgroundColor: '#60a5fa18' }]}>
                <MaterialCommunityIcons name="link-variant" size={18} color="#60a5fa" />
              </View>
              <View style={styles.documentMain}>
                <Text style={[styles.expRole, { color: T.textPrimary }]}>Portfolio URL</Text>
                <Text style={[styles.expMeta, { color: T.textHint }]}>
                  {portfolioUrl || 'Not uploaded'}
                </Text>
                <TextInput
                  style={[styles.portfolioInput, { borderColor: T.border, color: T.textPrimary, backgroundColor: T.bg }]}
                  placeholder="https://behance.net/yourprofile"
                  placeholderTextColor={T.textHint}
                  value={portfolioInput}
                  onChangeText={setPortfolioInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={[styles.docActionBtn, { backgroundColor: T.primary, opacity: savingPortfolio ? 0.8 : 1 }]}
                  onPress={handleSavePortfolio}
                  disabled={savingPortfolio || uploadingDocumentType !== null}
                >
                  {savingPortfolio ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.docActionBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
                {portfolioUrl && (
                  <TouchableOpacity
                    style={[styles.docActionBtn, styles.docViewBtn, { borderColor: T.border }]}
                    onPress={() => handleOpenDocument(portfolioUrl)}
                    disabled={savingPortfolio || uploadingDocumentType !== null}
                  >
                    <Text style={[styles.docViewBtnText, { color: T.textPrimary }]}>View</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  overlayText: { fontSize: 16, fontWeight: '600', marginTop: 20 },
  overlaySubtext: { fontSize: 13, marginTop: 8 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  modal: {
    width: SCREEN_W - 48,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    position: 'absolute',
    top: '30%',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, letterSpacing: -0.5 },
  modalMessage: { fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 14, width: '100%' },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalButtonText: { fontSize: 15, fontWeight: '700' },
  applicationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 24,
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  applicationsBtnIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicationsBtnTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3, letterSpacing: -0.2 },
  applicationsBtnSub: { fontSize: 13, fontWeight: '500' },
  section: { paddingHorizontal: 24, marginTop: 32 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  aboutText: { fontSize: 15, lineHeight: 24, fontWeight: '400' },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  expIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expRole: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  expMeta: { fontSize: 13, marginTop: 3, fontWeight: '500' },
  documentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  documentMain: { flex: 1, minWidth: 0 },
  documentActions: {
    minWidth: 82,
    gap: 8,
    alignItems: 'stretch',
  },
  docActionBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  docViewBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  docViewBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  portfolioInput: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  separator: { height: 1, marginVertical: 32 },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skillText: { fontSize: 13, fontWeight: '600' },
});
