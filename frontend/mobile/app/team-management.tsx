import React, { useState, useEffect, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme';
import { api } from '../services/api';

// TODO: Add tests for team management screen
// Test cases should cover:
// - Loading members and invites
// - Sending single invite
// - Sending bulk invites
// - Resending invite
// - Revoking member access
// - Canceling pending invite
// - Copy invite code
// - Error handling

type TeamMember = {
  id: number;
  name: string;
  role: string;
  avatar: string;
  email: string;
  inviteCode: string;
  status?: 'pending' | 'active';
};

type Invite = {
  id: number;
  email: string;
  role: string;
  status: 'pending';
  inviteCode: string;
  created_at: string;
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

function buildInviteCode(email: string, role: (typeof TEAM_ROLE_OPTIONS)[number]['value']) {
  const slug = email
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, 'X');
  const roleCode = role === 'company_admin' ? 'ADM' : 'HR';
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  return `JS-${roleCode}-${slug}-${randomCode}`;
}

export default function TeamManagementScreen() {
  const T = useTheme();
  const { top } = useSafeAreaInsets();
  
  // API state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  
  // Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<(typeof TEAM_ROLE_OPTIONS)[number]['value']>('hr');
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [pendingRevoke, setPendingRevoke] = useState<TeamMember | null>(null);
  
  // Bulk invite state
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRole, setBulkRole] = useState<(typeof TEAM_ROLE_OPTIONS)[number]['value']>('hr');

  // Fetch team data on mount
  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      // Fetch both members and pending invites
      const [membersResponse, invitesResponse]: [any, any] = await Promise.all([
        api.get('/company/members'),
        api.get('/company/invites'),
      ]);

      // Transform members
      const members: TeamMember[] = (membersResponse?.members || []).map((member: any) => ({
        id: member.user_id || member.id,
        name: member.name || 'Unknown',
        role: member.role === 'company_admin' ? 'Company Admin' : 'HR Manager',
        avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=E2E8F0&color=0F172A`,
        email: member.email || '',
        inviteCode: member.invite_code || '',
        status: 'active' as const,
      }));

      // Transform pending invites
      const pendingInvites: TeamMember[] = (invitesResponse?.invites || []).map((invite: any) => ({
        id: invite.id,
        name: formatInviteName(invite.email),
        role: invite.role === 'company_admin' ? 'Company Admin' : 'HR Manager',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formatInviteName(invite.email))}&background=FEF3C7&color=92400E`,
        email: invite.email,
        inviteCode: invite.invite_code || invite.token || '',
        status: 'pending' as const,
      }));

      setTeam([...members, ...pendingInvites]);
    } catch (err: any) {
      console.error('Failed to fetch team data:', err);
      Alert.alert('Error', 'Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeamData(false);
  }, [fetchTeamData]);

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((current) => (current === code ? '' : current));
    }, 1800);
  };

  const handleInvite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setInviteError('Enter a team member work email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setInviteError('Enter a valid work email address.');
      return;
    }

    if (team.some((member) => member.email.toLowerCase() === normalizedEmail)) {
      setInviteError('That team member already has access.');
      return;
    }

    setSubmitting(true);
    try {
      // Call API to send invite
      const response: any = await api.post('/company/invites', {
        email: normalizedEmail,
        role: inviteRole,
      });

      const inviteCode = response?.invite_code || response?.token || buildInviteCode(normalizedEmail, inviteRole);
      const inviteName = formatInviteName(normalizedEmail);
      const selectedRole = TEAM_ROLE_OPTIONS.find((option) => option.value === inviteRole);

      // Add to local state
      setTeam((prev) => [
        ...prev,
        {
          id: response?.id || Date.now(),
          name: inviteName,
          role: selectedRole?.label ?? 'HR Manager',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteName)}&background=FEF3C7&color=92400E`,
          email: normalizedEmail,
          inviteCode,
          status: 'pending',
        },
      ]);

      setInviteError('');
      setInviteSent(true);
      setLastInviteCode(inviteCode);
      setInviteEmail('');
      setInviteRole('hr');
    } catch (err: any) {
      console.error('Invite error:', err);
      
      // Handle validation errors
      if (err?.errors) {
        const firstError = Object.values(err.errors)[0];
        setInviteError(Array.isArray(firstError) ? firstError[0] : 'Failed to send invite.');
      } else {
        setInviteError(err?.message || 'Failed to send invite. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails
      .split('\n')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      Alert.alert('Error', 'Please enter at least one email address.');
      return;
    }

    // Validate all emails
    const invalidEmails = emails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmails.length > 0) {
      Alert.alert('Invalid Emails', `The following emails are invalid:\n${invalidEmails.join('\n')}`);
      return;
    }

    setSubmitting(true);
    try {
      const response: any = await api.post('/company/invites/bulk', {
        emails,
        role: bulkRole,
      });

      // Refresh team data to get the new invites
      await fetchTeamData(false);

      setShowBulkInvite(false);
      setBulkEmails('');
      setBulkRole('hr');
      
      const successCount = response?.success_count || emails.length;
      Alert.alert('Success', `Successfully sent ${successCount} invite(s).`);
    } catch (err: any) {
      console.error('Bulk invite error:', err);
      Alert.alert('Error', err?.message || 'Failed to send bulk invites. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (inviteId: number) => {
    setResendingId(inviteId);
    try {
      await api.post(`/company/invites/${inviteId}/resend`);
      Alert.alert('Success', 'Invite has been resent successfully.');
    } catch (err: any) {
      console.error('Resend invite error:', err);
      Alert.alert('Error', err?.message || 'Failed to resend invite. Please try again.');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: T.bg, paddingTop: top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={T.bg === '#f5f3ff' ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />

      <View style={[s.header, { borderBottomColor: T.borderFaint }]}>
        <TouchableOpacity style={[s.headerBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={T.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: T.textPrimary }]}>Team Management</Text>
          <Text style={[s.subtitle, { color: T.textHint }]}>Admin-only access and invite controls</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
        }
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text style={[s.helper, { color: T.textHint, marginTop: 16 }]}>Loading team data...</Text>
          </View>
        ) : (
          <>
            <View style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[s.sectionLabel, { color: T.textHint }]}>Invite Team Member</Text>

          <Text style={[s.fieldLabel, { color: T.textHint }]}>Work Email</Text>
          <TextInput
            style={[s.input, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
            placeholder="hr@company.com"
            placeholderTextColor={T.textHint}
            autoCapitalize="none"
            keyboardType="email-address"
            value={inviteEmail}
            onChangeText={(text) => {
              setInviteEmail(text);
              if (inviteError) setInviteError('');
              if (inviteSent) {
                setInviteSent(false);
                setLastInviteCode('');
              }
            }}
          />
          <Text style={[s.helper, { color: T.textHint }]}>Enter team member's work email</Text>

          <Text style={[s.fieldLabel, { color: T.textHint }]}>Role</Text>
          <View style={s.roleList}>
            {TEAM_ROLE_OPTIONS.map((role) => {
              const selected = inviteRole === role.value;
              return (
                <TouchableOpacity
                  key={role.value}
                  activeOpacity={0.8}
                  style={[
                    s.roleCard,
                    {
                      backgroundColor: selected ? T.primary + '10' : T.surfaceHigh,
                      borderColor: selected ? T.primary : T.border,
                    },
                  ]}
                  onPress={() => {
                    setInviteRole(role.value);
                    if (inviteSent) {
                      setInviteSent(false);
                      setLastInviteCode('');
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.roleTitle, { color: selected ? T.primary : T.textPrimary }]}>{role.label}</Text>
                    <Text style={[s.roleHelper, { color: T.textHint }]}>{role.helper}</Text>
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

          {!!inviteError && <Text style={[s.error, { color: T.danger }]}>{inviteError}</Text>}

          {inviteSent && (
            <View style={[s.successBox, { backgroundColor: T.primary + '10', borderColor: T.primary + '26' }]}>
              <Text style={[s.successTitle, { color: T.primary }]}>Invite sent</Text>
              <Text style={[s.successText, { color: T.textSub }]}>The invite link has been prepared for the selected team member.</Text>
              <Text style={[s.codeLabel, { color: T.textHint }]}>Invite Code</Text>
              <TextInput
                style={[s.codeInput, { backgroundColor: T.surface, borderColor: T.primary + '30', color: T.textPrimary }]}
                value={lastInviteCode}
                editable={false}
                selectTextOnFocus
              />
              <View style={s.codeActionRow}>
                <Text style={[s.codeHelper, { color: T.textHint }]}>
                  {copiedCode === lastInviteCode ? 'Invite code copied.' : 'Copy this code to share it manually.'}
                </Text>
                <TouchableOpacity
                  style={[s.copyBtn, { backgroundColor: T.primary, borderColor: T.primary }]}
                  onPress={() => copyCode(lastInviteCode)}
                >
                  <MaterialCommunityIcons name={copiedCode === lastInviteCode ? 'check' : 'content-copy'} size={14} color="#fff" />
                  <Text style={s.copyBtnText}>{copiedCode === lastInviteCode ? 'Copied' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[s.primaryBtn, { backgroundColor: T.primary }, submitting && { opacity: 0.6 }]} 
            onPress={handleInvite}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>Send Invite</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.secondaryBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border, marginTop: 12 }]} 
            onPress={() => setShowBulkInvite(true)}
          >
            <MaterialCommunityIcons name="email-multiple" size={16} color={T.textSub} />
            <Text style={[s.secondaryBtnText, { color: T.textSub }]}>Bulk Invite</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={s.accessHeader}>
            <View>
              <Text style={[s.sectionLabel, { color: T.textHint }]}>Current Access</Text>
              <Text style={[s.accessSub, { color: T.textSub }]}>Revoke access for company members instantly</Text>
            </View>
            <View style={[s.badge, { backgroundColor: T.primary + '12', borderColor: T.primary + '28' }]}>
              <Text style={[s.badgeText, { color: T.primary }]}>{team.length} members</Text>
            </View>
          </View>

          <View style={s.teamList}>
            {team.map((member, index) => (
              <View
                key={member.id}
                style={[
                  s.memberRow,
                  index < team.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.borderFaint },
                ]}
              >
                <Image source={{ uri: member.avatar }} style={[s.avatar, { borderColor: T.border }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.memberName, { color: T.textPrimary }]}>{member.name}</Text>
                    {member.status === 'pending' && (
                      <View style={[s.pendingBadge, { backgroundColor: T.warning + '15', borderColor: T.warning + '30' }]}>
                        <Text style={[s.pendingBadgeText, { color: T.warning }]}>Pending</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.memberMeta, { color: T.textHint }]}>{member.role + ' | ' + member.email}</Text>
                  <Text style={[s.memberCodeLabel, { color: T.textHint }]}>Invite Code</Text>
                  <TextInput
                    style={[s.memberCodeInput, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
                    value={member.inviteCode}
                    editable={false}
                    selectTextOnFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[s.memberCopyBtn, { backgroundColor: T.surface, borderColor: copiedCode === member.inviteCode ? T.primary : T.border }]}
                      onPress={() => copyCode(member.inviteCode)}
                    >
                      <MaterialCommunityIcons
                        name={copiedCode === member.inviteCode ? 'check-circle' : 'content-copy'}
                        size={13}
                        color={copiedCode === member.inviteCode ? T.primary : T.textSub}
                      />
                      <Text style={[s.memberCopyText, { color: copiedCode === member.inviteCode ? T.primary : T.textSub }]}>
                        {copiedCode === member.inviteCode ? 'Copied' : 'Copy Code'}
                      </Text>
                    </TouchableOpacity>
                    
                    {member.status === 'pending' && (
                      <TouchableOpacity
                        style={[
                          s.memberCopyBtn, 
                          { 
                            backgroundColor: T.surface, 
                            borderColor: T.border,
                            opacity: resendingId === member.id ? 0.6 : 1
                          }
                        ]}
                        onPress={() => handleResendInvite(member.id)}
                        disabled={resendingId === member.id}
                      >
                        {resendingId === member.id ? (
                          <ActivityIndicator size="small" color={T.textSub} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="email-sync" size={13} color={T.textSub} />
                            <Text style={[s.memberCopyText, { color: T.textSub }]}>Resend</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[s.revokeBtn, { backgroundColor: T.dangerBg, borderColor: T.danger + '20' }]}
                  onPress={() => setPendingRevoke(member)}
                >
                  <Text style={[s.revokeBtnText, { color: T.danger }]}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
          </>
        )}
      </ScrollView>

      <Modal visible={!!pendingRevoke} transparent animationType="fade" onRequestClose={() => setPendingRevoke(null)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setPendingRevoke(null)} />
          <View style={[s.modalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[s.modalTitle, { color: T.textPrimary }]}>Revoke Access</Text>
            <Text style={[s.modalText, { color: T.textSub }]}>
              Are you sure you want to revoke access for {pendingRevoke?.name}? They will be logged out immediately and lose
              access to the company account.
            </Text>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.secondaryBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => setPendingRevoke(null)}
              >
                <Text style={[s.secondaryBtnText, { color: T.textSub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: T.danger }]}
                onPress={async () => {
                  if (!pendingRevoke) return;
                  
                  try {
                    // Determine if it's a pending invite or active member
                    if (pendingRevoke.status === 'pending') {
                      // Cancel invite
                      await api.delete(`/company/invites/${pendingRevoke.id}`);
                    } else {
                      // Revoke member access
                      await api.delete(`/company/members/${pendingRevoke.id}/revoke`);
                    }
                    
                    // Remove from local state
                    setTeam((prev) => prev.filter((member) => member.id !== pendingRevoke.id));
                    setPendingRevoke(null);
                  } catch (err: any) {
                    console.error('Revoke error:', err);
                    setPendingRevoke(null);
                    Alert.alert('Error', err?.message || 'Failed to revoke access. Please try again.');
                  }
                }}
              >
                <Text style={s.primaryBtnText}>Revoke Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showBulkInvite} transparent animationType="fade" onRequestClose={() => setShowBulkInvite(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowBulkInvite(false)} />
          <View style={[s.modalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[s.modalTitle, { color: T.textPrimary }]}>Bulk Invite</Text>
            <Text style={[s.modalText, { color: T.textSub }]}>
              Enter multiple email addresses (one per line) to send invites in bulk.
            </Text>

            <Text style={[s.fieldLabel, { color: T.textHint, marginTop: 16 }]}>Email Addresses</Text>
            <TextInput
              style={[s.bulkInput, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
              placeholder="email1@company.com&#10;email2@company.com&#10;email3@company.com"
              placeholderTextColor={T.textHint}
              autoCapitalize="none"
              keyboardType="email-address"
              multiline
              numberOfLines={6}
              value={bulkEmails}
              onChangeText={setBulkEmails}
            />

            <Text style={[s.fieldLabel, { color: T.textHint, marginTop: 12 }]}>Role</Text>
            <View style={s.roleList}>
              {TEAM_ROLE_OPTIONS.map((role) => {
                const selected = bulkRole === role.value;
                return (
                  <TouchableOpacity
                    key={role.value}
                    activeOpacity={0.8}
                    style={[
                      s.roleCard,
                      {
                        backgroundColor: selected ? T.primary + '10' : T.surfaceHigh,
                        borderColor: selected ? T.primary : T.border,
                      },
                    ]}
                    onPress={() => setBulkRole(role.value)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.roleTitle, { color: selected ? T.primary : T.textPrimary }]}>{role.label}</Text>
                      <Text style={[s.roleHelper, { color: T.textHint }]}>{role.helper}</Text>
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

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.secondaryBtn, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => {
                  setShowBulkInvite(false);
                  setBulkEmails('');
                  setBulkRole('hr');
                }}
              >
                <Text style={[s.secondaryBtnText, { color: T.textSub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { flex: 1, marginTop: 0, backgroundColor: T.primary }, submitting && { opacity: 0.6 }]}
                onPress={handleBulkInvite}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.primaryBtnText}>Send Invites</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, marginTop: 3 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  helper: { fontSize: 11, marginTop: 8, marginBottom: 16 },
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
  error: { fontSize: 12, fontWeight: '600', marginTop: 12 },
  successBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    marginTop: 12,
  },
  successTitle: { fontSize: 13, fontWeight: '800' },
  successText: { fontSize: 12, lineHeight: 18 },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    fontWeight: '700',
  },
  codeActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  codeHelper: { flex: 1, fontSize: 11 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  accessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  accessSub: { fontSize: 12, marginTop: -4 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  teamList: { gap: 2 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1 },
  memberName: { fontSize: 13, fontWeight: '700' },
  pendingBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  memberMeta: { fontSize: 11, marginTop: 2 },
  memberCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  memberCodeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: '700',
  },
  memberCopyBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  memberCopyText: { fontSize: 11, fontWeight: '700' },
  revokeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  revokeBtnText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalText: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  bulkInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
