/**
 * The Ear — 2026 design system.
 *
 * One source of truth for color, space, type, radius, elevation and motion.
 * Screens should pull tokens from here rather than hard-coding values, so the
 * whole app can be re-skinned from a single file.
 */

/* ------------------------------------------------------------------ *
 * Palette
 * ------------------------------------------------------------------ */

export const palette = {
  /** App background — deepest layer. */
  bg: '#080F1F',
  /** Raised surface (cards, sheets). */
  surface: '#111D33',
  /** Surface one step higher (nested cards, inputs). */
  surfaceHigh: '#18263F',
  /** Hairline borders on dark surfaces. */
  hairline: 'rgba(148,163,184,0.16)',
  hairlineStrong: 'rgba(148,163,184,0.28)',

  /** Primary brand — electric blue. */
  primary: '#2F6BFF',
  primaryBright: '#5B8DFF',
  primaryDim: 'rgba(47,107,255,0.16)',

  /** Secondary accent — cyan, used in gradients for depth. */
  accent: '#22D3EE',
  /** Tertiary accent — violet, for gradients. */
  violet: '#8B5CF6',

  /** Status colors. */
  success: '#34D399',
  successDim: 'rgba(52,211,153,0.16)',
  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.14)',
  danger: '#FB7185',
  dangerDim: 'rgba(251,113,133,0.14)',

  /** Live / "happening now" pulse. */
  live: '#4ADE80',

  white: '#FFFFFF',
  /** Headlines / primary text. */
  text: '#F8FAFF',
  /** Body / secondary labels. */
  textSecondary: 'rgba(233,239,255,0.74)',
  /** Captions / tertiary. */
  textMuted: 'rgba(233,239,255,0.50)',
  /** On-primary text (over bright fills). */
  onPrimary: '#FFFFFF',
} as const;

/** Gradients — consumed by expo-linear-gradient `colors` prop. */
export const gradients = {
  /** Primary CTA fill. */
  primary: ['#3B82F6', '#2F6BFF', '#6366F1'] as const,
  /** Subtle ambient backdrop wash behind hero content. */
  backdrop: ['#0B1426', '#0E1A30', '#080F1F'] as const,
  /** Live / energetic accent. */
  live: ['#22D3EE', '#34D399'] as const,
  /** Glass card sheen (top-light → transparent). */
  glassSheen: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)'] as const,
} as const;

/* ------------------------------------------------------------------ *
 * Spacing — 4pt grid
 * ------------------------------------------------------------------ */

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

/* ------------------------------------------------------------------ *
 * Radius
 * ------------------------------------------------------------------ */

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 30,
  pill: 999,
} as const;

/* ------------------------------------------------------------------ *
 * Typography
 * ------------------------------------------------------------------ */

export const type = {
  /** Hero question text. */
  display: { fontSize: 28, lineHeight: 38, fontWeight: '800' as const },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800' as const },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '800' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  callout: { fontSize: 14, lineHeight: 20, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '800' as const },
} as const;

/* ------------------------------------------------------------------ *
 * Elevation — cross-platform shadow presets
 * ------------------------------------------------------------------ */

type Elevation = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

export const elevation: Record<'sm' | 'md' | 'lg' | 'xl', Elevation> = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  xl: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },
};

/** Colored glow — used to lift primary CTAs off the background. */
export const glow = {
  primary: {
    shadowColor: palette.primary,
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  success: {
    shadowColor: palette.success,
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

/* ------------------------------------------------------------------ *
 * Motion
 * ------------------------------------------------------------------ */

export const motion = {
  fast: 140,
  base: 240,
  slow: 380,
} as const;

/** Minimum interactive target — accessibility (Apple HIG / Material). */
export const HIT_TARGET = 44;

export const theme = {
  palette,
  gradients,
  space,
  radius,
  type,
  elevation,
  glow,
  motion,
} as const;

export type Theme = typeof theme;
