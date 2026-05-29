import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { categoryHe } from '../lib/categories';
import { formatRelativeTimeHe } from '../lib/relativeTime';
import type { Drop } from '../types/api';

type Props = {
  drops: Drop[];
  onSelect: (d: Drop) => void;
  nowMs: number;
  emptyMessage: string;
  /** Reserved space at the bottom so list rows don't touch the overlaid sheet. */
  bottomInset?: number;
};

export function DropsListFallback({
  drops,
  onSelect,
  nowMs,
  emptyMessage,
  bottomInset = 200,
}: Props) {
  return (
    <ScrollView
      style={styles.listScroll}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
      keyboardShouldPersistTaps="handled"
    >
      {drops.length === 0 ? (
        <Text style={styles.listEmpty}>{emptyMessage}</Text>
      ) : (
        drops.map((d) => (
          <Pressable key={d.id} style={styles.listRow} onPress={() => onSelect(d)}>
            <Text style={styles.listQ} numberOfLines={2}>
              {d.question}
            </Text>
            <Text style={styles.listMeta}>
              {formatRelativeTimeHe(d.createdAt, nowMs)} · {d.answerCount} תשובות · רדיוס{' '}
              {d.radiusMeters}מ׳ · {categoryHe(d.category)}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  listEmpty: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  listRow: {
    backgroundColor: colors.bubble,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  listQ: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'right',
  },
  listMeta: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 12,
    textAlign: 'right',
  },
});
