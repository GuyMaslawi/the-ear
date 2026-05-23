import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DropFlowParamList } from '../navigation/RootNavigator';
import { MapErrorBoundary, MapFallbackNotice } from '../components/MapErrorBoundary';
import { DropMapMarker } from '../components/DropMapMarker';
import { colors } from '../theme/colors';
import { Button } from '../components/ui/Button';
import type { Answer, Drop } from '../types/api';
import { closeOwnDrop, ensureAnonymousSession, fetchAnswers, fetchDrop } from '../lib/api';
import { hideAnswer, hideDrop, useHiddenContent } from '../lib/hiddenContent';
import { apiUserMessageHeAuto } from '../lib/apiErrors';
import { connectSocket, getSocket } from '../lib/socket';
import { categoryHe } from '../lib/categories';
import { formatRelativeTimeHe, freshnessLabelHe } from '../lib/relativeTime';
import { trustLabelHe } from '../lib/simulatedIntel';
import { quickStatusLabel } from '../lib/answerOptions';
import { canUserAnswerDrop, blockedReasonHe } from '../lib/answerEligibility';
import type { LocationSource } from '../lib/devLocation';

type Props = NativeStackScreenProps<DropFlowParamList, 'DropDetails'>;

export function DropDetailsScreen({ navigation, route }: Props) {
  const { dropId, cachedDrop } = route.params;
  const { hiddenAnswerIds } = useHiddenContent();
  const [drop, setDrop] = useState<Drop | null>(cachedDrop ?? null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fetchErrorMsg, setFetchErrorMsg] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; source: LocationSource } | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<string>(
    () => cachedDrop?.createdAt ?? new Date().toISOString(),
  );
  const [justNow, setJustNow] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await ensureAnonymousSession();
      const [dRes, aRes] = await Promise.allSettled([
        fetchDrop(dropId),
        fetchAnswers(dropId),
      ]);

      let hadApiFailure = false;
      let firstErr: unknown;

      if (dRes.status === 'fulfilled') {
        setDrop(dRes.value);
        setLastUpdateAt(new Date().toISOString());
      } else {
        hadApiFailure = true;
        firstErr = dRes.reason;
        if (cachedDrop?.id === dropId) {
          setDrop(cachedDrop);
          setLastUpdateAt(cachedDrop.createdAt);
        }
      }

      if (aRes.status === 'fulfilled') {
        setAnswers(aRes.value);
      } else {
        hadApiFailure = true;
        if (firstErr === undefined) firstErr = aRes.reason;
      }

      if (hadApiFailure) {
        setFetchError(true);
        setFetchErrorMsg(
          apiUserMessageHeAuto(firstErr ?? new Error('בקשה נכשלה')),
        );
      } else {
        setFetchError(false);
        setFetchErrorMsg(null);
      }
    } catch (e) {
      setFetchError(true);
      setFetchErrorMsg(apiUserMessageHeAuto(e));
      if (cachedDrop?.id === dropId) {
        setDrop(cachedDrop);
        setLastUpdateAt(cachedDrop.createdAt);
      }
    } finally {
      setLoading(false);
    }
  }, [dropId, cachedDrop]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setUserPos((p) => (p ? { ...p, source: 'denied' } : { lat: 0, lng: 0, source: 'denied' }));
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setUserPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'gps',
          });
        }
      } catch {
        if (!cancelled) setUserPos((p) => (p ? { ...p, source: 'unavailable' } : { lat: 0, lng: 0, source: 'unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drop]);

  useEffect(() => {
    let cancelled = false;
    const onUpd = () => {
      setLastUpdateAt(new Date().toISOString());
      setJustNow(true);
      setTimeout(() => setJustNow(false), 2400);
      void reload();
    };
    void connectSocket()
      .then((s) => {
        if (cancelled) return;
        s.emit('drop:join', { dropId });
        s.on('drop_updated', onUpd);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      const s = getSocket();
      if (s) {
        s.emit('drop:leave', { dropId });
        s.off('drop_updated', onUpd);
      }
    };
  }, [dropId, reload]);

  const effectiveAnswerCount = Math.max(answers.length, drop?.answerCount ?? 0);
  const trust = trustLabelHe(effectiveAnswerCount);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const latestAnswerIso = answers.length
    ? answers.reduce(
        (acc, a) =>
          new Date(a.createdAt).getTime() > new Date(acc).getTime() ? a.createdAt : acc,
        answers[0]!.createdAt,
      )
    : null;
  const latestActivityIso = latestAnswerIso ?? lastUpdateAt;
  const freshness = freshnessLabelHe(latestActivityIso, nowMs);
  const latestAnswerAgeMin = latestAnswerIso
    ? Math.max(0, Math.floor((nowMs - new Date(latestAnswerIso).getTime()) / 60_000))
    : null;

  const openReportDrop = useCallback(() => {
    navigation.navigate('ReportContent', { targetType: 'drop', targetId: dropId });
  }, [navigation, dropId]);

  const confirmHideDrop = useCallback(() => {
    Alert.alert(
      'הסתרת תוכן',
      'השאלה הזו לא תופיע יותר ברשימות שלך במכשיר.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הסתר',
          style: 'destructive',
          onPress: () => {
            void hideDrop(dropId).then(() => navigation.goBack());
          },
        },
      ],
    );
  }, [navigation, dropId]);

  const confirmCloseOwn = useCallback(() => {
    Alert.alert(
      'סגירת שאלה',
      'בטוח לסגור את השאלה? היא לא תופיע יותר לאנשים באזור.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'סגור שאלה',
          style: 'destructive',
          onPress: async () => {
            try {
              await ensureAnonymousSession();
              await closeOwnDrop(dropId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('לא הצלחנו לסגור', apiUserMessageHeAuto(e));
            }
          },
        },
      ],
    );
  }, [navigation, dropId]);

  const openMenu = useCallback(() => {
    const isMine = !!drop?.isMine;
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      { text: 'דווח', onPress: openReportDrop },
      { text: 'הסתר תוכן כזה', onPress: confirmHideDrop },
    ];
    if (isMine) {
      buttons.push({ text: 'סגור שאלה', style: 'destructive', onPress: confirmCloseOwn });
    }
    buttons.push({ text: 'ביטול', style: 'cancel' });
    Alert.alert('פעולות', undefined, buttons);
  }, [drop?.isMine, openReportDrop, confirmHideDrop, confirmCloseOwn]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={openMenu}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="פעולות נוספות"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 8 })}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
        </Pressable>
      ),
    });
  }, [navigation, openMenu]);

  const reportAnswer = useCallback(
    (answerId: string) => {
      navigation.navigate('ReportContent', { targetType: 'answer', targetId: answerId });
    },
    [navigation],
  );

  const hideAnswerLocal = useCallback((answerId: string) => {
    void hideAnswer(answerId);
  }, []);

  if (loading && !drop) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.electricBright} />
      </View>
    );
  }

  if (!drop) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>לא נמצא</Text>
      </View>
    );
  }

  const [lng, lat] = drop.location.coordinates;
  const eligibility = canUserAnswerDrop({ drop, userCoords: userPos });
  const distanceFromUser = eligibility.distanceMeters ?? null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.navy }}
      contentContainerStyle={{ paddingBottom: 36 }}
    >
      <View style={styles.mapBox}>
        <MapErrorBoundary
          fallback={
            <View style={styles.mapFallback}>
              <MapFallbackNotice />
              <Text style={styles.coords}>
                {lat.toFixed(4)}, {lng.toFixed(4)} · רדיוס {drop.radiusMeters}מ׳
              </Text>
            </View>
          }
        >
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            scrollEnabled={false}
            userInterfaceStyle="dark"
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} tracksViewChanges={false}>
              <DropMapMarker drop={drop} compact live={false} />
            </Marker>
            <Circle
              center={{ latitude: lat, longitude: lng }}
              radius={drop.radiusMeters}
              strokeColor="rgba(59,130,246,0.65)"
              fillColor="rgba(37,99,235,0.12)"
            />
          </MapView>
        </MapErrorBoundary>
      </View>

      {fetchError ? (
        <View style={[styles.errorBanner, drop ? styles.errorBannerSoft : null]}>
          <Text style={styles.errorBannerTitle}>לא הצלחנו לעדכן כרגע</Text>
          <Text style={styles.errorBannerSub}>
            {fetchErrorMsg ??
              (drop
                ? 'משאירים את המידע שכבר הוצג. אפשר לנסות שוב.'
                : 'נסה שוב בעוד רגע.')}
          </Text>
          <Button
            label="נסה שוב"
            icon="refresh"
            variant="ghost"
            size="md"
            fullWidth={false}
            onPress={() => void reload()}
            style={styles.errorBannerRetry}
          />
        </View>
      ) : null}

      {justNow ? (
        <View style={styles.justNowRow}>
          <View style={styles.justNowDot} />
          <Text style={styles.justNowText}>עודכן עכשיו</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statVal}>{effectiveAnswerCount}</Text>
          <Text style={styles.statLbl}>תשובות</Text>
        </View>
        <View style={styles.statPillWide}>
          <Text style={styles.statLbl}>עדכון אחרון</Text>
          <Text style={styles.statTime}>{formatRelativeTimeHe(latestActivityIso, nowMs)}</Text>
          <Text
            style={[
              styles.statFreshness,
              freshness.level === 'live' && styles.freshnessLive,
              freshness.level === 'fresh' && styles.freshnessFresh,
              freshness.level === 'stale' && styles.freshnessStale,
              freshness.level === 'outdated' && styles.freshnessOutdated,
            ]}
          >
            {freshness.label}
          </Text>
        </View>
      </View>

      <View style={styles.trustRow}>
        <Text
          style={[
            styles.trustText,
            trust.level === 'high' && styles.trustHigh,
            trust.level === 'mid' && styles.trustMid,
            trust.level === 'low' && styles.trustLow,
          ]}
        >
          {trust.label}
        </Text>
      </View>

      <View style={styles.block}>
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{categoryHe(drop.category)}</Text>
          </View>
          <View style={styles.pillMuted}>
            <Text style={styles.pillMutedText}>{effectiveAnswerCount} תשובות פעילות</Text>
          </View>
        </View>
        <Text style={styles.q}>{drop.question}</Text>
        <Text style={styles.meta}>
          רדיוס כיסוי: {drop.radiusMeters}מ׳
          {distanceFromUser != null ? ` · מרחק משוער ממך: ~${distanceFromUser}מ׳` : ''}
        </Text>
      </View>

      <View style={styles.ai}>
        <Text style={styles.aiTitle}>סיכום חי מהשטח</Text>
        <Text style={styles.aiBody}>
          {drop.aiSummary
            ? drop.aiSummary
            : effectiveAnswerCount === 0
              ? 'מחפש מי שמשיב מהשטח · בדרך כלל מקבלים עדכון תוך כמה דקות'
              : latestAnswerAgeMin != null && latestAnswerAgeMin <= 10
                ? `מבוסס על ${effectiveAnswerCount} תשובות מהשטח. העדכון האחרון התקבל ${formatRelativeTimeHe(latestActivityIso, nowMs)}.`
                : `מבוסס על ${effectiveAnswerCount} תשובות מהשטח. לא התקבלו עדכונים בדקות האחרונות.`}
        </Text>
        {drop.confidenceScore > 0 ? (
          <Text style={styles.aiMeta}>ביטחון מודל: {(drop.confidenceScore * 100).toFixed(0)}%</Text>
        ) : null}
      </View>

      {eligibility.canAnswer ? (
        <Button
          label="אני כאן עכשיו — ענה"
          icon="navigate"
          variant="success"
          onPress={() => navigation.navigate('AnswerDrop', { dropId, cachedDrop: drop })}
          style={styles.answerCta}
        />
      ) : (
        <View
          style={[
            styles.blockedBanner,
            eligibility.reason === 'own_drop' && styles.blockedBannerOwner,
          ]}
        >
          <Text style={styles.blockedBannerText}>
            {blockedReasonHe(eligibility.reason, eligibility.distanceMeters)}
          </Text>
        </View>
      )}

      <Text style={styles.section}>תשובות מהשטח</Text>

      {answers.filter((a) => !hiddenAnswerIds.has(a.id)).length === 0 ? (
        <Text style={styles.emptyAnswers}>
          אין תשובות עדיין — היה הראשון לענות
        </Text>
      ) : null}

      {answers
        .filter((a) => !hiddenAnswerIds.has(a.id))
        .map((a) => (
          <View key={a.id} style={styles.answerRow}>
            <View style={styles.answerTop}>
              <View style={styles.answerBody}>
                <Text style={styles.answerStatus}>
                  {quickStatusLabel(a.quickStatus, drop.category, drop.question)}
                </Text>
                {a.text && a.text !== '—' ? <Text style={styles.answerText}>{a.text}</Text> : null}
                <Text style={styles.answerMeta}>
                  ~{a.distanceFromDrop}מ׳ מהמרכז · {formatRelativeTimeHe(a.createdAt, nowMs)}
                </Text>
                <View style={styles.answerActions}>
                  <Pressable
                    onPress={() => reportAnswer(a.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="דווח על תשובה"
                  >
                    <Text style={styles.answerActionLink}>דווח</Text>
                  </Pressable>
                  <Text style={styles.answerActionSep}>·</Text>
                  <Pressable
                    onPress={() => hideAnswerLocal(a.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="הסתר תשובה"
                  >
                    <Text style={styles.answerActionLink}>הסתר</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  mapBox: { height: 200, marginHorizontal: 12, marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  map: { flex: 1 },
  mapFallback: {
    flex: 1,
    backgroundColor: colors.navyMuted,
    justifyContent: 'center',
    padding: 12,
  },
  coords: { color: colors.textSecondary, marginTop: 8, fontSize: 12, textAlign: 'right' },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
  errorBannerSoft: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(248, 113, 113, 0.22)',
  },
  errorBannerTitle: {
    color: '#FECACA',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorBannerSub: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorBannerRetry: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  justNowRow: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
  },
  justNowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  justNowText: { color: '#BBF7D0', fontWeight: '900', fontSize: 13 },
  statsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  statPill: {
    minWidth: 76,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.bubble,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    alignItems: 'center',
  },
  statPillWide: {
    flexGrow: 1,
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'flex-end',
  },
  statVal: { color: colors.white, fontWeight: '900', fontSize: 18 },
  statLbl: { color: colors.textSecondary, fontSize: 11, marginTop: 2, fontWeight: '700' },
  statTime: { color: colors.electricBright, fontSize: 14, fontWeight: '800', marginTop: 2 },
  statFreshness: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  freshnessLive: { color: '#86EFAC' },
  freshnessFresh: { color: '#BBF7D0' },
  freshnessStale: { color: '#FDE047' },
  freshnessOutdated: { color: colors.textSecondary },
  trustRow: { marginHorizontal: 16, marginTop: 10, alignItems: 'flex-end' },
  trustText: { fontSize: 12, fontWeight: '800' },
  trustHigh: { color: '#86EFAC' },
  trustMid: { color: '#FDE047' },
  trustLow: { color: colors.textSecondary },
  block: { padding: 16, alignItems: 'flex-end' },
  pillRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  pillText: { color: colors.electricBright, fontWeight: '800', fontSize: 12 },
  pillMuted: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillMutedText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  q: { color: colors.white, fontSize: 19, fontWeight: '900', textAlign: 'right' },
  meta: { color: colors.textSecondary, marginTop: 10, textAlign: 'right', fontSize: 13, lineHeight: 18 },
  ai: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.bubble,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  aiTitle: { color: colors.electricBright, fontWeight: '900', marginBottom: 8, textAlign: 'right' },
  aiBody: { color: colors.white, lineHeight: 22, textAlign: 'right' },
  aiMeta: { color: colors.textSecondary, marginTop: 8, fontSize: 12, textAlign: 'right' },
  answerCta: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  blockedBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  blockedBannerOwner: {
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderColor: 'rgba(147, 197, 253, 0.45)',
  },
  blockedBannerText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  section: {
    color: colors.white,
    fontWeight: '900',
    marginTop: 22,
    marginHorizontal: 16,
    marginBottom: 8,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  emptyAnswers: {
    color: colors.textSecondary,
    marginHorizontal: 16,
    marginBottom: 10,
    textAlign: 'right',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  answerRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.navyMuted,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  answerTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  answerBody: { flex: 1, alignItems: 'flex-end' },
  answerStatus: { color: colors.electricBright, fontWeight: '800', marginBottom: 4, textAlign: 'right', fontSize: 15 },
  answerText: { color: colors.white, textAlign: 'right' },
  answerMeta: { color: colors.textSecondary, marginTop: 6, fontSize: 12, textAlign: 'right' },
  answerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  answerActionLink: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  answerActionSep: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  muted: { color: colors.textSecondary, marginHorizontal: 16, textAlign: 'right' },
});
