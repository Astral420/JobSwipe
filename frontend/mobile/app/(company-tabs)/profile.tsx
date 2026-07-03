import React, { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  Image,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { useTheme, setThemeMode, getThemeMode } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const PERKS = ['Hybrid Work', 'HMO Coverage', '14th Month', 'Stock Options', 'L&D Budget'];

type TeamMember = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  email: string;
};

type Plan = {
  id: string;
  name: string;
  price: string | null;
  color: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  badge: string | null;
  features: string[];
  locked: string[];
  cta: string | null;
};

const TEAM_ROLE_OPTIONS = [
  { value: 'hr', label: 'HR Manager', helper: 'Can manage recruiting and applicants' },
  { value: 'company_admin', label: 'Company Admin', helper: 'Full company access and settings control' },
] as const;

function formatInviteName(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildPlans(primary: string, gold: string): Plan[] {
  return [
    {
      id: 'free',
      name: 'Starter',
      price: null,
      color: primary,
      icon: 'star-outline',
      badge: null,
      features: ['3 active job posts', 'Basic applicant matching'],
      locked: ['See who liked your posts', 'Priority listing', 'Analytics dashboard', 'Dedicated sourcing'],
      cta: null,
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$49 / mo',
      color: gold,
      icon: 'lightning-bolt',
      badge: 'POPULAR',
      features: ['Unlimited job posts', 'Advanced matching', 'See who liked your posts', 'Priority listing'],
      locked: ['Analytics dashboard', 'Dedicated sourcing'],
      cta: 'Upgrade to Growth',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$149 / mo',
      color: '#cbd5e1',
      icon: 'diamond-stone',
      badge: 'BEST VALUE',
      features: ['Everything in Growth', 'Analytics dashboard', 'Dedicated sourcing agent', 'AI-powered matching'],
      locked: [],
      cta: 'Upgrade to Enterprise',
    },
  ];
}

function SectionLabel({ title }: { title: string }) {
  const T = useTheme();
  return <Text style={[sl.label, { color: T.textHint }]}>{title}</Text>;
}

const sl = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
});

function Sep() {
  const T = useTheme();
  return <View style={{ height: 1, backgroundColor: T.borderFaint, marginVertical: 28, marginHorizontal: 24 }} />;
}

function SettingsSheet({
  visible,
  onClose,
  team,
  onInvite,
  onRevoke,
  isCompanyAdmin,
}: {
  visible: boolean;
  onClose: () => void;
  team: TeamMember[];
  onInvite: (payload: { email: string; role: string }) => void;
  onRevoke: (memberId: number) => void;
  isCompanyAdmin: boolean;
}) {
  const T = useTheme();
  const [isLight, setIsLight] = useState(getThemeMode() === 'light');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<(typeof TEAM_ROLE_OPTIONS)[number]['value']>('hr');
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<TeamMember | null>(null);

  const handleToggle = (val: boolean) => {
    setIsLight(val);
    setThemeMode(val ? 'light' : 'dark');
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteRole('hr');
    setInviteError('');
    setInviteSent(false);
  };

  const openInviteModal = () => {
    resetInviteForm();
    setShowInviteModal(true);
  };

  const closeInviteModal = () => {
    resetInviteForm();
    setShowInviteModal(false);
  };

  const handleInvite = () => {
    if (inviteSent) {
      resetInviteForm();
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setInviteError('Enter a team member work email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInviteError('Enter a valid work email address.');
      return;
    }

    const domain = normalizedEmail.split('@')[1];
    if (domain !== 'accenture.com') {
      setInviteError('Email must match the company domain.');
      return;
    }

    if (team.some((member) => member.email.toLowerCase() === normalizedEmail)) {
      setInviteError('That team member already has access.');
      return;
    }

    onInvite({ email: normalizedEmail, role: inviteRole });
    setInviteError('');
    setInviteSent(true);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={ss.scrim} activeOpacity={1} onPress={onClose} />

      <View style={[ss.sheet, { backgroundColor: T.surface, borderColor: T.border }]}>
        <View style={[ss.handle, { backgroundColor: T.borderFaint }]} />

        <View style={ss.sheetHeader}>
          <Text style={[ss.sheetTitle, { color: T.textPrimary }]}>Settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
          </TouchableOpacity>
        </View>

        <Text style={[ss.groupLabel, { color: T.textHint }]}>Appearance</Text>

        <View style={[ss.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
          <View style={[ss.iconWrap, { backgroundColor: isLight ? '#f59e0b18' : T.primary + '18' }]}>
            <MaterialCommunityIcons
              name={isLight ? 'weather-sunny' : 'weather-night'}
              size={18}
              color={isLight ? '#f59e0b' : T.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ss.rowLabel, { color: T.textPrimary }]}>{isLight ? 'Light Mode' : 'Dark Mode'}</Text>
            <Text style={[ss.rowSub, { color: T.textHint }]}>
              {isLight ? 'Bright theme active' : 'Dark theme active'}
            </Text>
          </View>
          <Switch
            value={isLight}
            onValueChange={handleToggle}
            trackColor={{ false: T.primary + '55', true: '#f59e0b88' }}
            thumbColor={isLight ? '#f59e0b' : T.primary}
          />
        </View>

        <Text style={[ss.groupLabel, { color: T.textHint }]}>Account</Text>

        {[
          { icon: 'bell-outline' as const, label: 'Notifications', sub: 'Manage alerts' },
          { icon: 'shield-lock-outline' as const, label: 'Privacy', sub: 'Control your data' },
          { icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'FAQs and contact' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.7}
            style={[ss.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
          >
            <View style={[ss.iconWrap, { backgroundColor: T.primary + '18' }]}>
              <MaterialCommunityIcons name={item.icon} size={18} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ss.rowLabel, { color: T.textPrimary }]}>{item.label}</Text>
              <Text style={[ss.rowSub, { color: T.textHint }]}>{item.sub}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={T.textHint} />
          </TouchableOpacity>
        ))}

        {isCompanyAdmin && (
          <>
            <Text style={[ss.groupLabel, { color: T.textHint }]}>Team Management (Admin Only)</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[ss.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
              onPress={() => {
                onClose();
                router.push('/team-management');
              }}
            >
              <View style={[ss.iconWrap, { backgroundColor: T.primary + '18' }]}>
                <MaterialCommunityIcons name="account-group-outline" size={18} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ss.rowLabel, { color: T.textPrimary }]}>Team Management</Text>
                <Text style={[ss.rowSub, { color: T.textHint }]}>Open the admin invite and access form</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={T.textHint} />
            </TouchableOpacity>
          </>
        )}

        <View style={[ss.teamCard, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
          <View style={ss.teamCardHeader}>
            <View>
              <Text style={[ss.teamCardTitle, { color: T.textPrimary }]}>Current Access</Text>
              <Text style={[ss.teamCardSub, { color: T.textHint }]}>Revoke access for company members instantly</Text>
            </View>
            <View style={[ss.teamBadge, { backgroundColor: T.primary + '16', borderColor: T.primary + '2e' }]}>
              <Text style={[ss.teamBadgeText, { color: T.primary }]}>{team.length} members</Text>
            </View>
          </View>

          <View style={ss.teamList}>
            {team.map((member, index) => (
              <View
                key={member.id}
                style={[
                  ss.memberRow,
                  index < team.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.borderFaint },
                ]}
              >
                <Image source={{ uri: member.avatar }} style={[ss.memberAvatar, { borderColor: T.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[ss.memberName, { color: T.textPrimary }]}>{member.name}</Text>
                  <Text style={[ss.memberMeta, { color: T.textHint }]}>
                    {member.role} • {member.email}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[ss.revokeBtn, { backgroundColor: T.dangerBg, borderColor: T.danger + '20' }]}
                  onPress={() => setPendingRevoke(member)}
                >
                  <Text style={[ss.revokeBtnText, { color: T.danger }]}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={closeInviteModal}>
        <View style={sheetModal.overlay}>
          <TouchableOpacity style={sheetModal.backdrop} activeOpacity={1} onPress={closeInviteModal} />
          <View style={[sheetModal.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[sheetModal.title, { color: T.textPrimary }]}>Invite Team Member</Text>
            <Text style={[sheetModal.subtitle, { color: T.textSub }]}>
              Add HR managers or company admins using their work email.
            </Text>

            <Text style={[sheetModal.fieldLabel, { color: T.textHint }]}>Work Email</Text>
            <TextInput
              style={[sheetModal.input, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
              placeholder="hr@company.com"
              placeholderTextColor={T.textHint}
              autoCapitalize="none"
              keyboardType="email-address"
              value={inviteEmail}
              onChangeText={(text) => {
                setInviteEmail(text);
                if (inviteError) setInviteError('');
              }}
            />

            <Text style={[sheetModal.helper, { color: T.textHint }]}>Enter team member&apos;s work email</Text>

            <Text style={[sheetModal.fieldLabel, { color: T.textHint }]}>Role</Text>
            <View style={sheetModal.roleList}>
              {TEAM_ROLE_OPTIONS.map((role) => {
                const selected = inviteRole === role.value;
                return (
                  <TouchableOpacity
                    key={role.value}
                    activeOpacity={0.8}
                    style={[
                      sheetModal.roleCard,
                      {
                        backgroundColor: selected ? T.primary + '10' : T.surfaceHigh,
                        borderColor: selected ? T.primary : T.border,
                      },
                    ]}
                    onPress={() => setInviteRole(role.value)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[sheetModal.roleTitle, { color: selected ? T.primary : T.textPrimary }]}>
                        {role.label}
                      </Text>
                      <Text style={[sheetModal.roleHelper, { color: T.textHint }]}>{role.helper}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                      size={18}
                      color={selected ? T.primary : T.textHint}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {!!inviteError && <Text style={[sheetModal.error, { color: T.danger }]}>{inviteError}</Text>}

            {inviteSent && (
              <View style={[sheetModal.successBox, { backgroundColor: T.primary + '10', borderColor: T.primary + '26' }]}>
                <Text style={[sheetModal.successTitle, { color: T.primary }]}>Invite sent</Text>
                <Text style={[sheetModal.successText, { color: T.textSub }]}>
                  A confirmation link is ready for {inviteEmail.trim().toLowerCase()}.
                </Text>
              </View>
            )}

            <View style={sheetModal.actions}>
              <TouchableOpacity
                style={[sheetModal.secondaryBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={closeInviteModal}
              >
                <Text style={[sheetModal.secondaryBtnText, { color: T.textSub }]}>
                  {inviteSent ? 'Close' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[sheetModal.primaryBtn, { backgroundColor: T.primary }]} onPress={handleInvite}>
                <Text style={sheetModal.primaryBtnText}>{inviteSent ? 'Send Another' : 'Send Invite'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!pendingRevoke} transparent animationType="fade" onRequestClose={() => setPendingRevoke(null)}>
        <View style={sheetModal.overlay}>
          <TouchableOpacity style={sheetModal.backdrop} activeOpacity={1} onPress={() => setPendingRevoke(null)} />
          <View style={[sheetModal.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[sheetModal.title, { color: T.textPrimary }]}>Revoke Access</Text>
            <Text style={[sheetModal.subtitle, { color: T.textSub }]}>
              Are you sure you want to revoke access for {pendingRevoke?.name}? They will be logged out immediately and
              lose access to the company account.
            </Text>

            <View style={sheetModal.actions}>
              <TouchableOpacity
                style={[sheetModal.secondaryBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => setPendingRevoke(null)}
              >
                <Text style={[sheetModal.secondaryBtnText, { color: T.textSub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sheetModal.primaryBtn, { backgroundColor: T.danger }]}
                onPress={() => {
                  if (pendingRevoke) onRevoke(pendingRevoke.id);
                  setPendingRevoke(null);
                }}
              >
                <Text style={sheetModal.primaryBtnText}>Revoke Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const ss = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 1 },
  teamCard: {
    display: 'none',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  teamCardTitle: { fontSize: 14, fontWeight: '700' },
  teamCardSub: { fontSize: 11, marginTop: 2 },
  teamBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  teamBadgeText: { fontSize: 10, fontWeight: '700' },
  teamList: { gap: 2 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1 },
  memberName: { fontSize: 13, fontWeight: '700' },
  memberMeta: { fontSize: 11, marginTop: 2 },
  revokeBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  revokeBtnText: { fontSize: 11, fontWeight: '700' },
});

export default function CompanyProfileScreen() {
  const T = useTheme();
  const tabBarHeight = useTabBarHeight();
  const { top: topInset } = useSafeAreaInsets();
  const clearToken = useAuthStore((s) => s.clearToken);
  const authRole = useAuthStore((s) => s.role);
  const isCompanyAdmin = authRole === 'company_admin';

  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logoPhoto, setLogoPhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<(string | null)[]>(Array.from({ length: 6 }, () => null));
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [companyAbout, setCompanyAbout] = useState('');
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [companyWebsite, setCompanyWebsite] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [activePlan, setActivePlan] = useState(0);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [showAddPerk, setShowAddPerk] = useState(false);
  const [perks, setPerks] = useState<string[]>([]);
  const [newPerk, setNewPerk] = useState('');
  const planRef = useRef<FlatList<Plan>>(null);

  const plans = buildPlans(T.primary, T.gold);
  const PLAN_W = SCREEN_W - 48;

  const isRemoteUrl = (value: string | null | undefined): boolean =>
    typeof value === 'string' && /^https?:\/\//i.test(value);

  const stripPresignedParams = (url: string): string => {
    if (!isRemoteUrl(url)) return url;
    try {
      const urlObj = new URL(url);
      // Remove presigned query parameters (X-Amz-*)
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  const getFileExtension = (value: string): string => {
    const cleanValue = value.split('?')[0];
    const fileName = cleanValue.split('/').pop() ?? cleanValue;
    const parts = fileName.split('.');
    return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
  };

  const inferImageMimeType = (uri: string): string => {
    const extension = getFileExtension(uri);
    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'heic') return 'image/heic';
    if (extension === 'heif') return 'image/heif';
    return 'image/jpeg';
  };

  const uploadImageFromUri = async (uri: string): Promise<string> => {
    if (isRemoteUrl(uri)) return uri;

    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();
    const fileSize = blob.size;
    if (!fileSize || fileSize < 1) {
      throw new Error('Selected image appears empty.');
    }

    const extension = getFileExtension(uri) || 'jpg';
    const fileType = inferImageMimeType(uri);
    const fileName = `company-media-${Date.now()}.${extension}`;

    const uploadMeta = await api.post('/files/upload-url', {
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      upload_type: 'image',
    }) as { upload_url: string; public_url: string };

    const uploadResponse = await fetch(uploadMeta.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': fileType },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Unable to upload image to storage.');
    }

    await api.post('/files/confirm-upload', { file_url: uploadMeta.public_url });
    return uploadMeta.public_url;
  };

  const handleSaveProfile = async () => {
    if (!isCompanyAdmin || isSavingProfile) return;

    try {
      setIsSavingProfile(true);

      let nextLogoUrl = logoPhoto;
      let nextCoverPhotoUrl = coverPhoto;
      if (logoPhoto && !isRemoteUrl(logoPhoto)) {
        nextLogoUrl = await uploadImageFromUri(logoPhoto);
      } else if (logoPhoto) {
        // Strip presigned parameters from existing R2 URLs
        nextLogoUrl = stripPresignedParams(logoPhoto);
      }
      
      if (coverPhoto && !isRemoteUrl(coverPhoto)) {
        nextCoverPhotoUrl = await uploadImageFromUri(coverPhoto);
      } else if (coverPhoto) {
        // Strip presigned parameters from existing R2 URLs
        nextCoverPhotoUrl = stripPresignedParams(coverPhoto);
      }

      const uploadedOfficeImages = await Promise.all(
        galleryPhotos
          .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
          .map((uri) => {
            if (isRemoteUrl(uri)) {
              // Strip presigned parameters from existing R2 URLs
              return Promise.resolve(stripPresignedParams(uri));
            }
            return uploadImageFromUri(uri);
          })
      );

      // Only send fields that are actually editable on this screen
      const detailsPayload: Record<string, unknown> = {
        benefits: perks,
        office_images: uploadedOfficeImages.slice(0, 6),
      };

      // Only include cover_photo if it exists
      if (nextCoverPhotoUrl) {
        detailsPayload.cover_photo = nextCoverPhotoUrl;
      }

      await api.patch('/profile/company/details', detailsPayload);

      // Update logo separately if changed
      if (nextLogoUrl) {
        await api.patch('/profile/company/logo', { logo_url: nextLogoUrl });
      }

      // Refetch profile to get fresh presigned URLs so images stay visible
      try {
        const refreshedData: any = await api.get('/profile/company');
        
        
        const payload = refreshedData?.profile ?? refreshedData?.data?.profile ?? refreshedData?.data ?? refreshedData;
        const profile = payload?.profile ?? payload;
        
        if (profile) {
          const resolvedLogoUrl = profile.logo_url ?? profile.logoUrl ?? null;
          const resolvedCoverPhoto = profile.cover_photo ?? profile.coverPhoto ?? null;
          if (resolvedLogoUrl) setLogoPhoto(resolvedLogoUrl);
          if (resolvedCoverPhoto) setCoverPhoto(resolvedCoverPhoto);

          const sourceOfficeImages = Array.isArray(profile.office_images)
            ? profile.office_images
            : Array.isArray(profile.officeImages)
              ? profile.officeImages
              : [];
          const officeImages = sourceOfficeImages.filter(Boolean).slice(0, 6);
          const normalized = Array.from({ length: 6 }, (_, idx) => officeImages[idx] ?? null);
          setGalleryPhotos(normalized);
          
          
        }
      } catch (refetchError) {
        console.error('[Profile] Failed to refetch after save:', refetchError);
        // Fallback: set clean URLs (images will reappear on next app reload)
        if (nextLogoUrl) setLogoPhoto(nextLogoUrl);
        if (nextCoverPhotoUrl) setCoverPhoto(nextCoverPhotoUrl);
        const normalized = Array.from({ length: 6 }, (_, idx) => uploadedOfficeImages[idx] ?? null);
        setGalleryPhotos(normalized);
      }
      
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save company profile media:', error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const pickLogo = async () => {
    if (!isCompanyAdmin) return;
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!r.canceled) setLogoPhoto(r.assets[0].uri);
  };

  const pickCover = async () => {
    if (!isCompanyAdmin) return;
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.85 });
    if (!r.canceled) setCoverPhoto(r.assets[0].uri);
  };

  const pickGallery = async (i: number) => {
    if (!isCompanyAdmin) return;
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.85 });
    if (!r.canceled) {
      const p = [...galleryPhotos];
      p[i] = r.assets[0].uri;
      setGalleryPhotos(p);
    }
  };

  const addPerk = () => {
    if (!isCompanyAdmin) return;
    if (!newPerk.trim()) return;
    setPerks((prev) => [...prev, newPerk.trim()]);
    setNewPerk('');
    setShowAddPerk(false);
  };

  const onPlanScroll = (e: any) => {
    setActivePlan(Math.round(e.nativeEvent.contentOffset.x / (PLAN_W + 12)));
  };

  const handleSignOut = async () => {
    await clearToken();
    router.replace('/(auth)/login');
  };

  // Fetch profile data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setIsProfileLoading(true);
      api.get('/profile/company')
        .then((data: any) => {
          

          const payload = data?.profile ?? data?.data?.profile ?? data?.data ?? data;
          const profile = payload?.profile ?? payload;
          if (!profile) return;

          const resolvedCompanyName = profile.company_name ?? profile.name ?? profile.companyName ?? null;
          setCompanyName(resolvedCompanyName ?? '');

          const resolvedIndustry = profile.industry ?? profile.industry_name ?? null;
          setCompanyIndustry(resolvedIndustry ?? '');

          const resolvedDescription = profile.description ?? profile.about ?? null;
          setCompanyAbout(resolvedDescription ?? '');

          if (profile.company_size) setCompanySize(profile.company_size);
          if (profile.website_url) setCompanyWebsite(profile.website_url);

          const address = profile.address ?? {};
          const locationParts = [
            address.street,
            address.city,
            address.state ?? address.province,
            address.country,
          ].filter(Boolean);
          setCompanyLocation(locationParts.length > 0 ? locationParts.join(', ') : '');

          const resolvedLogoUrl = profile.logo_url ?? profile.logoUrl ?? null;
          const resolvedCoverPhoto = profile.cover_photo ?? profile.coverPhoto ?? null;
          if (resolvedLogoUrl) setLogoPhoto(resolvedLogoUrl);
          if (resolvedCoverPhoto) setCoverPhoto(resolvedCoverPhoto);

          const sourceOfficeImages = Array.isArray(profile.office_images)
            ? profile.office_images
            : Array.isArray(profile.officeImages)
              ? profile.officeImages
              : [];
          const officeImages = sourceOfficeImages.filter(Boolean).slice(0, 6);
          if (officeImages.length > 0) {
            const normalized = Array.from({ length: 6 }, (_, idx) => officeImages[idx] ?? null);
            setGalleryPhotos(normalized);
          }

          const benefits = Array.isArray(profile.benefits) ? profile.benefits : [];
          if (benefits.length > 0) setPerks(benefits);

          const verified = data?.is_verified ?? payload?.is_verified ?? false;
          setIsVerified(Boolean(verified));
        })
        .catch((err) => { console.error('[Profile] Fetch error:', err); })
        .finally(() => { setIsProfileLoading(false); });
    }, [])
  );

  const renderPlan = ({ item }: { item: Plan }) => {
    const isCurrent = item.id === 'free';
    const borderColor =
      item.id === 'growth' ? 'rgba(245,158,11,0.35)' : item.id === 'enterprise' ? 'rgba(203,213,225,0.3)' : T.border;
    const backgroundColor =
      item.id === 'growth' ? 'rgba(245,158,11,0.05)' : item.id === 'enterprise' ? 'rgba(148,163,184,0.05)' : T.primary + '0D';

    return (
      <View style={[ps.card, { width: PLAN_W, borderColor, backgroundColor }]}>
        <View style={ps.top}>
          <View style={[ps.iconWrap, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ps.name, { color: item.color }]}>{item.name}</Text>
            <Text style={[ps.price, { color: T.textSub }]}>{item.price ?? 'Free forever'}</Text>
          </View>
          {item.badge && (
            <View style={[ps.badge, { backgroundColor: item.color + '18', borderColor: item.color + '40' }]}>
              <Text style={[ps.badgeText, { color: item.color }]}>{item.badge}</Text>
            </View>
          )}
        </View>

        <View style={[ps.sep, { backgroundColor: T.borderFaint }]} />

        <View style={{ gap: 8 }}>
          {item.features.map((f, i) => (
            <View key={`inc-${i}`} style={ps.row}>
              <MaterialCommunityIcons name="check-circle" size={13} color={item.color} />
              <Text style={[ps.rowText, { color: T.textSub }]}>{f}</Text>
            </View>
          ))}
          {item.locked.map((f, i) => (
            <View key={`lock-${i}`} style={ps.row}>
              <MaterialCommunityIcons name="lock-outline" size={13} color={T.textHint} />
              <Text style={[ps.rowText, { color: T.textHint }]}>{f}</Text>
            </View>
          ))}
        </View>

        {item.cta && !isCurrent ? (
          <TouchableOpacity
            style={[ps.cta, { backgroundColor: item.color }]}
            activeOpacity={0.85}
            onPress={() => router.push('/subscription')}
          >
            <Text style={[ps.ctaText, { color: item.id === 'enterprise' ? '#0f172a' : '#fff' }]}>{item.cta}</Text>
          </TouchableOpacity>
        ) : isCurrent ? (
          <View style={ps.activePill}>
            <MaterialCommunityIcons name="check-circle" size={12} color={T.primary} />
            <Text style={[ps.activePillText, { color: T.primary }]}>Current plan</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[s.screen, { backgroundColor: T.bg, paddingTop: topInset }]}>
      <StatusBar
        barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'}
        translucent
        backgroundColor="transparent"
      />

      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        team={team}
        isCompanyAdmin={isCompanyAdmin}
        onInvite={({ email, role }) => {
          if (!isCompanyAdmin) return;
          const selectedRole = TEAM_ROLE_OPTIONS.find((option) => option.value === role);
          const inviteName = formatInviteName(email);

          setTeam((prev) => {
            const nextId = prev.length ? Math.max(...prev.map((member) => member.id)) + 1 : 1;

            return [
              ...prev,
              {
                id: nextId,
                name: inviteName,
                role: selectedRole?.label ?? 'HR Manager',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteName)}&background=E2E8F0&color=0F172A`,
                email,
              },
            ];
          });
        }}
        onRevoke={(memberId) => {
          if (!isCompanyAdmin) return;
          setTeam((prev) => prev.filter((member) => member.id !== memberId));
        }}
      />

      {showSignOutModal && (
        <View style={modal.overlay}>
          <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={() => setShowSignOutModal(false)} />
          <View style={[modal.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={[modal.iconWrap, { backgroundColor: T.dangerBg }]}>
              <MaterialCommunityIcons name="logout" size={28} color={T.danger} />
            </View>
            <Text style={[modal.title, { color: T.textPrimary }]}>Sign Out</Text>
            <Text style={[modal.message, { color: T.textSub }]}>Are you sure you want to sign out?</Text>
            <View style={modal.btnRow}>
              <TouchableOpacity
                style={[modal.cancelBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[modal.cancelText, { color: T.textSub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modal.confirmBtn, { backgroundColor: T.danger }]}
                onPress={async () => {
                  setShowSignOutModal(false);
                  await handleSignOut();
                }}
              >
                <Text style={modal.confirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}>
        <View style={[s.coverWrap, { height: 190 + topInset, backgroundColor: T.surfaceHigh }]}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, s.coverFallback, { borderBottomColor: T.borderFaint }]}>
              <MaterialCommunityIcons name="image-outline" size={32} color={T.textHint} />
            </View>
          )}

          <TouchableOpacity
            style={[s.settingsBtn, { backgroundColor: 'rgba(0,0,0,0.42)', borderColor: 'rgba(255,255,255,0.18)' }]}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="cog-outline" size={17} color="#fff" />
          </TouchableOpacity>

          {editMode && isCompanyAdmin && (
            <TouchableOpacity style={s.coverEditBtn} onPress={pickCover} activeOpacity={0.8}>
              <MaterialCommunityIcons name="camera-outline" size={13} color="#fff" />
              <Text style={s.coverEditText}>Edit cover</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.heroRow}>
          <TouchableOpacity onPress={editMode && isCompanyAdmin ? pickLogo : undefined} activeOpacity={0.85} style={s.logoWrap}>
            {logoPhoto ? (
              <Image source={{ uri: logoPhoto }} style={[s.logoImg, { borderColor: T.bg }]} />
            ) : (
              <View style={[s.logoFallback, { backgroundColor: T.surfaceHigh, borderColor: T.bg }]}>
                <Text style={[s.logoInitials, { color: T.textPrimary }]}>AC</Text>
              </View>
            )}
            {editMode && isCompanyAdmin && (
              <View style={[s.camBadge, { backgroundColor: T.primary, borderColor: T.bg }]}>
                <MaterialCommunityIcons name="camera" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.editBtn,
              { borderColor: T.border, backgroundColor: T.surfaceHigh },
              editMode && s.editBtnSaving,
            ]}
            onPress={() => {
              if (!isCompanyAdmin) return;
              if (editMode) {
                handleSaveProfile();
                return;
              }
              setEditMode(true);
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={editMode ? 'check' : (isCompanyAdmin ? 'pencil-outline' : 'eye-outline')}
              size={13}
              color={editMode ? '#4ade80' : T.primary}
            />
            <Text style={[s.editBtnText, { color: T.primary }, editMode && { color: '#4ade80' }]}>
              {editMode ? (isSavingProfile ? 'Saving...' : 'Save') : (isCompanyAdmin ? 'Edit' : 'View')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.heroInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            {isProfileLoading ? (
              <View style={{ width: 140, height: 18, borderRadius: 6, backgroundColor: T.borderFaint }} />
            ) : (
              <Text style={[s.companyName, { color: T.textPrimary }]}>
                {companyName || 'Your Company'}
              </Text>
            )}
            {isVerified && (
              <MaterialCommunityIcons name="check-decagram" size={15} color={T.primary} />
            )}
          </View>
          {isProfileLoading ? (
            <View style={{ width: 90, height: 13, borderRadius: 4, backgroundColor: T.borderFaint, marginBottom: 4 }} />
          ) : (
            <Text style={[s.industry, { color: T.textSub }]}>
              {companyIndustry || 'Industry not set'}
            </Text>
          )}
          <View style={s.locRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={11} color={T.textHint} />
            {isProfileLoading ? (
              <View style={{ width: 120, height: 11, borderRadius: 4, backgroundColor: T.borderFaint }} />
            ) : (
              <Text style={[s.loc, { color: T.textHint }]}>
                {companyLocation || 'Location not set'}
              </Text>
            )}
          </View>
        </View>

        <View style={[s.statsCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          {[
            { label: 'Active Jobs', value: '3' },
            { label: 'Applicants', value: '53' },
            { label: 'Matches', value: '12' },
          ].map((st, i) => (
            <React.Fragment key={st.label}>
              {i > 0 && <View style={[s.statSep, { backgroundColor: T.border }]} />}
              <View style={s.stat}>
                <Text style={[s.statVal, { color: T.textPrimary }]}>{st.value}</Text>
                <Text style={[s.statLbl, { color: T.textHint }]}>{st.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Sep />

        <View style={s.section}>
          <SectionLabel title="About Us" />
          <Text style={[s.aboutText, { color: T.textSub }]}>
            {companyAbout}
          </Text>
        </View>

        <Sep />

        <View style={s.section}>
          <SectionLabel title="Office Photos" />
          <View style={s.photoGrid}>
            {galleryPhotos.map((uri, i) => (
              <TouchableOpacity
                key={i}
                style={[s.photoSlot, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => {
                  if (!editMode || !isCompanyAdmin) return;
                  pickGallery(i);
                }}
                activeOpacity={0.8}
              >
                {uri ? (
                  <Image source={{ uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="plus" size={22} color={T.textHint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Sep />

        <View style={s.section}>

          <View style={s.skillSegment}>
            <View style={[s.skillSegmentHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="gift-outline" size={13} color="#4ade80" />
                <Text style={[s.skillSegmentLabel, { color: '#4ade80' }]}>Perks & Benefits</Text>
              </View>
              {editMode && isCompanyAdmin && (
                <TouchableOpacity
                  style={[s.addBtn, { borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.07)' }]}
                  onPress={() => setShowAddPerk((v) => !v)}
                >
                  <MaterialCommunityIcons name={showAddPerk ? 'minus' : 'plus'} size={12} color="#4ade80" />
                  <Text style={[s.addBtnText, { color: '#4ade80' }]}>{showAddPerk ? 'Cancel' : 'Add'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.chips}>
              {perks.map((p, i) => (
                <View
                  key={i}
                  style={[s.chip, { borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.07)' }]}
                >
                  <Text style={[s.chipText, { color: '#4ade80' }]}>{p}</Text>
                  {editMode && isCompanyAdmin && (
                    <TouchableOpacity
                      onPress={() => setPerks((prev) => prev.filter((_, idx) => idx !== i))}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={{ marginLeft: 4 }}
                    >
                      <MaterialCommunityIcons name="close" size={10} color="#4ade80" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {editMode && isCompanyAdmin && showAddPerk && (
              <View style={[s.addForm, { marginTop: 12, backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
                <TextInput
                  style={[s.addInput, { backgroundColor: T.surface, borderColor: T.border, color: T.textPrimary }]}
                  placeholder="e.g. Remote Work, Free Meals, Gym..."
                  placeholderTextColor={T.textHint}
                  value={newPerk}
                  onChangeText={setNewPerk}
                />
                <TouchableOpacity style={[s.addConfirmBtn, { backgroundColor: T.primary }]} onPress={addPerk}>
                  <Text style={s.addConfirmText}>Add Perk</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <Sep />

        <View style={s.section}>
          <SectionLabel title="Hiring Team" />
          <View style={{ gap: 16 }}>
            {team.map((member) => (
              <View key={member.id} style={s.expRow}>
                <Image source={{ uri: member.avatar }} style={[s.teamAvatar, { borderColor: T.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.expRole, { color: T.textPrimary }]}>{member.name}</Text>
                  <Text style={[s.expMeta, { color: T.textHint }]}>{member.role}</Text>
                </View>
                {editMode && (
                  <TouchableOpacity
                    onPress={() => setTeam((prev) => prev.filter((m) => m.id !== member.id))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={18} color={T.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        <Sep />

        <View style={[s.section, { marginBottom: 16 }]}>
          <SectionLabel title="Subscription" />
        </View>

        <FlatList
          ref={planRef}
          data={plans}
          renderItem={renderPlan}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={PLAN_W + 12}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={onPlanScroll}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          getItemLayout={(_, i) => ({ length: PLAN_W + 12, offset: (PLAN_W + 12) * i, index: i })}
        />

        <View style={s.dotsRow}>
          {plans.map((plan, i) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => {
                planRef.current?.scrollToIndex({ index: i, animated: true });
                setActivePlan(i);
              }}
            >
              <View
                style={[
                  s.dot,
                  {
                    backgroundColor: activePlan === i ? plan.color : T.border,
                    width: activePlan === i ? 20 : 6,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.signOut, { backgroundColor: T.dangerBg, borderColor: T.danger + '26' }]}
          activeOpacity={0.8}
          onPress={() => setShowSignOutModal(true)}
        >
          <MaterialCommunityIcons name="logout" size={14} color={T.danger} />
          <Text style={[s.signOutText, { color: T.danger }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const ps = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  price: { fontSize: 12, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  sep: { height: 1, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 12, flex: 1 },
  cta: { marginTop: 16, borderRadius: 22, paddingVertical: 13, alignItems: 'center' },
  ctaText: { fontSize: 13, fontWeight: '800' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, justifyContent: 'center' },
  activePillText: { fontSize: 11, fontWeight: '600' },
});

const s = StyleSheet.create({
  screen: { flex: 1 },

  coverWrap: { width: '100%', overflow: 'hidden' },
  coverFallback: { alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1 },
  coverEditBtn: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  coverEditText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  settingsBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -38,
    marginBottom: 10,
  },
  heroInfo: { paddingHorizontal: 24, paddingBottom: 16 },

  logoWrap: { position: 'relative' },
  logoImg: { width: 84, height: 84, borderRadius: 22, borderWidth: 3 },
  logoFallback: { width: 84, height: 84, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  logoInitials: { fontSize: 26, fontWeight: '800' },
  camBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  companyName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  industry: { fontSize: 13, marginBottom: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  loc: { fontSize: 11 },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 6,
  },
  editBtnSaving: { borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.07)' },
  editBtnText: { fontSize: 11, fontWeight: '700' },

  statsCard: { flexDirection: 'row', marginHorizontal: 24, borderRadius: 16, borderWidth: 1, paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLbl: { fontSize: 10, marginTop: 3, fontWeight: '500' },
  statSep: { width: 1 },

  section: { paddingHorizontal: 24 },
  aboutText: { fontSize: 14, lineHeight: 22 },

  photoGrid: { flexDirection: 'row', gap: 8 },
  photoSlot: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 11, fontWeight: '700' },
  skillSegment: { gap: 10 },
  skillSegmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  skillSegmentLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  skillDivider: { height: 1, marginVertical: 14 },

  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expRole: { fontSize: 13, fontWeight: '700' },
  expMeta: { fontSize: 11, marginTop: 2 },
  teamAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 8 },
  dot: { height: 6, borderRadius: 3 },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 24,
    marginTop: 28,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
  },
  signOutText: { fontSize: 13, fontWeight: '700' },

  addForm: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  addInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  addConfirmBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  addConfirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

const sheetModal = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  helper: { fontSize: 11, marginTop: -4 },
  roleList: { gap: 8 },
  roleCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleTitle: { fontSize: 14, fontWeight: '700' },
  roleHelper: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  error: { fontSize: 12, fontWeight: '600' },
  successBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  successTitle: { fontSize: 13, fontWeight: '800' },
  successText: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const modal = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  card: {
    width: SCREEN_W - 48,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    position: 'absolute',
    top: '30%',
  },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10, letterSpacing: -0.5 },
  message: { fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  btnRow: { flexDirection: 'row', gap: 14, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
