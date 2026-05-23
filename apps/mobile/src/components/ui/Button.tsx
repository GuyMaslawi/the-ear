import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import { tapMedium, notifySuccess } from '../../lib/haptics';
import { gradients, palette, radius, glow, type, space, HIT_TARGET } from '../../theme/theme';

type Variant = 'primary' | 'success' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  /** Ionicons name, rendered before the label (RTL: visually trailing). */
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's primary call-to-action. Gradient fill + colored glow for the
 * `primary`/`success` variants; a quiet outlined treatment for `ghost`.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: Props) {
  const isGhost = variant === 'ghost';
  const height = size === 'lg' ? 54 : HIT_TARGET;
  const gradientColors =
    variant === 'success' ? gradients.live : gradients.primary;

  const inner = (
    <View style={[styles.content, { height }]}>
      {loading ? (
        <ActivityIndicator color={isGhost ? palette.primaryBright : palette.onPrimary} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'lg' ? 20 : 18}
              color={isGhost ? palette.primaryBright : palette.onPrimary}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              size === 'lg' ? type.headline : type.callout,
              { color: isGhost ? palette.primaryBright : palette.onPrimary },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={() => {
        if (disabled || loading) return;
        if (variant === 'success') notifySuccess();
        else tapMedium();
        onPress();
      }}
      haptic="none"
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[fullWidth ? styles.fullWidth : null, style]}
    >
      {isGhost ? (
        <View style={[styles.ghost, { height, borderRadius: radius.lg }]}>{inner}</View>
      ) : (
        <View style={[variant === 'success' ? glow.success : glow.primary, { borderRadius: radius.lg }]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: radius.lg }]}
          >
            {inner}
          </LinearGradient>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
  },
  gradient: {
    overflow: 'hidden',
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: palette.hairlineStrong,
    backgroundColor: palette.primaryDim,
    overflow: 'hidden',
  },
  label: {
    writingDirection: 'rtl',
  },
});
