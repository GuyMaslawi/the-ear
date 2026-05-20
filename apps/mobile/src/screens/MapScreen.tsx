import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Circle,
  LongPressEvent,
  MapPressEvent,
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { MapStackParamList } from '../navigation/RootNavigator';
import { QuestionSubmittedSheet } from '../components/QuestionSubmittedSheet';
import { NearbyDropsSheet } from '../components/NearbyDropsSheet';
import { MapErrorBoundary, MapFallbackNotice } from '../components/MapErrorBoundary';
import { DropMapMarker } from '../components/DropMapMarker';
import { colors } from '../theme/colors';
import {
  ensureAnonymousSession,
  fetchNearbyDrops,
  patchUserLocation,
} from '../lib/api';
import {
  apiUserMessageHe,
  apiUserMessageHeAuto,
  LOCATION_PERMISSION_MESSAGE_HE,
  NO_NEARBY_QUESTIONS_MESSAGE_HE,
} from '../lib/apiErrors';
import type { FetchPhase } from '../lib/fetchState';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { categoryHe } from '../lib/categories';
import { formatRelativeTimeHe } from '../lib/relativeTime';
import type { Drop } from '../types/api';

const TEL_AVIV = { lat: 32.0853, lng: 34.7818 };
const SHEET_MAX_RATIO = 0.38;
/** Space below safe area + topBar (dual-line brand) before overlay banners */
const MAP_ERROR_BANNER_TOP_OFFSET = 68;
const REGION_LOAD_DEBOUNCE_MS = 420;

type MapRouteParams = MapStackParamList['Map'];

type Props = NativeStackScreenProps<MapStackParamList, 'Map'>;

function DropsListFallback({
  drops,
  onSelect,
  nowMs,
  emptyMessage,
}: {
  drops: Drop[];
  onSelect: (d: Drop) => void;
  nowMs: number;
  emptyMessage: string;
}) {
  return (
    <ScrollView
      style={styles.listScroll}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
    >
      {drops.length === 0 ? (
        <Text style={styles.listEmpty}>
          {emptyMessage}
        </Text>
      ) : (
        drops.map((d) => (
          <Pressable
            key={d.id}
            style={styles.listRow}
            onPress={() => onSelect(d)}
          >
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

export function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MapStackParamList, 'Map'>>();
  const mapParams = (route.params ?? {}) as MapRouteParams;
  const mapRef = useRef<MapView>(null);
  const { height: winH } = Dimensions.get('window');

  const [region, setRegion] = useState<Region>({
    latitude: TEL_AVIV.lat,
    longitude: TEL_AVIV.lng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [apiDrops, setApiDrops] = useState<Drop[]>([]);
  const [extraById, setExtraById] = useState<Record<string, Drop>>({});
  const [loadingDrops, setLoadingDrops] = useState(false);
  const [listOnly, setListOnly] = useState(false);
  const [previewDrop, setPreviewDrop] = useState<Drop | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [entranceIds, setEntranceIds] = useState<Record<string, true>>({});
  const [nearbyPhase, setNearbyPhase] = useState<FetchPhase>('idle');
  const [nearbyUserMessage, setNearbyUserMessage] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [celebrationDrop, setCelebrationDrop] = useState<Drop | null>(null);
  const lastHttpLoc = useRef(0);
  const apiDropsRef = useRef<Drop[]>([]);
  const regionRef = useRef(region);
  const regionLoadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  regionRef.current = region;

  const drops = useMemo(() => {
    const map = new Map<string, Drop>();
    for (const d of apiDrops) map.set(d.id, d);
    for (const d of Object.values(extraById)) map.set(d.id, d);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [apiDrops, extraById]);

  useEffect(() => {
    apiDropsRef.current = apiDrops;
  }, [apiDrops]);

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setExtraById((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (apiDrops.some((d) => d.id === id)) delete next[id];
      }
      return next;
    });
  }, [apiDrops]);

  useEffect(() => {
    const nd = mapParams.newDrop;
    if (!nd) return;
    setExtraById((prev) => ({ ...prev, [nd.id]: nd }));
    setPreviewDrop(null);
    setEntranceIds((prev) => ({ ...prev, [nd.id]: true }));
    setTimeout(() => {
      setEntranceIds((prev) => {
        const next = { ...prev };
        delete next[nd.id];
        return next;
      });
    }, 1100);
    navigation.setParams({ newDrop: undefined } as MapRouteParams);
  }, [mapParams.newDrop, navigation]);

  useEffect(() => {
    const msg = mapParams.toastMessage;
    if (!msg) return;
    setToast(msg);
    navigation.setParams({ toastMessage: undefined } as MapRouteParams);
  }, [mapParams.toastMessage, navigation]);

  useEffect(() => {
    const sd = mapParams.submittedQuestionSheet;
    if (!sd) return;
    setCelebrationDrop(sd);
    navigation.setParams({ submittedQuestionSheet: undefined } as MapRouteParams);
  }, [mapParams.submittedQuestionSheet, navigation]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (regionLoadDebounceRef.current) {
        clearTimeout(regionLoadDebounceRef.current);
      }
    };
  }, []);

  const loadDrops = useCallback(async (lat: number, lng: number) => {
    setLoadingDrops(true);
    const hadData = apiDropsRef.current.length > 0;
    if (!hadData) {
      setNearbyPhase('loading');
      setNearbyUserMessage(null);
    } else {
      setNearbyUserMessage(null);
    }
    try {
      const list = await fetchNearbyDrops(lat, lng, 2800);
      setApiDrops(list);
      setNearbyUserMessage(null);
      setNearbyPhase(list.length === 0 ? 'empty' : 'success');
    } catch (e) {
      const msg = apiUserMessageHe(e, 'nearby_drops');
      setNearbyUserMessage(msg);
      if (!hadData) {
        setNearbyPhase('error');
      }
    } finally {
      setLoadingDrops(false);
    }
  }, []);

  const scheduleLoadDropsForRegion = useCallback(
    (r: Region) => {
      if (regionLoadDebounceRef.current) {
        clearTimeout(regionLoadDebounceRef.current);
      }
      regionLoadDebounceRef.current = setTimeout(() => {
        regionLoadDebounceRef.current = null;
        void loadDrops(r.latitude, r.longitude);
      }, REGION_LOAD_DEBOUNCE_MS);
    },
    [loadDrops],
  );

  const onRegionChangeComplete = useCallback(
    (r: Region) => {
      setRegion(r);
      scheduleLoadDropsForRegion(r);
    },
    [scheduleLoadDropsForRegion],
  );

  const applyMapSelection = useCallback(
    (lat: number, lng: number) => {
      setPreviewDrop(null);
      setSelectedPoint({ lat, lng });
      void loadDrops(lat, lng);
    },
    [loadDrops],
  );

  const onMapPress = useCallback(
    (e: MapPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      applyMapSelection(latitude, longitude);
    },
    [applyMapSelection],
  );

  const onMapLongPress = useCallback(
    (e: LongPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      applyMapSelection(latitude, longitude);
    },
    [applyMapSelection],
  );

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        await ensureAnonymousSession();
      } catch (e) {
        if (!cancelled) {
          setNearbyUserMessage(apiUserMessageHeAuto(e));
          setNearbyPhase('error');
        }
        return;
      }

      try {
        await connectSocket();
      } catch {
        /* socket optional */
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocationPermissionDenied(true);
          setToast(LOCATION_PERMISSION_MESSAGE_HE);
          await loadDrops(TEL_AVIV.lat, TEL_AVIV.lng);
          return;
        }
        setLocationPermissionDenied(false);

        let lat = TEL_AVIV.lat;
        let lng = TEL_AVIV.lng;
        try {
          const first = await Location.getCurrentPositionAsync({});
          lat = first.coords.latitude;
          lng = first.coords.longitude;
        } catch {
          if (!cancelled) {
            setToast('לא הצלחנו לקרוא מיקום מהמכשיר — מציגים נתונים לאזור ברירת מחדל.');
          }
        }

        setRegion((r) => ({
          ...r,
          latitude: lat,
          longitude: lng,
        }));
        await patchUserLocationThrottled(lat, lng);
        getSocket()?.emit('geo:update', { lat, lng });
        await loadDrops(lat, lng);

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 35 },
          (loc) => {
            const la = loc.coords.latitude;
            const ln = loc.coords.longitude;
            getSocket()?.emit('geo:update', { lat: la, lng: ln });
            void patchUserLocationThrottled(la, ln);
          },
        );
      } catch {
        if (!cancelled) {
          setToast('בעיה בגישה למיקום — מנסים לטעון נתונים לאזור ברירת מחדל.');
          await loadDrops(TEL_AVIV.lat, TEL_AVIV.lng);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      disconnectSocket();
    };
  }, [loadDrops]);

  async function patchUserLocationThrottled(lat: number, lng: number) {
    const now = Date.now();
    if (now - lastHttpLoc.current < 12000) return;
    lastHttpLoc.current = now;
    try {
      await patchUserLocation(lat, lng);
    } catch {
      /* keep last known coords; PATCH is non-critical */
    }
  }

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onNew = () => {
      const r = regionRef.current;
      void loadDrops(r.latitude, r.longitude);
    };
    s.on('new_drop_nearby', onNew);
    return () => {
      s.off('new_drop_nearby', onNew);
    };
  }, [loadDrops]);

  const openAsk = useCallback(() => {
    const pin = selectedPoint;
    const r = regionRef.current;
    const lat = pin?.lat ?? r.latitude;
    const lng = pin?.lng ?? r.longitude;
    navigation.navigate('CreateDrop', { lat, lng });
  }, [navigation, selectedPoint]);

  const openLiveFeed = () => {
    navigation.getParent()?.navigate('NearbyStack', {
      screen: 'NearbyFeed',
    });
  };

  const openDetails = (d: Drop) => {
    setPreviewDrop(null);
    navigation.navigate('DropDetails', { dropId: d.id, cachedDrop: d });
  };

  const sheetBottomPx = Math.round(winH * SHEET_MAX_RATIO);

  const listEmptyMessage =
    nearbyPhase === 'error'
      ? nearbyUserMessage ?? 'לא הצלחנו לטעון את הרשימה — נסה לרענן.'
      : locationPermissionDenied
        ? `${NO_NEARBY_QUESTIONS_MESSAGE_HE}\n${LOCATION_PERMISSION_MESSAGE_HE}`
        : NO_NEARBY_QUESTIONS_MESSAGE_HE;

  const listFallback = (
    <View style={styles.listWrap}>
      <MapFallbackNotice />
      <DropsListFallback
        drops={drops}
        onSelect={openDetails}
        nowMs={clock}
        emptyMessage={listEmptyMessage}
      />
    </View>
  );

  const showHardNearbyBanner =
    nearbyPhase === 'error' &&
    drops.length === 0 &&
    !!nearbyUserMessage &&
    !locationPermissionDenied;
  const showSoftNearbyBanner =
    !!nearbyUserMessage && drops.length > 0 && !loadingDrops;
  const showLocationBanner =
    locationPermissionDenied &&
    !showHardNearbyBanner &&
    !showSoftNearbyBanner;

  return (
    <View style={styles.root}>
      {toast ? (
        <View style={[styles.toast, { top: insets.top + 8 }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {listOnly ? (
        listFallback
      ) : (
        <MapErrorBoundary fallback={listFallback}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            region={region}
            onRegionChangeComplete={onRegionChangeComplete}
            onPress={onMapPress}
            onLongPress={onMapLongPress}
            showsUserLocation
            showsMyLocationButton={false}
            userInterfaceStyle="dark"
            mapPadding={{ top: 0, right: 0, bottom: sheetBottomPx, left: 0 }}
          >
            {drops.map((d) => {
              const [lng, lat] = d.location.coordinates;
              return (
                <Marker
                  key={d.id}
                  coordinate={{ latitude: lat, longitude: lng }}
                  tracksViewChanges
                  anchor={{ x: 0.5, y: 0.65 }}
                  onPress={() => setPreviewDrop(d)}
                >
                  <DropMapMarker
                    drop={d}
                    live={d.status === 'ACTIVE'}
                    animateEntrance={!!entranceIds[d.id]}
                  />
                </Marker>
              );
            })}
            {drops.map((d) => {
              const [lng, lat] = d.location.coordinates;
              return (
                <Circle
                  key={`c-${d.id}`}
                  center={{ latitude: lat, longitude: lng }}
                  radius={d.radiusMeters}
                  strokeColor="rgba(59,130,246,0.65)"
                  fillColor="rgba(37,99,235,0.12)"
                />
              );
            })}
            {selectedPoint ? (
              <Marker
                coordinate={{
                  latitude: selectedPoint.lat,
                  longitude: selectedPoint.lng,
                }}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
              >
                <View style={styles.selectedPointMarker}>
                  <View style={styles.selectedPointInner} />
                </View>
              </Marker>
            ) : null}
          </MapView>
        </MapErrorBoundary>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandCol}>
          <Text style={styles.brandHe}>האוזן</Text>
          <Text style={styles.brandEn}>The Ear</Text>
        </View>
        <View style={styles.topRight}>
          <Pressable
            onPress={() => setListOnly((v) => !v)}
            style={styles.toggle}
            hitSlop={8}
          >
            <Text style={styles.toggleText}>{listOnly ? 'מפה' : 'רשימה'}</Text>
          </Pressable>
        </View>
      </View>

      {showHardNearbyBanner ? (
        <View
          style={[styles.errorBanner, { top: insets.top + MAP_ERROR_BANNER_TOP_OFFSET }]}
          pointerEvents="box-none"
        >
          <Text style={styles.errorBannerText}>{nearbyUserMessage}</Text>
        </View>
      ) : null}

      {showSoftNearbyBanner ? (
        <View
          style={[styles.softRefreshBanner, { top: insets.top + MAP_ERROR_BANNER_TOP_OFFSET }]}
          pointerEvents="box-none"
        >
          <Text style={styles.softRefreshBannerText}>
            לא עודכנה הרשימה — {nearbyUserMessage}
          </Text>
        </View>
      ) : null}

      {showLocationBanner ? (
        <View
          style={[styles.infoBanner, { top: insets.top + MAP_ERROR_BANNER_TOP_OFFSET }]}
          pointerEvents="none"
        >
          <Text style={styles.infoBannerText}>{LOCATION_PERMISSION_MESSAGE_HE}</Text>
        </View>
      ) : null}

      {previewDrop && !listOnly ? (
        <View
          style={[styles.previewWrap, { bottom: sheetBottomPx + 16 }]}
          pointerEvents="box-none"
        >
          <Pressable style={styles.previewCard} onPress={() => openDetails(previewDrop)}>
            <View style={styles.previewTop}>
              <DropMapMarker drop={previewDrop} compact live={false} />
              <View style={styles.previewTextCol}>
                <Text style={styles.previewCat}>{categoryHe(previewDrop.category)}</Text>
                <Text style={styles.previewQ} numberOfLines={2}>
                  {previewDrop.question}
                </Text>
                <Text style={styles.previewMeta}>
                  {formatRelativeTimeHe(previewDrop.createdAt, clock)} ·{' '}
                  {previewDrop.answerCount} תשובות · רדיוס {previewDrop.radiusMeters}מ׳
                </Text>
              </View>
            </View>
            <View style={styles.previewCtaRow}>
              <Text style={styles.previewCta}>פתח פרטים מלאים</Text>
              <Text style={styles.previewChevron}>›</Text>
            </View>
          </Pressable>
          <Pressable style={styles.previewDismiss} onPress={() => setPreviewDrop(null)}>
            <Text style={styles.previewDismissText}>סגור</Text>
          </Pressable>
        </View>
      ) : null}

      <NearbyDropsSheet
        drops={drops}
        loading={loadingDrops}
        refreshing={loadingDrops && drops.length > 0}
        nowMs={clock}
        areaHint={
          selectedPoint
            ? '״שאל כאן״ ישתמש בנקודה המסומנת · הרשימה מתעדכנת לפי מרכז המפה כשמזיזים'
            : 'גרור לעדכון השאלות לפי האזור המוצג · הקש או לחיצה ארוכה לבחירת נקודה'
        }
        emptyHint={
          nearbyPhase === 'error' && nearbyUserMessage
            ? nearbyUserMessage
            : locationPermissionDenied
              ? `${NO_NEARBY_QUESTIONS_MESSAGE_HE} (${LOCATION_PERMISSION_MESSAGE_HE})`
              : NO_NEARBY_QUESTIONS_MESSAGE_HE
        }
        onRefresh={() => {
          const r = regionRef.current;
          void loadDrops(r.latitude, r.longitude);
        }}
        onSelect={openDetails}
        onAsk={openAsk}
        onLiveFeed={openLiveFeed}
      />

      <QuestionSubmittedSheet
        visible={!!celebrationDrop}
        drop={celebrationDrop}
        onDismiss={() => setCelebrationDrop(null)}
        onOpenQuestion={(drop) => {
          setCelebrationDrop(null);
          navigation.navigate('DropDetails', { dropId: drop.id, cachedDrop: drop });
        }}
        onBackToMap={() => setCelebrationDrop(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },

  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: 'rgba(37, 99, 235, 0.95)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  toastText: {
    color: colors.white,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 14,
  },

  errorBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 20,
    ...(Platform.OS === 'android' ? { elevation: 18 as const } : {}),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
    writingDirection: 'rtl',
  },

  softRefreshBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 20,
    ...(Platform.OS === 'android' ? { elevation: 18 as const } : {}),
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.35)',
  },
  softRefreshBannerText: {
    color: '#FDE68A',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 12,
    writingDirection: 'rtl',
  },

  infoBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 20,
    ...(Platform.OS === 'android' ? { elevation: 18 as const } : {}),
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.35)',
  },
  infoBannerText: {
    color: '#BFDBFE',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 12,
    writingDirection: 'rtl',
  },

  listWrap: { ...StyleSheet.absoluteFillObject, paddingTop: 100 },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 200 },
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

  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  brandCol: {},
  brandHe: { color: colors.white, fontSize: 22, fontWeight: '800' },
  brandEn: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  topRight: {
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: 220,
    flexShrink: 1,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  toggleText: { color: colors.electricBright, fontWeight: '700', fontSize: 12 },

  previewWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 15,
    alignItems: 'stretch',
  },
  previewCard: {
    backgroundColor: 'rgba(11, 20, 38, 0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.55)',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  previewTop: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  previewTextCol: { flex: 1, alignItems: 'flex-end' },
  previewCat: { color: colors.electricBright, fontWeight: '800', fontSize: 12 },
  previewQ: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 4,
    textAlign: 'right',
    flexShrink: 1,
  },
  previewMeta: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 12,
    textAlign: 'right',
  },
  previewCtaRow: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  previewCta: { color: colors.electricBright, fontWeight: '800', fontSize: 14 },
  previewChevron: { color: colors.electricBright, fontSize: 22, fontWeight: '700' },
  previewDismiss: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  previewDismissText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },

  selectedPointMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(250, 204, 21, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  selectedPointInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.navy,
  },
});
