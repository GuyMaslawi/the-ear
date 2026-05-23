import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { palette, space, radius, HIT_TARGET } from '../../theme/theme';
import { tapLight } from '../../lib/haptics';

type TabKey = 'MapStack' | 'NearbyStack' | 'MyStack';

const TAB_META: Record<
  TabKey,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }
> = {
  MapStack: { label: 'מפה', icon: 'map-outline', iconActive: 'map' },
  NearbyStack: { label: 'לידך', icon: 'pulse-outline', iconActive: 'pulse' },
  MyStack: { label: 'השאלות שלי', icon: 'albums-outline', iconActive: 'albums' },
};

function TabItem({
  routeKey,
  focused,
  onPress,
}: {
  routeKey: TabKey;
  focused: boolean;
  onPress: () => void;
}) {
  const meta = TAB_META[routeKey];
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 8,
    }).start();
  }, [focused, anim]);

  const iconScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const liftY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      hitSlop={6}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          { transform: [{ translateY: liftY }, { scale: iconScale }] },
        ]}
      >
        <Animated.View style={[styles.iconGlow, { opacity: anim }]} />
        <Ionicons
          name={focused ? meta.iconActive : meta.icon}
          size={24}
          color={focused ? palette.primaryBright : palette.textMuted}
        />
      </Animated.View>
      <Text
        style={[styles.label, { color: focused ? palette.primaryBright : palette.textMuted }]}
        numberOfLines={1}
      >
        {meta.label}
      </Text>
      <Animated.View style={[styles.dot, { opacity: anim, transform: [{ scale: anim }] }]} />
    </Pressable>
  );
}

/**
 * Custom bottom tab bar — frosted-glass surface, animated active state with a
 * soft glow and indicator dot. Haptic feedback on every switch.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.host, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 24}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.scrim} />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          return (
            <TabItem
              key={route.key}
              routeKey={route.name as TabKey}
              focused={focused}
              onPress={() => {
                tapLight();
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    overflow: 'hidden',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,15,31,0.82)',
  },
  row: {
    flexDirection: 'row',
    paddingTop: space.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: HIT_TARGET,
  },
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 44,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDim,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    backgroundColor: palette.primaryBright,
  },
});
