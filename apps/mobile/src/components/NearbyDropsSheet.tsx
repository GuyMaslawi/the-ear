import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { PressableScale } from './ui/PressableScale';
import { Button } from './ui/Button';
import { tapLight } from '../lib/haptics';
import type { Drop } from '../types/api';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';
import { formatRelativeTimeHe, freshnessLabelHe } from '../lib/relativeTime';

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
          <Text style={styles.title}>מה קורה כאן עכשיו</Text>
          <PressableScale
            haptic="none"
            onPress={() => {
              tapLight();
              onRefresh();
            }}
            hitSlop={12}
            style={styles.refreshGhost}
            accessibilityRole="button"
            accessibilityLabel="רענן רשימה"
          >
            <Ionicons name="refresh" size={13} color={colors.electricBright} />
            <Text style={styles.refreshGhostText}>רענן</Text>
          </PressableScale>
        </View>

        <Text style={styles.subtitle}>
          עדכונים בזמן אמת מאנשים שנמצאים באזור
        </Text>

        {areaHint ? <Text style={styles.areaHint}>{areaHint}</Text> : null}

        <View style={styles.ctaRow}>
          <Button
            label="מה קורה עכשיו"
            icon="pulse"
            variant="success"
            size="md"
            onPress={onLiveFeed}
            style={styles.ctaPrimary}
          />
          <PressableScale
            haptic="none"
            style={styles.ctaSecondary}
            onPress={() => {
              tapLight();
              onAsk();
            }}
            accessibilityRole="button"
            accessibilityLabel="שאל כאן"
          >
            <Ionicons name="add-circle-outline" size={15} color={colors.electricBright} />
            <Text style={styles.ctaSecondaryText}>שאל כאן</Text>
          </PressableScale>
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
                'עדיין אין עדכונים מהשטח כאן · עוקבים בזמן אמת ונעדכן ברגע שמשהו קורה.'}
            </Text>
          }
          renderItem={({ item }) => {
            const verified = item.answerCount >= 1;
            const fresh = freshnessLabelHe(item.createdAt, nowMs);
            const freshStyle =
              fresh.level === 'live'
                ? styles.freshLive
                : fresh.level === 'fresh'
                  ? styles.freshFresh
                  : fresh.level === 'stale'
                    ? styles.freshStale
                    : styles.freshOutdated;
            return (
              <PressableScale
                style={styles.row}
                scaleTo={0.98}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={item.question}
              >
                <View style={styles.bubble}>
                  <View style={styles.bubbleHeader}>
                    <Text style={styles.catIcon}>{categoryMarkerIcon[item.category]}</Text>
                    <Text style={styles.cat}>{categoryHe(item.category)}</Text>
                    {verified ? (
                      <View style={styles.verifiedPill}>
                        <Text style={styles.verifiedPillText}>✓ מהשטח</Text>
                      </View>
                    ) : null}
                    {verified ? <LivePulse /> : null}
                  </View>
                  <Text style={styles.q} numberOfLines={2}>
                    {item.question}
                  </Text>
                  <Text style={styles.meta}>
                    {verified
                      ? `מהשטח · ${item.answerCount} משיבים · עודכן ${formatRelativeTimeHe(item.createdAt, nowMs)}`
                      : `ממתין לעדכון מהשטח · נפתח ${formatRelativeTimeHe(item.createdAt, nowMs)}`}
                    {'  '}
                    <Text style={freshStyle}>· {fresh.label}</Text>
                  </Text>
                </View>
              </PressableScale>
            );
          }}
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
    maxHeight: '55%',
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
    borderColor: colors.bubbleBorder,
    backgroundColor: colors.bubble,
  },
  ctaSecondaryText: {
    color: colors.electricBright,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  refreshGhost: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 11,
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
  verifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  verifiedPillText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '800',
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
  freshLive: { color: '#86EFAC', fontWeight: '800' },
  freshFresh: { color: '#BBF7D0', fontWeight: '800' },
  freshStale: { color: '#FDE047', fontWeight: '800' },
  freshOutdated: { color: colors.textMuted, fontWeight: '800' },
});
