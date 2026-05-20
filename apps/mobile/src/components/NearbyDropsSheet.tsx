import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import type { Drop } from '../types/api';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';
import { formatRelativeTimeHe } from '../lib/relativeTime';

type Props = {
  drops: Drop[];
  loading: boolean;
  onSelect: (d: Drop) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  onAsk: () => void;
  onLiveFeed: () => void;
  nowMs: number;
  /** Empty list copy (API vs location vs default). */
  emptyHint?: string;
  /** Short line explaining map vs pin behavior (map screen). */
  areaHint?: string;
};

function LivePulse() {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, {
          toValue: 0.25,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(o, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View style={[styles.pulseOuter, { opacity: o }]}>
      <View style={styles.pulse} />
    </Animated.View>
  );
}

export function NearbyDropsSheet({
  drops,
  loading,
  onSelect,
  onRefresh,
  refreshing = false,
  onAsk,
  onLiveFeed,
  nowMs,
  emptyHint,
  areaHint,
}: Props) {
  const insets = useSafeAreaInsets();

  const listRefreshing = !!(refreshing || loading);

  return (
    <View
      style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
      accessibilityLabel="nearby-drops-sheet"
    >
      <View style={styles.handle} />

      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>מה תרצה לדעת כאן?</Text>
          <Pressable onPress={onRefresh} hitSlop={12} style={styles.refreshGhost}>
            <Text style={styles.refreshGhostText}>רענן</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          שאל אנשים שנמצאים באזור וקבל תשובה מהשטח
        </Text>

        {areaHint ? <Text style={styles.areaHint}>{areaHint}</Text> : null}

        <View style={styles.ctaRow}>
          <Pressable
            style={styles.ctaPrimary}
            onPress={onAsk}
            accessibilityRole="button"
            accessibilityLabel="שאל כאן לפי המפה או נקודה שנבחרה"
          >
            <Text style={styles.ctaPrimaryText}>שאל כאן</Text>
          </Pressable>
          <Pressable
            style={styles.ctaSecondary}
            onPress={onLiveFeed}
            accessibilityRole="button"
            accessibilityLabel="בקשות פעילות באזור"
          >
            <View style={styles.liveDot} />
            <Text style={styles.ctaSecondaryText}>בקשות פעילות באזור</Text>
          </Pressable>
        </View>
      </View>

      {loading && drops.length === 0 ? (
        <ActivityIndicator color={colors.electricBright} style={{ marginVertical: 16 }} />
      ) : (
        <FlatList
          data={drops}
          keyExtractor={(item) => item.id}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={listRefreshing && drops.length > 0}
              onRefresh={onRefresh}
              tintColor={colors.electricBright}
            />
          }
          contentContainerStyle={drops.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {emptyHint ??
                'אין שאלות פעילות בקרבת מקום כרגע — נסה להזיז את המפה או לרענן.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onSelect(item)}>
              <View style={styles.bubble}>
                <View style={styles.bubbleHeader}>
                  <Text style={styles.catIcon}>{categoryMarkerIcon[item.category]}</Text>
                  <Text style={styles.cat}>{categoryHe(item.category)}</Text>
                  <LivePulse />
                </View>
                <Text style={styles.q} numberOfLines={2}>
                  {item.question}
                </Text>
                <Text style={styles.meta}>
                  {formatRelativeTimeHe(item.createdAt, nowMs)} · {item.answerCount} תשובות
                  · רדיוס {item.radiusMeters}מ׳
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '38%',
    backgroundColor: colors.navy,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 10,
    marginBottom: 10,
  },
  headerBlock: {
    alignItems: 'flex-end',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  title: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'right',
    alignSelf: 'stretch',
    lineHeight: 18,
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  areaHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
    alignSelf: 'stretch',
    lineHeight: 16,
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row-reverse',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 12,
  },
  ctaPrimary: {
    flex: 1,
    backgroundColor: colors.electric,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaPrimaryText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  ctaSecondary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.5)',
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  ctaSecondaryText: {
    color: '#DCFCE7',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  refreshGhost: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.35)',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  refreshGhostText: { color: colors.electricBright, fontWeight: '700', fontSize: 11 },
  list: { flexGrow: 0 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingVertical: 20,
    paddingHorizontal: 12,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '700',
  },
  row: { marginBottom: 10 },
  bubble: {
    backgroundColor: colors.bubble,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  bubbleHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  catIcon: { fontSize: 14 },
  cat: {
    flex: 1,
    color: colors.electricBright,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pulseOuter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  q: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
});
