import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { PressableScale } from './ui/PressableScale';
import { Button } from './ui/Button';
import { LivePulse } from './LivePulse';
import { tapLight } from '../lib/haptics';
import type { Drop } from '../types/api';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';
import { formatRelativeTimeHe, freshnessLabelHe } from '../lib/relativeTime';
import { askCtaLabelHe } from '../lib/nearbyCtaCopy';
import { styles } from './NearbyDropsSheet.styles';

type RowProps = {
  item: Drop;
  nowMs: number;
  onSelect: (d: Drop) => void;
};

const NearbyDropRow = memo(function NearbyDropRow({ item, nowMs, onSelect }: RowProps) {
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
});

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
  /** True when the user has picked a pin on the map (drives Ask CTA copy). */
  hasSelectedPoint?: boolean;
  /** Optional callback to clear the pin from inside the sheet header. */
  onClearSelectedPoint?: () => void;
};

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
  hasSelectedPoint = false,
  onClearSelectedPoint,
}: Props) {
  const insets = useSafeAreaInsets();

  const listRefreshing = !!(refreshing || loading);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Drop>) => (
      <NearbyDropRow item={item} nowMs={nowMs} onSelect={onSelect} />
    ),
    [nowMs, onSelect],
  );

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

        {hasSelectedPoint ? (
          <PressableScale
            haptic="none"
            onPress={() => {
              tapLight();
              onClearSelectedPoint?.();
            }}
            disabled={!onClearSelectedPoint}
            accessibilityRole="button"
            accessibilityLabel="הסר את הנקודה שנבחרה במפה"
            style={styles.selectedPill}
          >
            <Ionicons name="location" size={13} color={colors.electricBright} />
            <Text style={styles.selectedPillText}>נקודה נבחרה במפה</Text>
            <Ionicons name="close" size={13} color={colors.textMuted} />
          </PressableScale>
        ) : null}

        {areaHint ? <Text style={styles.areaHint}>{areaHint}</Text> : null}

        <View style={styles.ctaRow}>
          <Button
            label={askCtaLabelHe(hasSelectedPoint)}
            icon="add-circle"
            variant="primary"
            size="md"
            onPress={() => {
              onAsk();
            }}
            style={styles.ctaPrimary}
          />
          <PressableScale
            haptic="none"
            style={styles.ctaSecondary}
            onPress={() => {
              tapLight();
              onLiveFeed();
            }}
            accessibilityRole="button"
            accessibilityLabel="מה קורה עכשיו"
          >
            <Ionicons name="pulse" size={15} color={colors.electricBright} />
            <Text style={styles.ctaSecondaryText}>מה קורה עכשיו</Text>
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
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
