import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Pressable,
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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/ui/PressableScale';
import { tapLight } from '../lib/haptics';
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
import { track } from '../lib/analytics';
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
import { DEV_FALLBACK_REGION, VISIBILITY_RADIUS_METERS } from '../lib/devLocation';
import { resolveAskTarget } from '../lib/mapSelection';
import { nearbyEmptyMessageHe } from '../lib/nearbyCtaCopy';
import { useHiddenContent } from '../lib/hiddenContent';
import { darkMapStyle } from '../lib/mapStyle';
import { styles } from './MapScreen.styles';
import { DropsListFallback } from './DropsListFallback';

const SHEET_MAX_RATIO = 0.55;
/** Space below safe area + topBar (dual-line brand) before overlay banners */
const MAP_ERROR_BANNER_TOP_OFFSET = 68;
const REGION_LOAD_DEBOUNCE_MS = 420;

type MapRouteParams = MapStackParamList['Map'];

type Props = NativeStackScreenProps<MapStackParamList, 'Map'>;

export function MapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MapStackParamList, 'Map'>>();
  const mapParams = (route.params ?? {}) as MapRouteParams;
  const mapRef = useRef<MapView>(null);
  const { height: winH } = Dimensions.get('window');

  const [region, setRegion] = useState<Region>({
    latitude: DEV_FALLBACK_REGION.lat,
    longitude: DEV_FALLBACK_REGION.lng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [trackSelectedMarker, setTrackSelectedMarker] = useState(false);
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
  const [recenterBusy, setRecenterBusy] = useState(false);
  const lastHttpLoc = useRef(0);
  const apiDropsRef = useRef<Drop[]>([]);
  const regionRef = useRef(region);
  const regionLoadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  regionRef.current = region;

  const { hiddenDropIds } = useHiddenContent();

  const drops = useMemo(() => {
    const map = new Map<string, Drop>();
    for (const d of apiDrops) map.set(d.id, d);
    for (const d of Object.values(extraById)) map.set(d.id, d);
    return Array.from(map.values())
      .filter((d) => !hiddenDropIds.has(d.id))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [apiDrops, extraById, hiddenDropIds]);

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
      const list = await fetchNearbyDrops(lat, lng, VISIBILITY_RADIUS_METERS);
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
      setTrackSelectedMarker(true);
      track('location_selected', { lat, lng, source: 'Map' });
      tapLight();
      mapRef.current?.animateCamera(
        { center: { latitude: lat, longitude: lng } },
        { duration: 350 },
      );
      void loadDrops(lat, lng);
    },
    [loadDrops],
  );

  useEffect(() => {
    if (!trackSelectedMarker) return;
    const t = setTimeout(() => setTrackSelectedMarker(false), 600);
    return () => clearTimeout(t);
  }, [trackSelectedMarker, selectedPoint]);

  const onMapPress = useCallback(
    (_e: MapPressEvent) => {
      if (previewDrop) setPreviewDrop(null);
    },
    [previewDrop],
  );

  const onMapLongPress = useCallback(
    (e: LongPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      applyMapSelection(latitude, longitude);
    },
    [applyMapSelection],
  );

  const clearSelectedPoint = useCallback(() => {
    setSelectedPoint(null);
    tapLight();
    const gps = lastGpsRef.current;
    const target = gps ?? { lat: regionRef.current.latitude, lng: regionRef.current.longitude };
    mapRef.current?.animateCamera(
      { center: { latitude: target.lat, longitude: target.lng } },
      { duration: 350 },
    );
    void loadDrops(target.lat, target.lng);
  }, [loadDrops]);

  const recenterToGps = useCallback(async () => {
    if (recenterBusy) return;
    tapLight();
    setRecenterBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        setToast(LOCATION_PERMISSION_MESSAGE_HE);
        return;
      }
      setLocationPermissionDenied(false);
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      lastGpsRef.current = { lat, lng };
      setSelectedPoint(null);
      mapRef.current?.animateCamera(
        { center: { latitude: lat, longitude: lng } },
        { duration: 450 },
      );
      void loadDrops(lat, lng);
    } catch {
      setToast('לא הצלחנו לקרוא מיקום מהמכשיר — נסה שוב בעוד רגע.');
    } finally {
      setRecenterBusy(false);
    }
  }, [loadDrops, recenterBusy]);

  const openLocationSettings = useCallback(() => {
    tapLight();
    void Linking.openSettings().catch(() => {
      setToast('לא הצלחנו לפתוח את הגדרות המכשיר. פתח אותן ידנית ותן הרשאת מיקום.');
    });
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;

    const onNewDropNearby = () => {
      const r = regionRef.current;
      void loadDrops(r.latitude, r.longitude);
    };

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
        if (!cancelled) getSocket()?.on('new_drop_nearby', onNewDropNearby);
      } catch {
        /* socket optional */
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          console.log(
            `[location] permission=denied source=denied lat=${DEV_FALLBACK_REGION.lat} lng=${DEV_FALLBACK_REGION.lng}`,
          );
          setLocationPermissionDenied(true);
          setToast(LOCATION_PERMISSION_MESSAGE_HE);
          await loadDrops(DEV_FALLBACK_REGION.lat, DEV_FALLBACK_REGION.lng);
          return;
        }
        setLocationPermissionDenied(false);

        let lat = DEV_FALLBACK_REGION.lat;
        let lng = DEV_FALLBACK_REGION.lng;
        let gotGps = false;
        try {
          const first = await Location.getCurrentPositionAsync({});
          lat = first.coords.latitude;
          lng = first.coords.longitude;
          gotGps = true;
          lastGpsRef.current = { lat, lng };
        } catch {
          if (!cancelled) {
            setToast('לא הצלחנו לקרוא מיקום מהמכשיר — מציגים נתונים לאזור ברירת מחדל.');
          }
        }
        console.log(
          `[location] permission=granted source=${gotGps ? 'gps' : 'unavailable'} lat=${lat} lng=${lng}`,
        );

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
            lastGpsRef.current = { lat: la, lng: ln };
            getSocket()?.emit('geo:update', { lat: la, lng: ln });
            void patchUserLocationThrottled(la, ln);
          },
        );
      } catch {
        if (!cancelled) {
          setToast('בעיה בגישה למיקום — מנסים לטעון נתונים לאזור ברירת מחדל.');
          await loadDrops(DEV_FALLBACK_REGION.lat, DEV_FALLBACK_REGION.lng);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      getSocket()?.off('new_drop_nearby', onNewDropNearby);
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

  const openAsk = useCallback(() => {
    const { lat, lng } = resolveAskTarget(selectedPoint, regionRef.current);
    navigation.navigate('CreateDrop', { lat, lng });
  }, [navigation, selectedPoint]);

  const openLiveFeed = () => {
    navigation.getParent()?.navigate('NearbyStack', {
      screen: 'NearbyFeed',
    });
  };

  const openDetails = useCallback(
    (d: Drop) => {
      setPreviewDrop(null);
      navigation.navigate('DropDetails', { dropId: d.id, cachedDrop: d });
    },
    [navigation],
  );

  const sheetBottomPx = Math.round(winH * SHEET_MAX_RATIO);

  const listEmptyMessage = nearbyEmptyMessageHe({
    phase: nearbyPhase,
    apiUserMessage: nearbyUserMessage,
    locationPermissionDenied,
  });

  const renderListFallback = (showFallbackNotice: boolean) => (
    <View style={styles.listWrap}>
      {showFallbackNotice ? <MapFallbackNotice /> : null}
      <DropsListFallback
        drops={drops}
        onSelect={openDetails}
        nowMs={clock}
        emptyMessage={listEmptyMessage}
        bottomInset={listOnly ? insets.bottom + 24 : sheetBottomPx + 24}
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
        renderListFallback(false)
      ) : (
        <MapErrorBoundary fallback={renderListFallback(true)}>
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
            customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
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
                tracksViewChanges={trackSelectedMarker}
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
        <View style={styles.brandPill}>
          <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.brandDot} />
          <View style={styles.brandCol}>
            <Text style={styles.brandHe}>האוזן</Text>
            <Text style={styles.brandEn}>The Ear</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <PressableScale
            haptic="none"
            onPress={() => {
              tapLight();
              setListOnly((v) => !v);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={listOnly ? 'הצג מפה' : 'הצג רשימה'}
            style={styles.toggle}
          >
            <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons
              name={listOnly ? 'map' : 'list'}
              size={15}
              color={colors.electricBright}
            />
            <Text style={styles.toggleText}>{listOnly ? 'מפה' : 'רשימה'}</Text>
          </PressableScale>
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
        <Pressable
          style={[styles.infoBanner, { top: insets.top + MAP_ERROR_BANNER_TOP_OFFSET }]}
          accessibilityRole="button"
          accessibilityLabel="פתח הגדרות מיקום"
          onPress={openLocationSettings}
        >
          <Text style={styles.infoBannerText}>{LOCATION_PERMISSION_MESSAGE_HE}</Text>
          <Text style={styles.infoBannerCta}>פתח הגדרות ›</Text>
        </Pressable>
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

      {!listOnly && !previewDrop ? (
        <View
          pointerEvents="box-none"
          style={[styles.fabColumn, { bottom: sheetBottomPx + 12 }]}
        >
          <PressableScale
            haptic="none"
            onPress={recenterToGps}
            disabled={recenterBusy}
            accessibilityRole="button"
            accessibilityLabel={recenterBusy ? 'מאתר מיקום…' : 'חזור למיקום שלי'}
            accessibilityState={{ disabled: recenterBusy, busy: recenterBusy }}
            style={[styles.fab, recenterBusy && styles.fabBusy]}
          >
            <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
            {recenterBusy ? (
              <ActivityIndicator size="small" color={colors.electricBright} />
            ) : (
              <Ionicons name="locate" size={20} color={colors.electricBright} />
            )}
          </PressableScale>
        </View>
      ) : null}

      {!listOnly ? (
        <NearbyDropsSheet
          drops={drops}
          loading={loadingDrops}
          refreshing={loadingDrops && drops.length > 0}
          nowMs={clock}
          hasSelectedPoint={!!selectedPoint}
          onClearSelectedPoint={clearSelectedPoint}
          areaHint={
            selectedPoint
              ? 'השאלה תפורסם בנקודה שבחרת במפה · לחץ על הסיכה לביטול'
              : 'לחיצה ארוכה על המפה תבחר נקודה לשאלה · הרשימה מתעדכנת לפי מרכז המפה'
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
      ) : null}

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
