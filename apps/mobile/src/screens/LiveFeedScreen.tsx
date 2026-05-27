import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import * as Location from 'expo-location';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NearbyStackParamList, RootTabParamList } from '../navigation/RootNavigator';
import { useUserCoords } from '../hooks/useUserCoords';
import { colors } from '../theme/colors';
import { gradients, palette } from '../theme/theme';
import { PressableScale } from '../components/ui/PressableScale';
import { Button } from '../components/ui/Button';
import { tapLight, tapMedium, notifySuccess, notifyError } from '../lib/haptics';
import { ensureAnonymousSession, fetchNearbyDrops, postAnswer } from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import {
  apiUserMessageHeAuto,
  LOCATION_PERMISSION_MESSAGE_HE,
  NO_NEARBY_QUESTIONS_MESSAGE_HE,
} from '../lib/apiErrors';
import type { FetchPhase } from '../lib/fetchState';
import { categoryHe, categoryMarkerIcon } from '../lib/categories';
import { formatRelativeTimeHe } from '../lib/relativeTime';
import { distanceMeters } from '../lib/geo';
import { getAnswerOptions } from '../lib/answerOptions';
import type { AnswerOption, Drop, QuickStatus } from '../types/api';
import { VISIBILITY_RADIUS_METERS } from '../lib/devLocation';
import { canUserAnswerDrop, blockedReasonHe } from '../lib/answerEligibility';
import { useHiddenContent } from '../lib/hiddenContent';

type Props = NativeStackScreenProps<NearbyStackParamList, 'NearbyFeed'>;

type SortMode = 'recent' | 'closest' | 'active';

const { height: WIN_H, width: WIN_W } = Dimensions.get('window');

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'אחרונים',
  closest: 'הכי קרוב',
  active: 'הכי פעיל',
};

function AnimatedAnswerCount({ count }: { count: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      prevCount.current = count;
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.35,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count, scale]);

  return (
    <Animated.Text style={[styles.answerNum, { transform: [{ scale }] }]}>
      {count}
    </Animated.Text>
  );
}

function LivePulse() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.liveDot, { opacity }]} />;
}

type DropCardProps = {
  drop: Drop;
  userLat: number;
  userLng: number;
  nowMs: number;
  onAnswer: (dropId: string, status: QuickStatus) => void | Promise<void>;
  answeredStatus: QuickStatus | null;
  cardHeight: number;
};

const DropCard = memo(function DropCard({
  drop,
  userLat,
  userLng,
  nowMs,
  onAnswer,
  answeredStatus,
  cardHeight,
}: DropCardProps) {
  const [lng, lat] = drop.location.coordinates;
  const dist = Math.round(distanceMeters(userLat, userLng, lat, lng));
  const feedbackScale = useRef(new Animated.Value(0)).current;

  const options = useMemo(
    () => getAnswerOptions(drop.category, drop.question),
    [drop.category, drop.question],
  );

  const answeredOption = useMemo(
    () => options.find((o) => o.key === answeredStatus),
    [options, answeredStatus],
  );

  const playFeedback = useCallback(() => {
    feedbackScale.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackScale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackScale, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [feedbackScale]);

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      <Animated.View
        style={[
          styles.feedbackOverlay,
          {
            opacity: feedbackScale,
            transform: [
              {
                scale: feedbackScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.2],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.feedbackCheck}>✓</Text>
      </Animated.View>

      <View style={styles.badgeRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryIcon}>
            {categoryMarkerIcon[drop.category]}
          </Text>
          <Text style={styles.categoryText}>{categoryHe(drop.category)}</Text>
        </View>
      </View>

      <Text style={styles.question}>{drop.question}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{dist} מטר ממך</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>🕐</Text>
          <Text style={styles.metaText}>
            {formatRelativeTimeHe(drop.createdAt, nowMs)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <AnimatedAnswerCount count={drop.answerCount} />
          <Text style={styles.metaText}> תשובות</Text>
        </View>
      </View>

      {answeredStatus ? (
        <View style={styles.answeredWrap}>
          <Text style={styles.answeredLabel}>✓ ענית</Text>
          <Text style={styles.answeredValue}>
            {answeredOption ? `${answeredOption.icon} ${answeredOption.label}` : answeredStatus}
          </Text>
        </View>
      ) : (
        <View style={styles.buttonsWrap}>
          {options.map((opt) => (
            <PressableScale
              key={opt.key}
              haptic="none"
              scaleTo={0.93}
              style={[styles.answerBtn, { backgroundColor: opt.color }]}
              accessibilityRole="button"
              accessibilityLabel={`${opt.label} — ענה על השאלה`}
              onPress={() => {
                tapMedium();
                playFeedback();
                onAnswer(drop.id, opt.key);
              }}
            >
              <Text style={styles.answerBtnIcon}>{opt.icon}</Text>
              <Text style={styles.answerBtnText}>{opt.label}</Text>
            </PressableScale>
          ))}
        </View>
      )}

      <View style={styles.fomoRow}>
        <LivePulse />
        <Text style={styles.fomoText}>אנשים עונים עכשיו</Text>
      </View>
    </View>
  );
});

export function LiveFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    lat,
    lng,
    source: coordsSource,
    refresh: refreshCoords,
    permissionDenied,
  } = useUserCoords();

  const [drops, setDrops] = useState<Drop[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [answeredMap, setAnsweredMap] = useState<Record<string, QuickStatus>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [fetchError, setFetchError] = useState(false);
  const [listPhase, setListPhase] = useState<FetchPhase>('idle');
  const [listErrorMsg, setListErrorMsg] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const flatRef = useRef<FlatList<Drop>>(null);
  const dropsRef = useRef<Drop[]>([]);
  const visibleIndex = useRef(0);
  /** Must be state (not only a ref) so progress dots re-render while paging. */
  const [visibleIndexState, setVisibleIndexState] = useState(0);
  const sortInitial = useRef(true);

  /** Measured FlatList viewport (window height minus the bottom tab bar). */
  const [viewportH, setViewportH] = useState(WIN_H);
  const cardHeight = viewportH;

  useEffect(() => {
    dropsRef.current = drops;
  }, [drops]);

  const loadNearby = useCallback(
    async (mode: 'initial' | 'pull') => {
      if (mode === 'pull') setRefreshing(true);
      else setLoadingInitial(true);
      const hadData = dropsRef.current.length > 0;
      if (!hadData) {
        setListPhase('loading');
        setListErrorMsg(null);
      } else {
        setListErrorMsg(null);
      }
      try {
        await ensureAnonymousSession();
        const list = await fetchNearbyDrops(lat, lng, VISIBILITY_RADIUS_METERS);
        setDrops(list);
        setFetchError(false);
        setListErrorMsg(null);
        setListPhase(list.length === 0 ? 'empty' : 'success');
      } catch (e) {
        const msg = apiUserMessageHeAuto(e);
        setListErrorMsg(msg);
        setFetchError(true);
        if (!hadData) setListPhase('error');
      } finally {
        setLoadingInitial(false);
        setRefreshing(false);
      }
    },
    [lat, lng],
  );

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    void loadNearby('initial');
  }, [loadNearby]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const onNewNearby = () => {
        void loadNearby('pull');
      };
      (async () => {
        try {
          await ensureAnonymousSession();
          await connectSocket();
        } catch {
          /* realtime optional */
        }
        if (!active) return;
        getSocket()?.emit('geo:update', { lat, lng });
        getSocket()?.on('new_drop_nearby', onNewNearby);
      })();
      return () => {
        active = false;
        getSocket()?.off('new_drop_nearby', onNewNearby);
      };
    }, [lat, lng, loadNearby]),
  );

  const tabNav = useCallback(
    () => navigation.getParent() as BottomTabNavigationProp<RootTabParamList> | undefined,
    [navigation],
  );

  const gotoMapTab = () => {
    tabNav()?.navigate('MapStack', { screen: 'Map', params: {} });
  };

  const openAsk = () => {
    tabNav()?.navigate('MapStack', {
      screen: 'CreateDrop',
      params: { lat, lng },
    });
  };

  const { hiddenDropIds } = useHiddenContent();

  const answerable = useMemo(() => {
    return drops.filter(
      (d) =>
        !hiddenDropIds.has(d.id) &&
        canUserAnswerDrop({
          drop: d,
          userCoords: { lat, lng, source: coordsSource },
        }).canAnswer,
    );
  }, [drops, lat, lng, coordsSource, hiddenDropIds]);

  const sorted = useMemo(() => {
    const arr = [...answerable];
    switch (sortMode) {
      case 'recent':
        arr.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'closest': {
        arr.sort((a, b) => {
          const [aLng, aLat] = a.location.coordinates;
          const [bLng, bLat] = b.location.coordinates;
          return (
            distanceMeters(lat, lng, aLat, aLng) -
            distanceMeters(lat, lng, bLat, bLng)
          );
        });
        break;
      }
      case 'active':
        arr.sort((a, b) => b.answerCount - a.answerCount);
        break;
    }
    return arr;
  }, [answerable, sortMode, lat, lng]);

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      const modes: SortMode[] = ['recent', 'closest', 'active'];
      return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  }, []);

  useEffect(() => {
    if (sortInitial.current) {
      sortInitial.current = false;
      return;
    }
    visibleIndex.current = 0;
    setVisibleIndexState(0);
    requestAnimationFrame(() => {
      flatRef.current?.scrollToIndex({ index: 0, animated: false });
    });
  }, [sortMode]);

  const handleAnswer = useCallback(
    async (dropId: string, status: QuickStatus) => {
      setAnsweredMap((prev) => ({ ...prev, [dropId]: status }));

      try {
        const { status: locPerm } = await Location.requestForegroundPermissionsAsync();
        if (locPerm !== 'granted') {
          setAnsweredMap((prev) => {
            const next = { ...prev };
            delete next[dropId];
            return next;
          });
          Alert.alert('מיקום', LOCATION_PERMISSION_MESSAGE_HE);
          return;
        }
        let pos: Location.LocationObject;
        try {
          pos = await Location.getCurrentPositionAsync({});
        } catch {
          setAnsweredMap((prev) => {
            const next = { ...prev };
            delete next[dropId];
            return next;
          });
          Alert.alert(
            'מיקום',
            'לא הצלחנו לקרוא מיקום מהשטח. בדוק ש-GPS פעיל ונסה שוב.',
          );
          return;
        }
        const drop = dropsRef.current.find((d) => d.id === dropId);
        if (drop) {
          const elig = canUserAnswerDrop({
            drop,
            userCoords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              source: 'gps',
            },
          });
          if (!elig.canAnswer) {
            setAnsweredMap((prev) => {
              const next = { ...prev };
              delete next[dropId];
              return next;
            });
            Alert.alert('לא ניתן לענות', blockedReasonHe(elig.reason, elig.distanceMeters));
            return;
          }
        }
        try {
          await postAnswer(dropId, {
            text: '—',
            quickStatus: status,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        } catch (e) {
          setAnsweredMap((prev) => {
            const next = { ...prev };
            delete next[dropId];
            return next;
          });
          Alert.alert('לא נשלח', apiUserMessageHeAuto(e));
          return;
        }
        setDrops((prev) =>
          prev.map((d) =>
            d.id === dropId ? { ...d, answerCount: d.answerCount + 1 } : d,
          ),
        );
        notifySuccess();
      } catch {
        setAnsweredMap((prev) => {
          const next = { ...prev };
          delete next[dropId];
          return next;
        });
        Alert.alert('מיקום', LOCATION_PERMISSION_MESSAGE_HE);
        return;
      }

      setTimeout(() => {
        const nextIdx = visibleIndex.current + 1;
        if (nextIdx < sorted.length) {
          flatRef.current?.scrollToIndex({ index: nextIdx, animated: true });
        }
      }, 700);
    },
    [sorted.length],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        visibleIndex.current = idx;
        setVisibleIndexState(idx);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Drop>) => (
      <DropCard
        drop={item}
        userLat={lat}
        userLng={lng}
        nowMs={nowMs}
        onAnswer={handleAnswer}
        answeredStatus={answeredMap[item.id] ?? null}
        cardHeight={cardHeight}
      />
    ),
    [lat, lng, nowMs, handleAnswer, answeredMap, cardHeight],
  );

  const keyExtractor = useCallback((item: Drop) => item.id, []);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: cardHeight,
      offset: cardHeight * index,
      index,
    }),
    [cardHeight],
  );

  const showPagingList = sorted.length > 0;
  const bannerError = fetchError && sorted.length > 0;
  const showSkeleton = loadingInitial && sorted.length === 0;

  const missingLocation = coordsSource === 'denied' || coordsSource === 'unavailable';
  const centerMissingLocation =
    !loadingInitial &&
    sorted.length === 0 &&
    listPhase !== 'error' &&
    !refreshing &&
    missingLocation;
  const centerEmptyOk =
    !loadingInitial &&
    sorted.length === 0 &&
    listPhase !== 'error' &&
    !refreshing &&
    !missingLocation;
  const centerErrorOnly =
    !loadingInitial && sorted.length === 0 && listPhase === 'error' && !refreshing;

  const onPullToRefresh = () => void loadNearby('pull');

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.backdrop}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          onPress={() => {
            tapLight();
            gotoMapTab();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="מעבר למפה"
        >
          <Text style={styles.mapTabHint}>מפה</Text>
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          מה קורה עכשיו
        </Text>
        <PressableScale
          haptic="none"
          onPress={() => {
            tapLight();
            cycleSortMode();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`מיון: ${SORT_LABELS[sortMode]}. הקש להחלפה`}
        >
          <View style={styles.sortChip}>
            <Text style={styles.sortChipText}>{SORT_LABELS[sortMode]}</Text>
          </View>
        </PressableScale>
      </View>

      {bannerError ? (
        <View
          style={[styles.softErrorStripe, { top: insets.top + 54 }]}
        >
          <Text style={styles.softErrorStripeTitle}>לא עודכן הפיד</Text>
          <Text style={styles.softErrorStripeSub}>
            {listErrorMsg ?? 'נסה שוב בעוד רגע.'}
          </Text>
          <Pressable style={styles.softErrorStripeRetry} onPress={() => loadNearby('pull')}>
            <Text style={styles.softErrorStripeRetryText}>נסה שוב</Text>
          </Pressable>
        </View>
      ) : null}

      {showSkeleton ? (
        <View style={[styles.skeletonOuter, { paddingTop: insets.top + 80 }]}>
            <View style={[styles.skeletonPulseRow, styles.skeletonGlow]}>
              <View style={[styles.skeletonSkBar, { width: '76%' }]} />
              <View style={[styles.skeletonSkBar, styles.skeletonSkBarMedium]} />
              <View style={[styles.skeletonSkBar, styles.skeletonSkBarMuted]} />
            </View>
            <View style={styles.skeletonPulseRow}>
              <View style={[styles.skeletonSkBar, styles.skeletonSkBarMuted]} />
              <View style={[styles.skeletonSkBar, { width: '88%' }]} />
            </View>
          <View style={styles.skeletonDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonDot} />
            ))}
          </View>
        </View>
      ) : centerErrorOnly ? (
        <View style={[styles.centerCardWrap, { paddingTop: insets.top + 64 }]}>
          <View style={styles.softStandCard}>
            <Text style={styles.softStandTitle}>לא הצלחנו לטעון את הפיד</Text>
            <Text style={styles.softStandSub}>
              {listErrorMsg ?? 'בדוק חיבור ונסה שוב.'}
            </Text>
            <Button
              label="נסה שוב"
              icon="refresh"
              onPress={() => loadNearby('pull')}
              style={styles.standCtaSpacing}
            />
          </View>
        </View>
      ) : centerMissingLocation ? (
        <View style={[styles.centerCardWrap, { paddingTop: insets.top + 64 }]}>
          <View style={styles.softStandCardPositive}>
            <Text style={styles.softStandTitleLight}>צריך מיקום פעיל כדי לענות</Text>
            <Text style={[styles.softStandSubMuted, { marginTop: 10 }]}>
              {permissionDenied
                ? LOCATION_PERMISSION_MESSAGE_HE
                : 'לא הצלחנו לדייק מיקום — בדוק ש-GPS פעיל ונסה שוב.'}
            </Text>
            <Button
              label="אפשר מיקום"
              icon="navigate"
              onPress={refreshCoords}
              style={styles.standCtaSpacing}
            />
            {permissionDenied ? (
              <Pressable
                hitSlop={10}
                onPress={() => void Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="פתח הגדרות"
              >
                <Text style={styles.geoGhost}>פתח הגדרות</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : centerEmptyOk ? (
        <View style={[styles.centerCardWrap, { paddingTop: insets.top + 64 }]}>
          <View style={styles.softStandCardPositive}>
            <Text style={styles.softStandTitleLight}>{NO_NEARBY_QUESTIONS_MESSAGE_HE}</Text>
            <Text style={styles.softStandSubMuted}>
              רוצה להיות הראשון ששואל משהו מהשטח?
            </Text>
            <Button
              label="שאל שאלה כאן"
              icon="add-circle"
              onPress={openAsk}
              style={styles.standCtaSpacing}
            />
          </View>
        </View>
      ) : null}

      {showPagingList ? (
        <View style={[styles.progressRow, { top: insets.top + 56 }]}>
          {sorted.map((d, i) => (
            <View
              key={d.id}
              style={[
                styles.progressDot,
                answeredMap[d.id]
                  ? styles.progressDotDone
                  : i === visibleIndexState
                    ? styles.progressDotActive
                    : null,
              ]}
            />
          ))}
        </View>
      ) : null}

      {showPagingList ? (
        <FlatList
          ref={flatRef}
          data={sorted}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={(info) => {
            const offset = info.averageItemLength * info.index;
            flatRef.current?.scrollToOffset({ offset, animated: true });
          }}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              tintColor={colors.electricBright}
              refreshing={refreshing}
              onRefresh={onPullToRefresh}
            />
          }
        />
      ) : null}

      {showPagingList ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.bottomText}>
            ענית על {Object.keys(answeredMap).length} מתוך {sorted.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(8,15,31,0.55)',
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.hairline,
  },
  mapTabHint: {
    color: colors.electricBright,
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 6,
    writingDirection: 'rtl',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
  },
  sortChipText: {
    color: colors.electricBright,
    fontWeight: '700',
    fontSize: 12,
  },
  progressRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 19,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 4,
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: colors.electricBright,
    width: 20,
  },
  progressDotDone: {
    backgroundColor: '#22C55E',
  },
  softErrorStripe: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 21,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  softErrorStripeTitle: {
    color: '#FECACA',
    fontWeight: '900',
    fontSize: 14,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  softErrorStripeSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  softErrorStripeRetry: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-end',
  },
  softErrorStripeRetryText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },

  skeletonOuter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 22,
    zIndex: 1,
  },
  skeletonPulseRow: { gap: 12, alignSelf: 'stretch', alignItems: 'flex-end' },
  skeletonGlow: { opacity: 0.92 },
  skeletonSkBar: {
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonSkBarMedium: { width: '58%', height: 12 },
  skeletonSkBarMuted: { backgroundColor: 'rgba(255,255,255,0.055)', height: 10 },
  skeletonDots: {
    flexDirection: 'row-reverse',
    gap: 8,
    alignSelf: 'center',
    marginTop: 28,
    opacity: 0.85,
  },
  skeletonDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(148,163,184,0.35)',
  },
  centerCardWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 18,
    zIndex: 1,
  },
  geoGhost: {
    marginTop: 18,
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
  },
  softStandCard: {
    backgroundColor: colors.navyMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.22)',
    padding: 18,
    alignItems: 'flex-end',
  },
  softStandCardPositive: {
    backgroundColor: colors.navyMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.42)',
    padding: 18,
    alignItems: 'flex-end',
  },
  softStandTitle: {
    color: '#FECACA',
    fontWeight: '900',
    fontSize: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  softStandTitleLight: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 19,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  softStandSub: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  softStandSubMuted: {
    color: colors.textMuted,
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  standCtaSpacing: {
    marginTop: 20,
  },

  card: {
    width: WIN_W,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 80,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    marginBottom: 20,
  },
  categoryBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.45)',
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    color: colors.electricBright,
    fontWeight: '800',
    fontSize: 14,
  },
  question: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 24,
    maxWidth: 340,
    writingDirection: 'rtl',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  answerNum: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },

  buttonsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 360,
  },
  answerBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 85,
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  answerBtnIcon: {
    fontSize: 16,
  },
  answerBtnText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 15,
  },

  answeredWrap: {
    alignItems: 'center',
    gap: 8,
  },
  answeredLabel: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: '900',
  },
  answeredValue: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },

  fomoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 36,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  fomoText: {
    color: 'rgba(74, 222, 128, 0.85)',
    fontSize: 13,
    fontWeight: '700',
  },

  feedbackOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    zIndex: 30,
  },
  feedbackCheck: {
    fontSize: 72,
    color: '#22C55E',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 10,
    backgroundColor: 'rgba(11, 20, 38, 0.85)',
    zIndex: 20,
  },
  bottomText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
