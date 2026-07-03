import { Link } from 'expo-router';
import { StatusBar, Text, TouchableOpacity, View, Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';
import type { Role } from './types';

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

function ApplicantIcon({ color }: { color: string }) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function HRIcon({ color }: { color: string }) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="14" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M3 10h18" stroke={color} strokeWidth="1.8" />
      <Path d="M8 6V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M16 6V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="9" cy="15" r="1.5" fill={color} />
      <Circle cx="15" cy="15" r="1.5" fill={color} />
    </Svg>
  );
}

type Props = {
  T: any;
  topInset: number;
  bottomInset: number;
  role: Role;
  setRole: (role: Role) => void;
  onContinue: () => void;
};

export function RegisterRoleSplash({ T, topInset, bottomInset, role, setRole, onContinue }: Props) {
  // Entrance animations
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroSlide    = useRef(new Animated.Value(-24)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsSlide   = useRef(new Animated.Value(40)).current;
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
      Animated.timing(cardsOpacity, {
        toValue: 1, duration: 600, delay: 400,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(cardsSlide, {
        toValue: 0, duration: 600, delay: 400,
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
    <View style={{ flex: 1, backgroundColor: '#0D0520', overflow: 'hidden' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Orbs ──────────────────────────────────────────────────────── */}
      <Orb size={350} color="#7C3AED" opacity={0.7} delay={0}    style={{ top: -140, left: -100 }} />
      <Orb size={280} color="#EC4899" opacity={0.6} delay={500}  style={{ top: -80,  right: -100 }} />
      <Orb size={200} color="#A855F7" opacity={0.5} delay={1000} style={{ top: 200,  left: 20 }} />
      <Orb size={180} color="#C084FC" opacity={0.4} delay={1500} style={{ bottom: 100, right: -40 }} />

      <View
        style={{
          flex: 1,
          paddingTop: topInset + 40,
          paddingHorizontal: 28,
          justifyContent: 'space-between',
          paddingBottom: Math.max(32, bottomInset + 16),
        }}
      >
        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <Animated.View 
          style={{ 
            alignItems: 'center',
            opacity: heroOpacity,
            transform: [{ translateY: heroSlide }],
          }}
        >
          <View
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>J</Text>
          </View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '800',
              color: '#fff',
              letterSpacing: -1,
              textAlign: 'center',
              marginBottom: 12,
              textShadowColor: 'rgba(0, 0, 0, 0.3)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            Welcome to{'\n'}
            <Text style={{ color: '#D8B4FE' }}>JobSwipe</Text>
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              lineHeight: 23,
            }}
          >
            Let's get you set up. First, tell us{'\n'}who you are.
          </Text>
        </Animated.View>

        {/* ── Role Cards ────────────────────────────────────────────────── */}
        <Animated.View 
          style={{ 
            gap: 16,
            opacity: cardsOpacity,
            transform: [{ translateY: cardsSlide }],
          }}
        >
          {[
            {
              key: 'applicant' as Role,
              title: 'Job Seeker',
              desc: 'Browse job listings, swipe to apply,\nand land your next role.',
              IconComp: ApplicantIcon,
            },
            {
              key: 'hr' as Role,
              title: 'HR / Company',
              desc: 'Post openings, review applicants,\nand build your dream team.',
              IconComp: HRIcon,
            },
          ].map(({ key, title, desc, IconComp }) => {
            const active = role === key;
            const accent = '#A78BFA'; // Lighter purple for both
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setRole(key)}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  backgroundColor: active ? accent : 'rgba(255,255,255,0.08)',
                  borderWidth: 2.5,
                  borderColor: active ? '#fff' : 'rgba(255,255,255,0.15)',
                  borderRadius: 20,
                  padding: 20,
                  shadowColor: active ? accent : 'transparent',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: active ? 0.5 : 0,
                  shadowRadius: 16,
                  elevation: active ? 8 : 0,
                }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 16,
                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComp color={active ? '#fff' : 'rgba(255,255,255,0.5)'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: '#fff',
                      marginBottom: 4,
                      letterSpacing: -0.3,
                    }}
                  >
                    {title}
                  </Text>
                  <Text style={{ 
                    fontSize: 13, 
                    color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)', 
                    lineHeight: 19,
                    fontWeight: active ? '500' : '400',
                  }}>
                    {desc}
                  </Text>
                </View>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.12)',
                    borderWidth: active ? 0 : 2,
                    borderColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active && <MaterialCommunityIcons name="check-bold" size={18} color={accent} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            onPress={onContinue}
            activeOpacity={0.88}
            style={{
              height: 58,
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
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
              Continue as {role === 'applicant' ? 'Job Seeker' : 'HR / Company'}
            </Text>
            <Animated.Text style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 18,
              transform: [{ translateX: arrowNudge }],
            }}>
              →
            </Animated.Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}>
                <Text style={{ fontSize: 14, color: '#D8B4FE', fontWeight: '700' }}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}
