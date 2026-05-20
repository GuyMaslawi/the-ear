import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Drop } from '../types/api';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';

type Props = {
  drop: Drop;
  compact?: boolean;
  /** Pulse + “live” halo for active intel */
  live?: boolean;
  /** Play a short scale-in (e.g. user just posted) */
  animateEntrance?: boolean;
};

export function DropMapMarker({ drop, compact, live = true, animateEntrance }: Props) {
  const icon = categoryMarkerIcon[drop.category] ?? '●';
  const cat = categoryHe(drop.category);
  const count = drop.answerCount;
  const pulse = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(animateEntrance ? 0.35 : 1)).current;

  useEffect(() => {
    if (!live || compact) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, compact, pulse]);

  useEffect(() => {
    if (!animateEntrance || compact) {
      scale.setValue(1);
      return undefined;
    }
    scale.setValue(0.4);
    const a = Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [animateEntrance, compact, scale]);

  if (compact) {
    return (
      <Animated.View
        style={[styles.wrapCompact, { transform: [{ scale }] } as const]}
        accessibilityLabel={`drop-marker-${drop.id}-compact`}
      >
        <View style={styles.ringCompact}>
          <View style={styles.coreCompact}>
            <Text style={styles.iconCompact}>{icon}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ scale }] } as const]}
      accessibilityLabel={`drop-marker-${drop.id}`}
    >
      <View style={styles.glowHalo} />
      <View style={styles.ring}>
        <View style={styles.core}>
          <Text style={styles.icon}>{icon}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        </View>
        {live ? (
          <Animated.View style={[styles.liveDotWrap, { opacity: pulse }]}>
            <View style={styles.liveDot} />
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.tail}>
        <Text style={styles.catLabel} numberOfLines={1}>
          {cat}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapCompact: { alignItems: 'center', justifyContent: 'center' },
  ringCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(147, 197, 253, 0.85)',
    backgroundColor: 'rgba(11, 20, 38, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(37, 99, 235, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCompact: { color: colors.white, fontSize: 14, fontWeight: '900' },
  wrap: { alignItems: 'center' },
  glowHalo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    top: -2,
  },
  ring: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(147, 197, 253, 0.95)',
    backgroundColor: 'rgba(11, 20, 38, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  core: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    end: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.electricBright,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badgeText: {
    color: colors.navy,
    fontSize: 10,
    fontWeight: '900',
  },
  liveDotWrap: {
    position: 'absolute',
    bottom: -2,
    start: -2,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  tail: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(11, 20, 38, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.45)',
  },
  catLabel: {
    color: colors.electricBright,
    fontSize: 10,
    fontWeight: '800',
    maxWidth: 72,
    textAlign: 'center',
  },
});
