import { palette } from './theme';

/**
 * Legacy color aliases — kept so existing screens keep working while the app
 * migrates to the full design system in `theme.ts`. New code should import
 * tokens from `./theme` directly.
 */
export const colors = {
  navy: palette.bg,
  navyMuted: palette.surface,
  electric: palette.primary,
  electricBright: palette.primaryBright,
  white: palette.white,
  /** Body / secondary labels. */
  textSecondary: palette.textSecondary,
  /** Tertiary / captions. */
  textMuted: palette.textMuted,
  bubble: palette.primaryDim,
  bubbleBorder: 'rgba(91,141,255,0.45)',
  danger: palette.danger,
};

export { palette, gradients, space, radius, type, elevation, glow, motion, theme } from './theme';
