import { Link } from 'expo-router';
import { StatusBar, Text, TouchableOpacity, View, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useRef, useEffect } from 'react';
import { OrbBackground, AnimatedField } from './SharedAuthComponents';
import type { Role } from './types';

const GOOGLE_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  <path fill="none" d="M0 0h48v48H0z"/>
</svg>
`;

function GoogleIcon() {
  return <SvgXml xml={GOOGLE_ICON_SVG} width={18} height={18} />;
}

type Props = {
  T: any;
  topInset: number;
  bottomInset: number;
  role: Role;
  email: string;
  error: string;
  googleLoading?: boolean;
  fieldLabelStyle: any;
  inputRowStyle: any;
  inputStyle: any;
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onContinue: () => void;
  onGoogleRegister: () => void;
  onInviteCode: () => void;
};

export function RegisterEmailGate({
  topInset,
  bottomInset,
  role,
  email,
  error,
  googleLoading = false,
  onBack,
  onChangeEmail,
  onContinue,
  onGoogleRegister,
  onInviteCode,
}: Props) {
  const sheetSlide = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const arrowNudge = useRef(new Animated.Value(0)).current;

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
            Create your account
          </Text>
          <Text style={{ fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 24 }}>
            {role === 'applicant'
              ? "Start with your email, then we'll guide you through each step."
              : 'Use your work email to create a company account, or join with an invite code.'}
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

          {/* Email field */}
          <View style={{ marginBottom: 20 }}>
            <AnimatedField
              label="Email address"
              placeholder={role === 'hr' ? 'admin@company.com' : 'your.email@example.com'}
              value={email}
              onChangeText={onChangeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
              {role === 'hr' ? 'Use your work email to create a company account.' : "We'll send a verification code to this address."}
            </Text>
          </View>

          {/* Continue button */}
          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.88}
            style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: '#8B5CF6',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 16,
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
              Continue
            </Text>
            <Animated.Text style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 18,
              transform: [{ translateX: arrowNudge }],
            }}>
              →
            </Animated.Text>
          </TouchableOpacity>

          {role === 'applicant' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
              </View>

              <TouchableOpacity
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
                  opacity: googleLoading ? 0.7 : 1,
                }}
                onPress={onGoogleRegister}
                activeOpacity={0.85}
                disabled={googleLoading}
              >
                <GoogleIcon />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                  {googleLoading ? 'Opening Google...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {role === 'hr' && (
            <TouchableOpacity
              style={{
                height: 56,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#8B5CF6',
                backgroundColor: '#fff',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
              onPress={onInviteCode}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color="#8B5CF6" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6' }}>
                Register via Invite Code
              </Text>
            </TouchableOpacity>
          )}

          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18, marginTop: 20 }}>
            By continuing, you agree to our <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>Terms of Service</Text> and <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>Privacy Policy</Text>.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}>
                <Text style={{ fontSize: 14, color: '#D8B4FE', fontWeight: '700' }}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </View>
    </OrbBackground>
  );
}
