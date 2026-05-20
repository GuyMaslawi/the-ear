import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootTabParamList, MyStackParamList } from '../navigation/RootNavigator';
import { colors } from '../theme/colors';
import type { Drop } from '../types/api';
import { ensureAnonymousSession, fetchMyDrops } from '../lib/api';
import { apiUserMessageHeAuto } from '../lib/apiErrors';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';
import { formatRelativeTimeHe } from '../lib/relativeTime';

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
      <Pressable style={styles.softErrorBtnWide} onPress={onRetry}>
        <Text style={styles.softErrorBtnText}>נסה שוב</Text>
      </Pressable>
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
      <Pressable style={styles.emptyCta} onPress={onAsk}>
        <Text style={styles.emptyCtaText}>שאל מהמפה</Text>
      </Pressable>
    </View>
  );
}

function statusShortHe(drop: Drop): string {
  if (drop.status === 'ACTIVE') return 'פעילה עכשיו';
  if (drop.status === 'EXPIRED') return 'נסגרה';
  return drop.status === 'RESOLVED' ? 'טופלה' : drop.status;
}

export function MyQuestionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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
      [...drops].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [drops],
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
      <Text style={styles.screenTitle}>השאלות שלי</Text>
      <Text style={styles.screenSub}>
        שאלות שפתחת — ותשובות שקיבלת מהשטח בזמן אמת.
      </Text>

      {errorBannerInline ? (
        <View style={styles.softError}>
          <Text style={styles.softErrorTitle}>לא עודכנה הרשימה</Text>
          <Text style={styles.softErrorSub}>
            {errorMsg ?? 'נסה שוב בעוד רגע.'}
          </Text>
          <Pressable style={styles.softErrorBtn} onPress={() => load(false)}>
            <Text style={styles.softErrorBtnText}>נסה שוב</Text>
          </Pressable>
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
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openDrop(item)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardIcon}>{categoryMarkerIcon[item.category]}</Text>
              <Text style={styles.cat}>{categoryHe(item.category)}</Text>
            </View>
            <Text style={styles.q} numberOfLines={2}>
              {item.question}
            </Text>
            <Text style={styles.meta}>
              {formatRelativeTimeHe(item.createdAt, nowMs)} · {item.answerCount} תשובות ·{' '}
              {statusShortHe(item)}
            </Text>
          </Pressable>
        )}
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
  screenTitle: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'right',
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
  softErrorBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  softErrorBtnWide: {
    alignSelf: 'stretch',
    backgroundColor: colors.electric,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  softErrorBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
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
  emptyCta: {
    marginTop: 18,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.electric,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  emptyCtaText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.bubble,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
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
