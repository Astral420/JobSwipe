import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrbBackground, AnimatedField } from './SharedAuthComponents';
import type { AuthRole } from '../../../store/authStore';
import { api } from '../../../services/api';

type Props = {
  T: any;
  topInset: number;
  bottomInset: number;
  email: string;
  detectedCompany: { name: string; validCodes: string[] } | null;
  fieldLabelStyle: any;
  inputRowStyle: any;
  inputStyle: any;
  jobTitleOptions: string[];
  setToken: (token: string, role?: AuthRole | null) => Promise<void>;
  onOtpSent: () => void;
  onBack: () => void;
  onNeedInviteCode: (formData: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    password: string;
  }) => void;
};

export function HRInviteRegistrationForm({
  T,
  topInset,
  bottomInset,
  email,
  detectedCompany,
  fieldLabelStyle,
  inputRowStyle,
  inputStyle,
  jobTitleOptions,
  setToken,
  onOtpSent,
  onBack,
  onNeedInviteCode,
}: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [showJobTitleDropdown, setShowJobTitleDropdown] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<{ uri: string; name: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const arrowTranslate = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>[\]\\/\-_+=~`';]/.test(password);
  const hasMinLength = password.length >= 8;
  const strengthLevel =
    password.length === 0 
      ? null 
      : !hasMinLength || !hasUppercase || !hasNumber || !hasSpecialChar
        ? 'weak' 
        : password.length < 12 
          ? 'good' 
          : 'strong';
  const strengthColor = strengthLevel === 'weak' ? '#EF4444' : strengthLevel === 'good' ? '#F59E0B' : '#10B981';
  const resolvedTitle = jobTitle === 'Custom' ? customJobTitle.trim() : jobTitle;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProfilePhoto({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg' });
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!firstName.trim() || firstName.trim().length < 2 || firstName.trim().length > 50) {
      setFormError('First name must be 2-50 characters.');
      return;
    }
    if (!lastName.trim() || lastName.trim().length < 2 || lastName.trim().length > 50) {
      setFormError('Last name must be 2-50 characters.');
      return;
    }
    if (!resolvedTitle || resolvedTitle.length < 2 || resolvedTitle.length > 100) {
      setFormError('Job title must be 2-100 characters.');
      return;
    }
    if (!password) {
      setFormError('Please enter a password.');
      return;
    }
    if (!hasMinLength) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (!hasUppercase) {
      setFormError('Password must contain at least 1 uppercase letter.');
      return;
    }
    if (!hasNumber) {
      setFormError('Password must contain at least 1 number.');
      return;
    }
    if (!hasSpecialChar) {
      setFormError('Password must contain at least 1 special character (!@#$%^&*(),.?":{}|<>[]\\/-_+=~`\';).');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    // All validation passed - now ask for invite code
    onNeedInviteCode({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      jobTitle: resolvedTitle,
      password,
    });
  };

  return (
    <OrbBackground>
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: topInset }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" />
        
        {/* Back Button */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
          <TouchableOpacity
            onPress={onBack}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '500' }}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet */}
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: Math.max(bottomInset, 24) + 24, gap: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Company Badge */}
            {detectedCompany && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#E9D5FF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                <MaterialCommunityIcons name="office-building" size={20} color="#8B5CF6" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#8B5CF6' }}>
                    Joining {detectedCompany.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>HR team member via invite</Text>
                </View>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
              </View>
            )}

            {/* Header */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.5 }}>
                HR registration
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
                Finish your invite-based registration to join the company team.
              </Text>
            </View>

            {/* Error Banner */}
            {formError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={{ flex: 1, color: '#EF4444', fontSize: 13 }}>{formError}</Text>
              </View>
            ) : null}

            {/* Email (locked) */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' }}>
                EMAIL
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                borderWidth: 1.5,
                borderColor: '#E5E7EB',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 15,
                gap: 10,
                opacity: 0.7,
              }}>
                <MaterialCommunityIcons name="email-outline" size={16} color="#9CA3AF" />
                <Text style={{ flex: 1, fontSize: 14, color: '#6B7280' }}>{email}</Text>
                <MaterialCommunityIcons name="lock-outline" size={14} color="#9CA3AF" />
              </View>
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Pre-filled from invite and locked</Text>
            </View>

            {/* Password Fields */}
            <AnimatedField
              label="Password"
              placeholder="8+ chars, uppercase, number, special char"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              right={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
                </TouchableOpacity>
              }
            />
            {strengthLevel && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -16 }}>
                <View style={{ flex: 1, height: 3, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 999, backgroundColor: strengthColor, width: strengthLevel === 'weak' ? '33%' : strengthLevel === 'good' ? '66%' : '100%' }} />
                </View>
                <Text style={{ fontSize: 11, color: strengthColor, fontWeight: '600', minWidth: 40 }}>
                  {strengthLevel === 'weak' ? 'Weak' : strengthLevel === 'good' ? 'Good' : 'Strong'}
                </Text>
              </View>
            )}

            <AnimatedField
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              right={
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <MaterialCommunityIcons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
                </TouchableOpacity>
              }
            />

            {/* Name Fields */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AnimatedField
                  label="First name"
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AnimatedField
                  label="Last name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Job Title */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' }}>
                JOB TITLE *
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F9FAFB',
                  borderWidth: 1.5,
                  borderColor: '#E5E7EB',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 15,
                }}
                onPress={() => setShowJobTitleDropdown(!showJobTitleDropdown)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <MaterialCommunityIcons name="briefcase-outline" size={16} color="#9CA3AF" />
                  <Text style={{ color: resolvedTitle ? '#111827' : '#9CA3AF', fontSize: 14 }}>
                    {resolvedTitle || 'Select or type your title'}
                  </Text>
                </View>
                <MaterialCommunityIcons name={showJobTitleDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {showJobTitleDropdown && (
                <View style={{ gap: 8, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 8 }}>
                  {jobTitleOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setJobTitle(option);
                        setShowJobTitleDropdown(false);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 }}
                    >
                      <Text style={{ fontSize: 14, color: '#111827' }}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {jobTitle === 'Custom' && (
                <AnimatedField
                  label=""
                  placeholder="Enter custom job title"
                  value={customJobTitle}
                  onChangeText={setCustomJobTitle}
                />
              )}
            </View>

            {/* Profile Photo */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase' }}>
                PROFILE PHOTO
              </Text>
              <View style={{ alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={pickPhoto}
                  style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: profilePhoto ? '#8B5CF6' : '#E5E7EB' }}
                >
                  {profilePhoto ? <Image source={{ uri: profilePhoto.uri }} style={{ width: 80, height: 80 }} /> : <MaterialCommunityIcons name="account" size={40} color="#9CA3AF" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={pickPhoto} activeOpacity={0.7}>
                  <Text style={{ fontSize: 14, color: '#8B5CF6', fontWeight: '600' }}>{profilePhoto ? 'Change photo' : 'Upload photo'}</Text>
                </TouchableOpacity>
                {profilePhoto && (
                  <TouchableOpacity onPress={() => setProfilePhoto(null)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 12, color: '#EF4444' }}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#8B5CF6',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submitting ? 0.6 : 1,
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <MaterialCommunityIcons name="loading" size={18} color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Continue</Text>
                  <Animated.View style={{ transform: [{ translateX: arrowTranslate }] }}>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                  </Animated.View>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </OrbBackground>
  );
}
