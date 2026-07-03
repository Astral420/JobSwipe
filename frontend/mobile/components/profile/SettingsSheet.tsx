import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, setThemeMode, getThemeMode } from '../../theme';
import { api } from '../../services/api';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export function SettingsSheet({ visible, onClose, onSignOut }: SettingsSheetProps) {
  const T = useTheme();
  const [isLight, setIsLight] = useState(getThemeMode() === 'light');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const handleToggle = (val: boolean) => {
    setIsLight(val);
    setThemeMode(val ? 'light' : 'dark');
  };

  useEffect(() => {
    if (visible) {
      setLoadingPrefs(true);
      api.get('/notifications/preferences')
        .then((data: any) => {
          const prefs = data?.preferences ?? data;
          if (prefs) {
            setEmailNotifs(prefs.email_notifications ?? true);
            setPushNotifs(prefs.push_notifications ?? true);
          }
        })
        .catch((err) => console.error('Failed to load notification preferences:', err))
        .finally(() => setLoadingPrefs(false));
    }
  }, [visible]);

  const saveNotificationPrefs = async (email: boolean, push: boolean) => {
    setSavingPrefs(true);
    try {
      await api.patch('/notifications/preferences', {
        email_notifications: email,
        push_notifications: push,
      });
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      Alert.alert('Error', 'Failed to save notification preferences. Please try again.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleEmailToggle = (val: boolean) => {
    setEmailNotifs(val);
    saveNotificationPrefs(val, pushNotifs);
  };

  const handlePushToggle = (val: boolean) => {
    setPushNotifs(val);
    saveNotificationPrefs(emailNotifs, val);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: T.surface, borderColor: T.border }]}>
        <View style={[styles.handle, { backgroundColor: T.borderFaint }]} />

        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: T.textPrimary }]}>Settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.groupLabel, { color: T.textHint }]}>Appearance</Text>

        <View style={[styles.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: isLight ? '#f59e0b18' : T.primary + '18' }]}>
            <MaterialCommunityIcons
              name={isLight ? 'weather-sunny' : 'weather-night'}
              size={18}
              color={isLight ? '#f59e0b' : T.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: T.textPrimary }]}>
              {isLight ? 'Light Mode' : 'Dark Mode'}
            </Text>
            <Text style={[styles.rowSub, { color: T.textHint }]}>
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

        <Text style={[styles.groupLabel, { color: T.textHint }]}>Notifications</Text>

        {loadingPrefs ? (
          <View style={[styles.row, { backgroundColor: T.surfaceHigh, borderColor: T.border, justifyContent: 'center' }]}>
            <ActivityIndicator size="small" color={T.primary} />
            <Text style={[styles.rowSub, { color: T.textHint, marginLeft: 8 }]}>Loading preferences...</Text>
          </View>
        ) : (
          <>
            <View style={[styles.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: T.primary + '18' }]}>
                <MaterialCommunityIcons name="email-outline" size={18} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: T.textPrimary }]}>Email Notifications</Text>
                <Text style={[styles.rowSub, { color: T.textHint }]}>Receive updates via email</Text>
              </View>
              <Switch
                value={emailNotifs}
                onValueChange={handleEmailToggle}
                trackColor={{ false: T.textHint + '55', true: T.primary + '88' }}
                thumbColor={emailNotifs ? T.primary : T.textHint}
                disabled={savingPrefs}
              />
            </View>

            <View style={[styles.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: T.primary + '18' }]}>
                <MaterialCommunityIcons name="bell-outline" size={18} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: T.textPrimary }]}>Push Notifications</Text>
                <Text style={[styles.rowSub, { color: T.textHint }]}>Receive alerts on your device</Text>
              </View>
              <Switch
                value={pushNotifs}
                onValueChange={handlePushToggle}
                trackColor={{ false: T.textHint + '55', true: T.primary + '88' }}
                thumbColor={pushNotifs ? T.primary : T.textHint}
                disabled={savingPrefs}
              />
            </View>
          </>
        )}

        <Text style={[styles.groupLabel, { color: T.textHint }]}>Account</Text>

        {[
          { icon: 'shield-lock-outline' as const, label: 'Privacy', sub: 'Control your data' },
          { icon: 'help-circle-outline' as const, label: 'Help & Support', sub: 'FAQs and contact' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.7}
            style={[styles.row, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: T.primary + '18' }]}>
              <MaterialCommunityIcons name={item.icon} size={18} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: T.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.rowSub, { color: T.textHint }]}>{item.sub}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={T.textHint} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.row, styles.signOutRow, { backgroundColor: T.dangerBg, borderColor: T.danger + '26' }]}
          onPress={onSignOut}
        >
          <View style={[styles.iconWrap, { backgroundColor: T.danger + '18' }]}>
            <MaterialCommunityIcons name="logout" size={18} color={T.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: T.danger }]}>Sign out</Text>
            <Text style={[styles.rowSub, { color: T.textHint }]}>Log out of your account</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={T.danger} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 20 
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
    marginBottom: 10 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    borderRadius: 14, 
    borderWidth: 1, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    marginBottom: 8 
  },
  signOutRow: { marginTop: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 1 },
});
