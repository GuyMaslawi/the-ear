import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
import { combineDropDetailsResults } from '../lib/dropDetailsState';
import { connectSocket, getSocket } from '../lib/socket';
import { categoryHe } from '../lib/categories';
import {
  formatRelativeTimeHe,
  freshnessLabelHe,
  hotIndicatorHe,
  remainingTimeHe,
} from '../lib/relativeTime';
import { formatDistanceHe } from '../lib/geo';
import { trustLabelHe } from '../lib/simulatedIntel';
import { quickStatusLabel } from '../lib/answerOptions';
import { canUserAnswerDrop, blockedReasonHe } from '../lib/answerEligibility';
import { shareDrop } from '../lib/shareDrop';
import { track } from '../lib/analytics';
import type { LocationSource } from '../lib/devLocation';
import type { Drop as DropType } from '../types/api';
import { styles } from './DropDetailsScreen.styles';

type Props = NativeStackScreenProps<DropFlowParamList, 'DropDetails'>;

function statusLabelHe(status: DropType['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'פתוחה';
    case 'CLOSED':
      return 'סגורה';
    case 'EXPIRED':
      return 'פג תוקף';
    case 'RESOLVED':
      return 'טופלה';
    default:
      return status;
  }
}

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

  const dropRef = useRef<Drop | null>(cachedDrop ?? null);
  const answersRef = useRef<Answer[]>([]);
  const lastUpdateAtRef = useRef<string>(cachedDrop?.createdAt ?? new Date().toISOString());
  dropRef.current = drop;
  answersRef.current = answers;
  lastUpdateAtRef.current = lastUpdateAt;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await ensureAnonymousSession();
      const [dRes, aRes] = await Promise.allSettled([
        fetchDrop(dropId),
        fetchAnswers(dropId),
      ]);

      const combined = combineDropDetailsResults({
        dropResult: dRes,
        answersResult: aRes,
        cachedDrop: cachedDrop ?? null,
        dropId,
        previousDrop: dropRef.current,
        previousAnswers: answersRef.current,
        previousLastUpdateAt: lastUpdateAtRef.current,
      });

      setDrop(combined.drop);
      setAnswers(combined.answers);
      setLastUpdateAt(combined.lastUpdateAt);
      setFetchError(combined.fetchError);
      setFetchErrorMsg(combined.fetchErrorMessageHe);
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
    track('drop_details_opened', { dropId, source: 'DropDetails' });
  }, [dropId]);

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
  const hotLabel = hotIndicatorHe({
    answerCount: effectiveAnswerCount,
    latestAnswerIso,
    nowMs,
  });

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
              const updated = await closeOwnDrop(dropId);
              setDrop(updated);
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

  const shareCurrent = useCallback(() => {
    if (drop) void shareDrop(drop);
  }, [drop]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={shareCurrent}
            hitSlop={12}
            disabled={!drop}
            accessibilityRole="button"
            accessibilityLabel="שתף שאלה"
            style={({ pressed }) => ({ opacity: pressed || !drop ? 0.6 : 1, paddingHorizontal: 8 })}
          >
            <Ionicons name="share-social" size={21} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={openMenu}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="פעולות נוספות"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 8 })}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, openMenu, shareCurrent, drop]);

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
        <Text style={styles.centerTitle}>לא הצלחנו לטעון את השאלה</Text>
        <Text style={styles.centerMuted}>
          {fetchErrorMsg ?? 'ייתכן שהשאלה נסגרה או שיש בעיית רשת. נסה שוב.'}
        </Text>
        <Button
          label="נסה שוב"
          icon="refresh"
          onPress={() => void reload()}
          fullWidth={false}
        />
        <Button
          label="חזור"
          variant="ghost"
          onPress={() => navigation.goBack()}
          fullWidth={false}
        />
      </View>
    );
  }

  const [lng, lat] = drop.location.coordinates;
  const eligibility = canUserAnswerDrop({ drop, userCoords: userPos });
  const distanceFromUser = eligibility.distanceMeters ?? null;
  const expiresMs = new Date(drop.expiresAt).getTime();
  const isInactive = drop.status !== 'ACTIVE' || expiresMs <= nowMs;
  const remainingHe = remainingTimeHe(expiresMs - nowMs);

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
                {lat.toFixed(4)}, {lng.toFixed(4)} · רדיוס {formatDistanceHe(drop.radiusMeters)}
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
          {drop.isMine ? (
            <View style={styles.pillOwner}>
              <Text style={styles.pillOwnerText}>שלך</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.pillStatus,
              drop.status === 'ACTIVE' ? styles.pillStatusOpen : styles.pillStatusClosed,
            ]}
          >
            <Text
              style={[
                styles.pillStatusText,
                drop.status === 'ACTIVE'
                  ? styles.pillStatusTextOpen
                  : styles.pillStatusTextClosed,
              ]}
            >
              {isInactive && drop.status === 'ACTIVE' ? 'פג תוקף' : statusLabelHe(drop.status)}
            </Text>
          </View>
          <View style={styles.pillMuted}>
            <Text style={styles.pillMutedText}>{effectiveAnswerCount} תשובות</Text>
          </View>
          {hotLabel ? (
            <View style={styles.pillHot}>
              <Text style={styles.pillHotText}>{hotLabel}</Text>
            </View>
          ) : null}
        </View>
        {drop.isMine && !isInactive ? (
          <Pressable
            onPress={confirmCloseOwn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="סמן שקיבלתי תשובה וסגור את השאלה"
            style={({ pressed }) => [
              styles.ownerCloseChip,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color="#86EFAC" />
            <Text style={styles.ownerCloseChipText}>קיבלתי תשובה — סגור</Text>
          </Pressable>
        ) : null}
        <Text style={styles.q}>{drop.question}</Text>
        <Text style={styles.meta}>
          רדיוס כיסוי: {formatDistanceHe(drop.radiusMeters)}
          {distanceFromUser != null
            ? ` · מרחק משוער ממך: ~${formatDistanceHe(distanceFromUser)}`
            : ''}
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

      {isInactive ? (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>השאלה נסגרה</Text>
          <Text style={styles.closedBannerSub}>
            התשובות מהשטח נשמרות לצפייה. לא ניתן להוסיף תשובות חדשות.
          </Text>
        </View>
      ) : drop.isMine ? (
        <View style={[styles.blockedBanner, styles.blockedBannerOwner]}>
          <Text style={styles.blockedBannerText}>
            ממתין לתשובות מהשטח{remainingHe ? ` · ${remainingHe}` : ''}
          </Text>
        </View>
      ) : eligibility.canAnswer ? (
        <Button
          label="אני כאן עכשיו — ענה"
          icon="navigate"
          variant="success"
          onPress={() => navigation.navigate('AnswerDrop', { dropId, cachedDrop: drop })}
          style={styles.answerCta}
        />
      ) : (
        <View style={styles.blockedBanner}>
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
                  ~{formatDistanceHe(a.distanceFromDrop)} מהמרכז · {formatRelativeTimeHe(a.createdAt, nowMs)}
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
