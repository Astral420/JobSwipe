import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radii, Shadows } from './themes';

interface ButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  label?: string;
  icon?: string;
  iconSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

// ─── PrimaryButton — filled indigo, used for main CTA (Apply / Like) ───────
export const PrimaryButton: React.FC<ButtonProps> = ({
  onPress, label, icon, iconSize = 28, style, disabled,
}) => (
  <TouchableOpacity
    style={[styles.base, styles.primary, style, disabled && styles.disabled]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={disabled}
  >
    {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={Colors.white} />}
    {label && <Text style={[styles.label, styles.primaryLabel]}>{label}</Text>}
  </TouchableOpacity>
);

// ─── SecondaryButton — light red tint, used for Pass / Skip ─────────────────
export const SecondaryButton: React.FC<ButtonProps> = ({
  onPress, icon, iconSize = 26, style, disabled,
}) => (
  <TouchableOpacity
    style={[styles.base, styles.secondary, style, disabled && styles.disabled]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={disabled}
  >
    {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={Colors.danger} />}
  </TouchableOpacity>
);

// ─── OutlineButton — bordered neutral, used for Save / Bookmark ─────────────
export const OutlineButton: React.FC<ButtonProps> = ({
  onPress, icon, iconSize = 22, iconColor = Colors.warning, style, disabled,
}) => (
  <TouchableOpacity
    style={[styles.base, styles.outline, style, disabled && styles.disabled]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={disabled}
  >
    {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} />}
  </TouchableOpacity>
);

// ─── GhostButton — no border, used for Undo / tertiary actions ──────────────
export const GhostButton: React.FC<ButtonProps> = ({
  onPress, icon, iconSize = 20, iconColor = Colors.gray400, label, style, disabled,
}) => (
  <TouchableOpacity
    style={[styles.base, styles.ghost, style, disabled && styles.disabled]}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={disabled}
  >
    {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} />}
    {label && <Text style={[styles.label, styles.ghostLabel]}>{label}</Text>}
  </TouchableOpacity>
);

// ─── SuperButton — indigo tint, used for Super Like / Star ──────────────────
export const SuperButton: React.FC<ButtonProps> = ({
  onPress, icon, iconSize = 20, style, disabled,
}) => (
  <TouchableOpacity
    style={[styles.base, styles.super, style, disabled && styles.disabled]}
    onPress={onPress}
    activeOpacity={0.8}
    disabled={disabled}
  >
    {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={Colors.primary} />}
  </TouchableOpacity>
);

// ─── TextButton — plain text link button ────────────────────────────────────
export const TextButton: React.FC<ButtonProps> = ({
  onPress, label, icon, iconSize = 15, iconColor = Colors.primary, style,
}) => (
  <TouchableOpacity
    style={[styles.textBtn, style]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && <MaterialCommunityIcons name={icon as any} size={iconSize} color={iconColor} />}
    {label && <Text style={styles.textBtnLabel}>{label}</Text>}
  </TouchableOpacity>
);

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  disabled: { opacity: 0.45 },

  // Variants
  primary: {
    backgroundColor: Colors.success,
    width: 64, height: 64,
    ...Shadows.colored(Colors.success),
  },
  primaryLabel: { color: Colors.white },

  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    width: 54, height: 54,
    ...Shadows.sm,
  },

  outline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    width: 44, height: 44,
    ...Shadows.sm,
  },

  ghost: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    width: 54, height: 54,
    ...Shadows.xs,
  },

  super: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryMid,
    width: 44, height: 44,
    ...Shadows.xs,
  },

  label: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
  },
  ghostLabel: { color: Colors.gray500 },

  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    paddingVertical: Spacing['2'],
  },
  textBtnLabel: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
});