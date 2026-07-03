import { useRef, useEffect, useState } from 'react';
import { Animated, Easing, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Animated Orb ─────────────────────────────────────────────────────────────
export function Orb({
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

// ─── Animated Input Field ─────────────────────────────────────────────────────
export function AnimatedField({
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
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 0 }}>
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

// ─── Orb Background Container ─────────────────────────────────────────────────
export function OrbBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0520', overflow: 'hidden' }}>
      <Orb size={350} color="#7C3AED" opacity={0.7} delay={0}    style={{ top: -140, left: -100 }} />
      <Orb size={280} color="#EC4899" opacity={0.6} delay={500}  style={{ top: -80,  right: -100 }} />
      <Orb size={200} color="#A855F7" opacity={0.5} delay={1000} style={{ top: 200,  left: 20 }} />
      <Orb size={180} color="#C084FC" opacity={0.4} delay={1500} style={{ bottom: 100, right: -40 }} />
      {children}
    </View>
  );
}
