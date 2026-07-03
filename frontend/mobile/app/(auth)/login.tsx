import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

// ─── Animated Orb ─────────────────────────────────────────────────────────────
function Orb({
  size,
  color,
  style,
  opacity,
  delay = 0,
}: {
  size: number;
  color: string;
  style?: object;
  opacity: number;
  delay?: number;
}) {
  const xy    = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(xy, {
            toValue: { x: 14, y: 20 },
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(xy, {
            toValue: { x: 0, y: 0 },
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [
            { translateX: xy.x },
            { translateY: xy.y },
            { scale },
          ],
        },
        style,
      ]}
    />
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({
  label,
  showForgot,
  right,
  inputRef,
  ...props
}: {
  label: string;
  showForgot?: boolean;
  right?: React.ReactNode;
  inputRef?: React.RefObject<TextInput | null>;
  [k: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F3F4F6', '#7C3AED'],
  });

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F9FAFB', '#FBFAFF'],
  });

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{
          fontSize: 10,
          fontWeight: '700',
          color: focused ? '#7C3AED' : '#9CA3AF',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {label}
        </Text>
        {showForgot && (
          <TouchableOpacity 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 0 }}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>
              Forgot password?
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bgColor,
        borderWidth: 1.5,
        borderColor,
        borderRadius: 14,
        paddingHorizontal: 16,
        gap: 10,
      }}>
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            paddingVertical: 15,
            fontSize: 14,
            color: '#111827',
            letterSpacing: -0.2,
          }}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {right}
      </Animated.View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { top, bottom }                 = useSafeAreaInsets();
  const setToken                        = useAuthStore((s) => s.setToken);
  const passwordRef                     = useRef<TextInput>(null);

  // Entrance animations
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroSlide    = useRef(new Animated.Value(-24)).current;
  const sheetSlide   = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const arrowNudge   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1, duration: 700, delay: 100,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0, duration: 700, delay: 100,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(sheetSlide, {
        toValue: 0, duration: 700, delay: 300,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1, duration: 500, delay: 300,
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

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      const { token, user } = data as unknown as { token: string; user: { role: string } };
      const role = user?.role;
      if (role !== 'applicant' && role !== 'hr' && role !== 'company_admin') {
        throw new Error('Unable to determine account role.');
      }
      await setToken(token, role as any);
      router.replace(role === 'applicant' ? '/(tabs)' : '/(company-tabs)');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // flex: 1 + overflow hidden = the root never grows beyond the screen
    <View style={{ flex: 1, backgroundColor: '#0D0520', overflow: 'hidden' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Orbs ──────────────────────────────────────────────────────── */}
      <Orb size={320} color="#7C3AED" opacity={0.5} delay={0}    style={{ top: -120, left: -80 }} />
      <Orb size={240} color="#EC4899" opacity={0.4} delay={500}  style={{ top: -60,  right: -80 }} />
      <Orb size={160} color="#A855F7" opacity={0.3} delay={1000} style={{ top: 220,  left: 40 }} />

      {/* ── Hero — absolutely fills the dark background ────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: top + 40,
          paddingHorizontal: 28,
          opacity: heroOpacity,
          transform: [{ translateY: heroSlide }],
        }}
      >
        {/* Logo */}
        <View style={{ marginBottom: 32 }}>
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>J</Text>
          </View>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}>
            JobSwipe
          </Text>
        </View>

        {/* Headline */}
        <Text style={{
          fontSize: 42,
          fontWeight: '800',
          color: '#fff',
          lineHeight: 46,
          letterSpacing: -1.5,
          marginBottom: 12,
        }}>
          Find work{'\n'}you{' '}
          <Text style={{ color: '#C084FC' }}>love.</Text>
        </Text>
        <Text style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 22,
        }}>
          Swipe through thousands of roles{'\n'}matched just for you.
        </Text>
      </Animated.View>

      {/* ── Sheet — pinned to the bottom, keyboard-aware ───────────────── */}
      {/*
        KeyboardAvoidingView with justifyContent:"flex-end" keeps the sheet
        glued to the bottom at rest. When the keyboard opens it pushes the
        sheet up exactly enough to stay visible. No ScrollView means no
        bounce / over-scroll — the hero behind is always locked in place.
      */}
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 28,
          paddingTop: 28,
          // Respect home indicator on notched devices
          paddingBottom: Math.max(bottom, 24) + 8,
          maxHeight: '65%', // Limit sheet height so hero content is visible
          transform: [{ translateY: sheetSlide }],
          opacity: sheetOpacity,
        }}>

          {/* Drag handle (decorative only — sheet does not actually drag) */}
          <View style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#E5E7EB',
            alignSelf: 'center',
            marginBottom: 28,
          }} />

          <Text style={{
            fontSize: 22,
            fontWeight: '800',
            color: '#111827',
            letterSpacing: -0.5,
            marginBottom: 24,
          }}>
            Sign in
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
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color="#EF4444"
                style={{ marginTop: 1 }}
              />
              <Text style={{ flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 20 }}>
                {error}
              </Text>
            </View>
          )}

          {/* Input fields */}
          <View style={{ gap: 14, marginBottom: 20 }}>
            <Field
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              label="Password"
              showForgot
              inputRef={passwordRef}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              right={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              }
            />
          </View>

          {/* CTA button */}
          <TouchableOpacity
            onPress={handleLogin}
            activeOpacity={0.88}
            disabled={loading}
            style={{ opacity: loading ? 0.65 : 1 }}
          >
            <View style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: '#7C3AED',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: '700',
                    letterSpacing: -0.3,
                  }}>
                    Continue
                  </Text>
                  <Animated.Text style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 18,
                    transform: [{ translateX: arrowNudge }],
                  }}>
                    →
                  </Animated.Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Sign-up link */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 5,
            marginTop: 20,
          }}>
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>New here?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}>
                <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '700' }}>
                  Create account →
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
