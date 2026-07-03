import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrbBackground } from './SharedAuthComponents';

type Props = {
  T: any;
  topInset: number;
  bottomInset: number;
  email: string;
  code: string;
  error: string;
  helperMessage?: string;
  verifying: boolean;
  resending: boolean;
  inputRowStyle: any;
  inputStyle: any;
  fieldLabelStyle: any;
  onBack: () => void;
  onChangeCode: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  errorTimestamp?: number;
};

export function RegisterOtpVerificationScreen({
  topInset,
  bottomInset,
  email,
  code,
  error,
  helperMessage,
  verifying,
  resending,
  onBack,
  onChangeCode,
  onVerify,
  onResend,
  errorTimestamp,
}: Props) {
  const sheetSlide = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const arrowNudge = useRef(new Animated.Value(0)).current;
  const [showErrorState, setShowErrorState] = useState(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sheetSlide, {
        toValue: 0, duration: 700, delay: 100,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1, duration: 500, delay: 100,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowNudge, {
          toValue: 6, duration: 600,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(arrowNudge, {
          toValue: 0, duration: 600,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (error && errorTimestamp) {
      setShowErrorState(true);
      shakeAnimation.setValue(0);
      
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setShowErrorState(false), 3000);
    }

    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [errorTimestamp, error, shakeAnimation]);

  return (
    <OrbBackground>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 28,
          paddingTop: 28,
          paddingBottom: Math.max(bottomInset, 24) + 8,
          maxHeight: '85%',
          transform: [{ translateY: sheetSlide }],
          opacity: sheetOpacity,
        }}>
          {/* Back button */}
          <TouchableOpacity
            onPress={onBack}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 20 }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#6b7280" />
            <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>

          {/* Drag handle */}
          <View style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#e5e7eb',
            alignSelf: 'center',
            marginBottom: 24,
          }} />

          <Text style={{
            fontSize: 24,
            fontWeight: '800',
            color: '#111827',
            letterSpacing: -0.5,
            marginBottom: 8,
          }}>
            Verify your email
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 24 }}>
            We sent a 6-digit code to <Text style={{ color: '#111827', fontWeight: '600' }}>{email}</Text>.
          </Text>

          {/* Error banner */}
          {!!error && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FECACA',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 20 }}>{error}</Text>
            </View>
          )}

          {!!helperMessage && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#FDE68A',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}>
              <MaterialCommunityIcons name="flask-outline" size={16} color="#F59E0B" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 }}>{helperMessage}</Text>
            </View>
          )}

          {/* OTP grid */}
          <Animated.View style={{ marginBottom: 24, transform: [{ translateX: shakeAnimation }] }}>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
              {Array.from({ length: 6 }).map((_, i) => {
                const digit = code[i];
                const isFocused = code.length === i || (code.length === 6 && i === 5);
                const hasError = showErrorState;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      aspectRatio: 0.85,
                      borderRadius: 14,
                      borderWidth: isFocused ? 2 : 1.5,
                      borderColor: hasError ? '#EF4444' : (isFocused ? '#8B5CF6' : digit ? '#A78BFA' : '#e5e7eb'),
                      backgroundColor: hasError ? '#FEF2F2' : (digit ? '#F5F3FF' : '#fff'),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {digit ? (
                      <Text style={{ fontSize: 22, fontWeight: '700', color: hasError ? '#EF4444' : '#111827' }}>
                        {digit}
                      </Text>
                    ) : (
                      <View style={{ width: 16, height: 2.5, borderRadius: 2, backgroundColor: hasError ? '#EF4444' : (isFocused ? '#8B5CF6' : '#e5e7eb') }} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Hidden input */}
            <TextInput
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
              value={code}
              onChangeText={(value) => onChangeCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
              caretHidden
            />
          </Animated.View>

          {/* Verify button */}
          <TouchableOpacity
            onPress={onVerify}
            activeOpacity={0.88}
            disabled={verifying}
            style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: '#8B5CF6',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 12,
              opacity: verifying ? 0.65 : 1,
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
              {verifying ? 'Verifying...' : 'Verify and create account'}
            </Text>
            {!verifying && (
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Resend button */}
          <TouchableOpacity
            onPress={onResend}
            activeOpacity={0.88}
            disabled={resending}
            style={{
              height: 56,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: '#e5e7eb',
              backgroundColor: '#fff',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: resending ? 0.65 : 1,
            }}
          >
            <MaterialCommunityIcons name="email-fast-outline" size={18} color="#111827" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
              {resending ? 'Sending new code...' : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </OrbBackground>
  );
}
