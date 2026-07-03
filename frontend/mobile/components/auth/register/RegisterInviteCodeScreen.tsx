import { useRef, useEffect } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrbBackground, AnimatedField } from './SharedAuthComponents';

type CompanyInfo = { name: string; validCodes: string[] } | null;

type Props = {
  T: any;
  topInset: number;
  inviteCode: string;
  inviteError: string;
  detectedCompany: CompanyInfo;
  fieldLabelStyle: any;
  inputRowStyle: any;
  inputStyle: any;
  onBack: () => void;
  onChangeInviteCode: (value: string) => void;
  onVerify: () => void;
  onRequestInvite: () => void;
};

export function RegisterInviteCodeScreen({
  T,
  topInset,
  inviteCode,
  inviteError,
  detectedCompany,
  fieldLabelStyle,
  inputRowStyle,
  inputStyle,
  onBack,
  onChangeInviteCode,
  onVerify,
  onRequestInvite,
}: Props) {
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
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 24,
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="office-building" size={32} color="#8B5CF6" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: -0.5 }}>
              Join with an invite code
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
              Enter the code from your company admin. We'll use it to verify your company and work email.
            </Text>
          </View>

          {/* Invite Code Input */}
          <View style={{ gap: 24 }}>
            <AnimatedField
              label="Company invite token"
              placeholder="e.g. COMPANY-HR-2024"
              value={inviteCode}
              onChangeText={onChangeInviteCode}
              autoCapitalize="characters"
              autoFocus
            />
            {inviteError ? (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: -16 }}>{inviteError}</Text>
            ) : null}

            {/* Verify Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#8B5CF6',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={onVerify}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Verify & Continue</Text>
                <Animated.View style={{ transform: [{ translateX: arrowTranslate }] }}>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                </Animated.View>
              </View>
            </TouchableOpacity>

            {/* Help Section */}
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 20, gap: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                Don't have an invite code?
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18 }}>
                Ask your company admin to send you an invite link, or contact {detectedCompany ? detectedCompany.name : 'your company'}'s HR team to get access.
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1.5,
                  borderColor: '#8B5CF6',
                  borderRadius: 12,
                  paddingVertical: 12,
                  marginTop: 4,
                }}
                onPress={onRequestInvite}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="email-arrow-right-outline" size={18} color="#8B5CF6" />
                <Text style={{ fontSize: 14, color: '#8B5CF6', fontWeight: '600' }}>Request an invite link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </OrbBackground>
  );
}
