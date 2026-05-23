import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootTabParamList, MyStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import { palette } from '../theme/theme';
import { PressableScale } from '../components/ui/PressableScale';
import { Button } from '../components/ui/Button';
import type { Drop } from '../types/api';
import { ensureAnonymousSession, fetchMyDrops } from '../lib/api';
import { apiUserMessageHeAuto } from '../lib/apiErrors';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';
import { formatRelativeTimeHe, freshnessLabelHe } from '../lib/relativeTime';
import { useHiddenContent } from '../lib/hiddenContent';

type Props = NativeStackScreenProps<MyStackParamList, 'MyQuestions'>;

function SkeletonRows() {
  return (
    <View style={{ paddingVertical: 8, gap: 12 }}>
      {[0, 1, 2].map((k) => (
        <View key={k} style={styles.skeletonCard}>
          <View style={[styles.skLine, { width: '72%' }]} />
          <View style={[styles.skLine, styles.skShort]} />
          <View style={[styles.skLine, styles.skMuted]} />
        </View>
      ))}
    </View>
  );
}

function ErrorEmptyCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.softErrorStandalone}>
      <Text style={styles.softErrorTitle}>לא הצלחנו לטעון את הרשימה</Text>
      <Text style={styles.softErrorSub}>{message}</Text>
      <Button label="נסה שוב" icon="refresh" onPress={onRetry} style={styles.cardCtaSpacing} />
    </View>
  );
}

function FriendlyEmptyCard({ onAsk }: { onAsk: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>עדיין אין פה שאלות</Text>
      <Text style={styles.emptySub}>
        כשתפתח שאלה מהמפה, היא תופיע פה — יחד עם תשובות מהשטח בזמן אמת.
      </Text>
      <Button label="שאל מהמפה" icon="map" onPress={onAsk} style={styles.cardCtaSpacing} />
    </View>
  );
}

function statusShortHe(drop: Drop, nowMs: number): string {
  if (drop.status === 'EXPIRED') return 'נסגרה';
  if (drop.status === 'CLOSED') return 'נסגרה';
  if (drop.status === 'RESOLVED') return 'טופלה';
  if (drop.status === 'ACTIVE') {
    if (drop.answerCount > 0) return `יש ${drop.answerCount} תשובות`;
    const expiresMs = new Date(drop.expiresAt).getTime();
    if (Number.isFinite(expiresMs) && expiresMs - nowMs <= 10 * 60_000 && expiresMs - nowMs > 0) {
      return 'נסגרת בקרוב';
    }
    return 'ממתינה לתשובות';
  }
  return drop.status;
}

function statusColor(drop: Drop, nowMs: number): string {
  if (drop.status === 'RESOLVED') return palette.primaryBright;
  if (drop.status === 'EXPIRED') return palette.textMuted;
  if (drop.status === 'CLOSED') return palette.textMuted;
  if (drop.status === 'ACTIVE') {
    if (drop.answerCount > 0) return palette.live;
    const expiresMs = new Date(drop.expiresAt).getTime();
    if (Number.isFinite(expiresMs) && expiresMs - nowMs <= 10 * 60_000 && expiresMs - nowMs > 0) {
      return '#FDE047';
    }
    return palette.textMuted;
  }
  return palette.textMuted;
}

export function MyQuestionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { hiddenDropIds } = useHiddenContent();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const dropsRef = useRef<Drop[]>([]);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    dropsRef.current = drops;
  }, [drops]);

  const load = useCallback(async (fromRefresh = false) => {
    const hadData = dropsRef.current.length > 0;
    if (fromRefresh) setRefreshing(true);
    else {
      setLoadingFirst(true);
    }
    if (hadData) setErrorMsg(null);
    try {
      await ensureAnonymousSession();
      const list = await fetchMyDrops();
      setDrops(list);
      setError(false);
      setErrorMsg(null);
    } catch (e) {
      setError(true);
      setErrorMsg(apiUserMessageHeAuto(e));
    } finally {
      setLoadingFirst(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const hadData = dropsRef.current.length > 0;
      void load(hadData);
    }, [load]),
  );

  const sorted = useMemo(
    () =>
      [...drops]
        .filter((d) => !hiddenDropIds.has(d.id))
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [drops, hiddenDropIds],
  );

  const openDrop = useCallback(
    (d: Drop) => navigation.navigate('DropDetails', { dropId: d.id, cachedDrop: d }),
    [navigation],
  );

  const askOnMapTab = () => {
    const tabNav = navigation.getParent() as BottomTabNavigationProp<RootTabParamList> | undefined;
    tabNav?.navigate('MapStack', { screen: 'Map', params: {} });
  };

  const errorBannerInline = !!(error && sorted.length > 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>השאלות שלי</Text>
        <PressableScale
          haptic="none"
          hitSlop={10}
          onPress={() => navigation.navigate('About')}
          accessibilityRole="button"
          accessibilityLabel="מידע, פרטיות ובטיחות"
        >
          <Text style={styles.aboutLink}>מידע, פרטיות ובטיחות</Text>
        </PressableScale>
      </View>
      <Text style={styles.screenSub}>
        שאלות שפתחת — ותשובות שקיבלת מהשטח בזמן אמת.
      </Text>

      {errorBannerInline ? (
        <View style={styles.softError}>
          <Text style={styles.softErrorTitle}>לא עודכנה הרשימה</Text>
          <Text style={styles.softErrorSub}>
            {errorMsg ?? 'נסה שוב בעוד רגע.'}
          </Text>
          <Button
            label="נסה שוב"
            icon="refresh"
            variant="ghost"
            size="md"
            fullWidth={false}
            onPress={() => load(false)}
            style={styles.cardCtaSpacing}
          />
        </View>
      ) : null}

      <FlatList
        data={sorted}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.electricBright}
          />
        }
        ListEmptyComponent={
          loadingFirst ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorEmptyCard
              message={errorMsg ?? 'בדוק חיבור ונסה שוב.'}
              onRetry={() => load(false)}
            />
          ) : (
            <FriendlyEmptyCard onAsk={askOnMapTab} />
          )
        }
        renderItem={({ item }) => {
          const sColor = statusColor(item, nowMs);
          const sLabel = statusShortHe(item, nowMs);
          const fresh = freshnessLabelHe(item.createdAt, nowMs);
          return (
            <PressableScale
              style={styles.card}
              onPress={() => openDrop(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.question} — ${sLabel}`}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardIcon}>{categoryMarkerIcon[item.category]}</Text>
                <Text style={styles.cat}>{categoryHe(item.category)}</Text>
                <View style={[styles.statusPill, { borderColor: sColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: sColor }]} />
                  <Text style={[styles.statusText, { color: sColor }]}>{sLabel}</Text>
                </View>
              </View>
              <Text style={styles.q} numberOfLines={2}>
                {item.question}
              </Text>
              <View style={styles.cardFooter}>
                <Ionicons name="chevron-back" size={16} color={palette.textMuted} />
                <Text style={styles.meta}>
                  {fresh.label} · {formatRelativeTimeHe(item.createdAt, nowMs)}
                </Text>
              </View>
            </PressableScale>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  aboutLink: {
    color: colors.electricBright,
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 6,
    paddingVertical: 4,
    writingDirection: 'rtl',
  },
  screenSub: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 8,
    marginBottom: 16,
    fontWeight: '600',
  },
  skeletonCard: {
    backgroundColor: colors.navyMuted,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
    marginBottom: 4,
  },
  skLine: {
    height: 13,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-end',
  },
  skShort: {
    width: '48%',
  },
  skMuted: {
    width: '60%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listContent: {
    paddingBottom: 96,
    flexGrow: 1,
  },
  softError: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    padding: 14,
    marginBottom: 12,
  },
  softErrorStandalone: {
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: colors.navyMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  softErrorTitle: {
    color: '#FECACA',
    fontWeight: '900',
    fontSize: 17,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  softErrorSub: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
    fontWeight: '600',
  },
  cardCtaSpacing: { marginTop: 8, alignSelf: 'flex-start' },
  emptyWrap: {
    justifyContent: 'center',
    paddingVertical: 20,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: colors.navyMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    paddingHorizontal: 16,
    alignItems: 'stretch',
  },
  emptyTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 10,
    fontWeight: '600',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.navyMuted,
    borderRadius: 18,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairlineStrong,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: { fontSize: 15 },
  cat: {
    color: colors.electricBright,
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'right',
    flex: 1,
    writingDirection: 'rtl',
  },
  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  q: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    color: colors.textMuted,
    marginTop: 10,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
});
