import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tapLight, tapMedium } from '../../lib/haptics';
import { motion } from '../../theme/theme';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far down to scale on press. */
  scaleTo?: number;
  /** Haptic intensity fired on press-in. `none` disables. */
  haptic?: 'light' | 'medium' | 'none';
  children: React.ReactNode;
};

/**
 * Pressable that springs down slightly while held. This single component is
 * what makes every tap in the app feel physical and responsive — the core of
 * the 2026 interaction model. Haptics fire on press-in by default.
 */
export function PressableScale({
  style,
  scaleTo = 0.96,
  haptic = 'light',
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number, duration: number) => {
    Animated.timing(scale, {
      toValue: to,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          animate(scaleTo, motion.fast);
          if (haptic === 'light') tapLight();
          else if (haptic === 'medium') tapMedium();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1, motion.base);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View
        style={[
          { transform: [{ scale }] },
          disabled ? { opacity: 0.45 } : null,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
