import { useState, useRef, useEffect } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrbBackground, AnimatedField } from '../../components/auth/register/SharedAuthComponents';
import { api } from '../../services/api';

export default function ForgotPasswordScreen() {
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const sheetSlide = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const arrowNudge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sheetSlide, {
        toValue: 0,
        duration: 700,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 500,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowNudge, {
          toValue: 6,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(arrowNudge, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleResetPassword = async () => {
    setError('');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <OrbBackground>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        <KeyboardAvoidingView 
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: Math.max(bottomInset, 24) + 8,
              maxHeight: '85%',
              transform: [{ translateY: sheetSlide }],
              opacity: sheetOpacity,
            }}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#e5e7eb',
                alignSelf: 'center',
                marginBottom: 32,
              }}
            />

            {/* Success Icon */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <MaterialCommunityIcons name="email-check-outline" size={40} color="#10B981" />
              </View>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: '#111827',
                  letterSpacing: -0.5,
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Check your email
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, textAlign: 'center' }}>
                We've sent a password reset link to{' '}
                <Text style={{ color: '#111827', fontWeight: '600' }}>{email}</Text>
              </Text>
            </View>

            {/* Info Box */}
            <View
              style={{
                backgroundColor: '#F0F9FF',
                borderWidth: 1,
                borderColor: '#BAE6FD',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#0284C7" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#0C4A6E', lineHeight: 20 }}>
                    The link will expire in 1 hour. If you don't see the email, check your spam folder.
                  </Text>
                </View>
              </View>
            </View>

            {/* Back to Login Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.88}
              style={{
                height: 56,
                borderRadius: 16,
                backgroundColor: '#8B5CF6',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
                Back to login
              </Text>
            </TouchableOpacity>

            {/* Resend Link */}
            <TouchableOpacity
              onPress={() => {
                setSuccess(false);
                setEmail('');
              }}
              style={{ marginTop: 16, alignItems: 'center', paddingVertical: 12 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, color: '#8B5CF6', fontWeight: '600' }}>
                Didn't receive the email? Try again
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </OrbBackground>
    );
  }

  return (
    <OrbBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              maxHeight: '85%',
              transform: [{ translateY: sheetSlide }],
              opacity: sheetOpacity,
            }}
          >
            {/* Back button */}
            <View style={{ paddingHorizontal: 28, paddingTop: 28 }}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 20 }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color="#6b7280" />
                <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>

              {/* Drag handle */}
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#e5e7eb',
                  alignSelf: 'center',
                  marginBottom: 24,
                }}
              />
            </View>

            <ScrollView
              contentContainerStyle={{ 
                paddingHorizontal: 28, 
                paddingBottom: Math.max(bottomInset, 24) + 16 
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Icon */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#F3E8FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <MaterialCommunityIcons name="lock-reset" size={32} color="#8B5CF6" />
                </View>
              </View>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: '#111827',
                  letterSpacing: -0.5,
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Reset your password
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 24, textAlign: 'center' }}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              {/* Error banner */}
              {!!error && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    backgroundColor: '#FEF2F2',
                    borderWidth: 1,
                    borderColor: '#FECACA',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 20 }}>{error}</Text>
                </View>
              )}

              {/* Email field */}
              <View style={{ marginBottom: 20 }}>
                <AnimatedField
                  label="Email address"
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                />
              </View>

              {/* Send Reset Link button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                activeOpacity={0.88}
                disabled={loading}
                style={{
                  height: 56,
                  borderRadius: 16,
              backgroundColor: '#8B5CF6',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 16,
              opacity: loading ? 0.7 : 1,
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {loading ? (
              <MaterialCommunityIcons name="loading" size={20} color="#fff" />
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
                  Send reset link
                </Text>
                <Animated.Text
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 18,
                    transform: [{ translateX: arrowNudge }],
                  }}
                >
                  →
                </Animated.Text>
              </>
            )}
          </TouchableOpacity>

          {/* Back to login link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>Remember your password?</Text>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}>
              <Text style={{ fontSize: 14, color: '#8B5CF6', fontWeight: '700' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </OrbBackground>
  );
}
