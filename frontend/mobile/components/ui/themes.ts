// ─── JobSwipe Design System ────────────────────────────────────────────────

export const Colors = {
  // Brand
  primary:        '#4F46E5',
  primaryLight:   '#EEF2FF',
  primaryMid:     '#C7D2FE',
  primaryDark:    '#3730A3',

  // Semantic
  success:        '#10B981',
  successLight:   '#F0FDF4',
  successMid:     '#A7F3D0',

  warning:        '#F59E0B',
  warningLight:   '#FFF7ED',
  warningMid:     '#FCD34D',

  danger:         '#EF4444',
  dangerLight:    '#FEF2F2',
  dangerMid:      '#FECACA',

  // Neutrals
  gray50:         '#F9FAFB',
  gray100:        '#F3F4F6',
  gray200:        '#E5E7EB',
  gray300:        '#D1D5DB',
  gray400:        '#9CA3AF',
  gray500:        '#6B7280',
  gray600:        '#4B5563',
  gray700:        '#374151',
  gray800:        '#1F2937',
  gray900:        '#111827',

  // Surfaces
  background:     '#F8F9FE',
  surface:        '#FFFFFF',
  surfaceAlt:     '#F3F4F6',

  white:          '#FFFFFF',
  black:          '#000000',
  transparent:    'transparent',

  // Company palette (for logos)
  violet:         '#8B5CF6',
  sky:            '#0EA5E9',
  rose:           '#EC4899',
  teal:           '#14B8A6',
  orange:         '#F97316',
} as const;

export const Typography = {
  // Font sizes
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   15,
  xl:   17,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,

  // Font weights (as strings for RN)
  regular:    '400' as const,
  medium:     '500' as const,
  semibold:   '600' as const,
  bold:       '700' as const,
  extrabold:  '800' as const,

  // Line heights
  tight:  1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export const Spacing = {
  '0':   0,
  '1':   4,
  '2':   8,
  '3':   12,
  '4':   16,
  '5':   20,
  '6':   24,
  '8':   32,
  '10':  40,
  '12':  48,
  '14':  56,
  '16':  64,
} as const;

export const Radii = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadows = {
  none: {},
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;

// Convenience: card base style object
export const cardBase = {
  backgroundColor: Colors.surface,
  borderRadius: Radii.xl,
  borderWidth: 1,
  borderColor: Colors.gray100,
  ...Shadows.sm,
} as const;