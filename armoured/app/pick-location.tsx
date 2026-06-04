import Constants from 'expo-constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LinearGradient } from 'expo-linear-gradient';

import { BackButton } from '@/components/BackButton';
import { findPakistanCityByName, PAKISTAN_CITIES, type PakistanCity } from '@/constants/pakistanCities';
import { useTripDraftStore } from '@/store/tripDraft';

type Mode = 'pickup' | 'drop';

function cityLineFromGeocode(r: Location.LocationGeocodedAddress | null): string {
  if (!r) return '';
  for (const k of [r.city, r.district, r.subregion] as const) {
    if (typeof k === 'string' && k.trim()) return k.trim();
  }
  return '';
}

function resolvePakistanCityFromGeocode(r: Location.LocationGeocodedAddress | null): PakistanCity | undefined {
  if (!r) return undefined;
  const candidates: string[] = [];
  for (const k of [r.city, r.district, r.subregion, r.region] as const) {
    if (typeof k === 'string' && k.trim()) candidates.push(k.trim());
  }
  for (const c of candidates) {
    const exact = findPakistanCityByName(c);
    if (exact) return exact;
  }
  const haystack = candidates.join(' ').toLowerCase();
  for (const pc of PAKISTAN_CITIES) {
    if (haystack.includes(pc.name.toLowerCase())) return pc;
  }
  return undefined;
}

type Params = {
  mode?: Mode;
  vehicleId?: string;
  from?: string;
  to?: string;
  fromLat?: string;
  fromLng?: string;
  toLat?: string;
  toLng?: string;
  centerLat?: string;
  centerLng?: string;
};

function parseNum(x: string | undefined) {
  if (x == null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function mapsKeyFromConfig(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as any;
  const key = String(extra.googleMapsApiKey ?? '').trim();
  return key;
}

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function loadMaps() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-maps');
    return { MapView: mod.default, Marker: mod.Marker } as {
      MapView: any;
      Marker: any;
    };
  } catch {
    return null;
  }
}

export default function PickLocationScreen() {
  const params = useLocalSearchParams<Params>();
  const mode: Mode = params.mode === 'drop' ? 'drop' : 'pickup';
  const vehicleId = params.vehicleId ?? '';
  const from = (params.from ?? '').trim();
  const to = (params.to ?? '').trim();

  const apiKey = mapsKeyFromConfig();
  const maps = useMemo(() => loadMaps(), []);
  const mapRef = useRef<any>(null);
  const placesRef = useRef<any>(null);

  const initialLat = parseNum(mode === 'pickup' ? params.fromLat : params.toLat);
  const initialLng = parseNum(mode === 'pickup' ? params.fromLng : params.toLng);
  const centerLat = parseNum(params.centerLat);
  const centerLng = parseNum(params.centerLng);

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(() => {
    if (initialLat != null && initialLng != null) return { lat: initialLat, lng: initialLng };
    if (centerLat != null && centerLng != null) return { lat: centerLat, lng: centerLng };
    return { lat: 24.8607, lng: 67.0011 };
  });
  const [address, setAddress] = useState<string>(mode === 'pickup' ? from : to);
  const [ready, setReady] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);
  const reverseTimerRef = useRef<any>(null);
  const reverseReqIdRef = useRef(0);

  const title = mode === 'pickup' ? 'Pick pickup location' : 'Pick drop location';

  const initialRegion: Region = useMemo(() => {
    const lat = marker?.lat ?? 24.8607;
    const lng = marker?.lng ?? 67.0011;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.04, longitudeDelta: 0.04 };
  }, [marker?.lat, marker?.lng]);

  const [region, setRegion] = useState<Region>(initialRegion);

  const flowTrip = String((params as any).flow ?? '') === 'trip';
  const hasExplicitMapStart =
    (initialLat != null && initialLng != null) || (centerLat != null && centerLng != null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setReady(true);
          return;
        }
        if (flowTrip && hasExplicitMapStart) {
          setReady(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setMarker({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.animateToRegion(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          350,
        );
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setMarkerAndCenter(lat: number, lng: number) {
    setMarker({ lat, lng });
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      350,
    );
  }

  function scheduleReverseGeocode(lat: number, lng: number) {
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      if (isTyping) return;
      const reqId = ++reverseReqIdRef.current;
      try {
        const rows = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (reqId !== reverseReqIdRef.current) return;
        const r = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const line = r
          ? [r.name, r.street, r.city, r.region, r.country].filter((x) => typeof x === 'string' && x.trim().length > 0).join(', ')
          : '';
        if (line) {
          setAddress(line);
          placesRef.current?.setAddressText?.(line);
        }
      } catch {
        // ignore
      }
    }, 450);
  }

  async function confirm() {
    const picked = marker;
    let line = address.trim();
    let geoRow: Location.LocationGeocodedAddress | null = null;

    if (picked) {
      try {
        const rows = await Location.reverseGeocodeAsync({ latitude: picked.lat, longitude: picked.lng });
        geoRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!line && geoRow) {
          line = [geoRow.name, geoRow.street, geoRow.city, geoRow.region, geoRow.country]
            .filter((x) => typeof x === 'string' && x.trim().length > 0)
            .join(', ');
          if (line) {
            setAddress(line);
            placesRef.current?.setAddressText?.(line);
          }
        }
      } catch {
        // ignore
      }
    }
    if (!line && picked) line = 'Selected location';

    const flowTrip = String((params as any).flow ?? '') === 'trip';
    if (flowTrip) {
      if (!picked) {
        Alert.alert('Missing location', 'Please select a location first.');
        return;
      }
      const trip = useTripDraftStore.getState();
      const pk = resolvePakistanCityFromGeocode(geoRow);
      const looseCity = cityLineFromGeocode(geoRow);

      if (mode === 'pickup') {
        trip.setPickupMap(line, picked.lat, picked.lng);
        const cityName = (pk?.name ?? looseCity) || trip.serviceCity.trim();
        trip.setPickupCity(cityName);
        if (pk) trip.setServiceCity(pk.name, pk.lat, pk.lng);
      } else {
        trip.setDropMap(line, picked.lat, picked.lng);
        const cityName = (pk?.name ?? looseCity) || trip.dropCity.trim() || trip.serviceCity.trim();
        trip.setDropCity(cityName);
      }
      router.back();
      return;
    }

    if (!vehicleId) {
      router.back();
      return;
    }
    if (!picked) {
      Alert.alert('Missing location', 'Please select a location first.');
      return;
    }

    const nextParams: any = {
      vehicleId,
      from,
      to,
      fromLat: params.fromLat,
      fromLng: params.fromLng,
      toLat: params.toLat,
      toLng: params.toLng,
    };

    if (mode === 'pickup') {
      nextParams.from = line;
      nextParams.fromLat = String(picked.lat);
      nextParams.fromLng = String(picked.lng);
    } else {
      nextParams.to = line;
      nextParams.toLat = String(picked.lat);
      nextParams.toLng = String(picked.lng);
    }

    router.replace({ pathname: '/book-vehicle' as any, params: nextParams });
  }

  if (!apiKey) {
    return (
      <LinearGradient
        colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <BackButton />
            <Text className="text-base font-extrabold text-gray-200">{title}</Text>
            <View className="h-10 w-10" />
          </View>
          <View
            className="mt-6 rounded-2xl p-4"
            style={{ backgroundColor: '#0B0F14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Text className="text-sm font-extrabold" style={{ color: '#C9B37A' }}>
              Google Maps API key missing
            </Text>
            <Text className="mt-2 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
              Add your key in `armoured/app.json` under `expo.extra.googleMapsApiKey` (and the iOS/Android config keys),
              then rebuild the dev client.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!maps) {
    return (
      <LinearGradient
        colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <BackButton />
            <Text className="text-base font-extrabold text-gray-200">{title}</Text>
            <View className="h-10 w-10" />
          </View>
          <View
            className="mt-6 rounded-2xl p-4"
            style={{ backgroundColor: '#0B0F14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Text className="text-sm font-extrabold" style={{ color: '#C9B37A' }}>
              Maps module not available in this build
            </Text>
            <Text className="mt-2 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
              Your current dev client was built without `react-native-maps`. Add the `react-native-maps` plugin in `armoured/app.json` and rebuild
              the dev client.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <BackButton />
            <Text className="text-base font-extrabold text-gray-200">{title}</Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <View className="flex-1 px-5 pt-4">
          {/* Autocomplete must be above MapView (Android needs elevation). */}
          <View style={{ position: 'absolute', left: 20, right: 20, top: 16, zIndex: 1000, elevation: 1000 }}>
            <GooglePlacesAutocomplete
              ref={placesRef}
              placeholder="Search location..."
              fetchDetails
              enablePoweredByContainer={false}
              debounce={400}
              minLength={2}
              listViewDisplayed={isTyping && address.trim().length >= 2}
              keyboardShouldPersistTaps="handled"
              onPress={(data, details) => {
                const lat = details?.geometry?.location?.lat;
                const lng = details?.geometry?.location?.lng;
                const formatted = details?.formatted_address ?? data.description;
                if (typeof formatted === 'string') {
                  setAddress(formatted);
                  placesRef.current?.setAddressText?.(formatted);
                }
                setIsTyping(false);
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                if (typeof lat === 'number' && typeof lng === 'number') {
                  setMarkerAndCenter(lat, lng);
                }
              }}
              query={{ key: apiKey, language: 'en' }}
              onFail={(e) => {
                console.warn('places_autocomplete_failed', e);
              }}
              textInputProps={{
                onFocus: () => setIsTyping(true),
                onBlur: () => setIsTyping(false),
                onChangeText: (t: string) => {
                  setAddress(t);
                  setIsTyping(true);
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                  typingTimerRef.current = setTimeout(() => setIsTyping(false), 900);
                },
                placeholderTextColor: '#9CA3AF',
              }}
              styles={{
                container: {
                  flex: 0,
                },
                textInputContainer: {
                  flexDirection: 'row',
                },
                textInput: {
                  backgroundColor: '#0B0F14',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#F3F4F6',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                },
                listView: {
                  position: 'absolute',
                  top: 52,
                  left: 0,
                  right: 0,
                  borderRadius: 16,
                  marginTop: 6,
                  overflow: 'hidden',
                  backgroundColor: '#0B0F14',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  maxHeight: 260,
                  zIndex: 1000,
                  elevation: 1000,
                },
                row: {
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: '#0B0F14',
                },
                separator: {
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                },
                description: {
                  color: '#F3F4F6',
                  fontWeight: '600',
                },
                predefinedPlacesDescription: {
                  color: '#9CA3AF',
                },
              }}
            />
          </View>

          <View
            className="flex-1 overflow-hidden rounded-3xl"
            style={{
              marginTop: 70,
              zIndex: 0,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              backgroundColor: '#0B0F14',
            }}>
            <maps.MapView
              ref={(r: any) => {
                mapRef.current = r;
              }}
              style={{ flex: 1 }}
              provider="google"
              initialRegion={initialRegion}
              onRegionChangeComplete={(next: any) => {
                if (!next) return;
                const nextRegion = {
                  latitude: Number(next.latitude),
                  longitude: Number(next.longitude),
                  latitudeDelta: Number(next.latitudeDelta),
                  longitudeDelta: Number(next.longitudeDelta),
                };
                if (!Number.isFinite(nextRegion.latitude) || !Number.isFinite(nextRegion.longitude)) return;
                setRegion(nextRegion);
                setMarker({ lat: nextRegion.latitude, lng: nextRegion.longitude });
                scheduleReverseGeocode(nextRegion.latitude, nextRegion.longitude);
              }}
            >
              {/* Intentionally no marker: we use a fixed center pin overlay */}
            </maps.MapView>
          </View>

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 20,
              right: 20,
              top: 120,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ transform: [{ translateY: -18 }] }}>
              <FontAwesome name="map-marker" size={34} color="#C9B37A" />
            </View>
          </View>

          <Pressable
            disabled={!ready}
            onPress={confirm}
            className="mt-4 items-center rounded-2xl py-4"
            style={{
              backgroundColor: ready ? '#C9B37A' : 'rgba(255,255,255,0.08)',
              opacity: ready ? 1 : 0.7,
            }}>
            <Text
              className="text-sm font-extrabold"
              style={{ color: ready ? '#0B0F14' : '#9CA3AF' }}>
              {ready ? 'Confirm location' : 'Loading…'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

