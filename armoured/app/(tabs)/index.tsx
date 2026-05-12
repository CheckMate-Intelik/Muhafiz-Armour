import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { filterPakistanCities, findPakistanCityByName, type PakistanCity } from '@/constants/pakistanCities';
import { apiGet, ensureUserSession, isNotAuthenticatedError } from '@/lib/api';
import { useTripDraftStore } from '@/store/tripDraft';

const ONGOING_CARD_OUTER_RADIUS = 16;
const ONGOING_CARD_GRADIENT_BORDER = 3;

const ACCENT_GRADIENT_COLORS = ['#81C784', '#4CAF50', '#2E7D32', '#66BB6A'] as const;
const ACCENT_GRADIENT_COLORS_2 = ['rgb(128, 128, 128)','rgb(155, 155, 155)', 'rgb(178, 178, 178)', 'rgb(128, 128, 128)'] as const;
const FIELD_GRADIENT_BORDER = 2.5;
const FIELD_PILL_RADIUS = 9999;
const FIELD_LOCATION_RADIUS = 16;

export default function Home() {
  const draft = useTripDraftStore();
  const setServiceCity = useTripDraftStore((s) => s.setServiceCity);
  const setDropCity = useTripDraftStore((s) => s.setDropCity);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [ongoingTrip, setOngoingTrip] = useState<null | {
    id: string;
    pickupLocation: string;
    dropLocation: string;
    driverName: string;
    vehicleType: string;
  }>(null);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [cityModalKind, setCityModalKind] = useState<'service' | 'drop' | null>(null);
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = useMemo(() => filterPakistanCities(citySearch), [citySearch]);

  const hasBothLocations =
    draft.pickupLat != null &&
    draft.pickupLng != null &&
    draft.dropLat != null &&
    draft.dropLng != null &&
    draft.pickupCity.trim().length > 0 &&
    draft.dropCity.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const s = await ensureUserSession();
        if (cancelled) return;
        setUserId(s.userId);
        const sessionName = (s.name ?? '').trim();
        if (sessionName.length > 0 && sessionName.toLowerCase() !== 'user') {
          setUserName(sessionName);
          return;
        }
        const me = await apiGet<{ name?: string }>(`/users/me`, s.userId);
        if (cancelled) return;
        const profileName = (me?.name ?? '').trim();
        if (profileName.length > 0) setUserName(profileName);
      } catch (e) {
        if (isNotAuthenticatedError(e)) {
          router.replace('/login' as any);
        }
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let sub: any = null;
    async function loadOngoing() {
      if (!userId) return;
      try {
        const rows = await apiGet<any[]>(`/bookings`, userId);
        const b = Array.isArray(rows) ? rows.find((x) => x?.status === 'IN_PROGRESS') : null;
        if (cancelled) return;
        if (!b) {
          setOngoingTrip(null);
          return;
        }
        setOngoingTrip({
          id: String(b.id),
          pickupLocation: String(b.pickupLocation ?? ''),
          dropLocation: String(b.dropLocation ?? ''),
          driverName: String(b.driver?.name ?? '—'),
          vehicleType: String(b.vehicle?.armourLevel ?? '—'),
        });
      } catch {
        // ignore
      }
    }
    void (async () => {
      await loadOngoing();
      sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void loadOngoing();
      });
    })();
    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [userId]);

  function closeCityModal() {
    setCityModalOpen(false);
    setCityModalKind(null);
    setCitySearch('');
  }

  function selectCityFromModal(c: PakistanCity) {
    if (cityModalKind === 'drop') {
      setDropCity(c.name);
    } else {
      setServiceCity(c.name, c.lat, c.lng);
      const st = useTripDraftStore.getState();
      if (!st.dropCity.trim()) setDropCity(c.name);
    }
    closeCityModal();
  }

  function openPickupMapDirect() {
    const d = useTripDraftStore.getState();
    if (!d.serviceCity.trim() || d.serviceCityLat == null || d.serviceCityLng == null) {
      Alert.alert('Select city', 'Choose your city from the list first.');
      setCityModalKind('service');
      setCitySearch(d.serviceCity);
      setCityModalOpen(true);
      return;
    }
    router.push({
      pathname: '/pick-location' as any,
      params: {
        flow: 'trip',
        mode: 'pickup',
        from: d.serviceCity,
        centerLat: String(d.serviceCityLat),
        centerLng: String(d.serviceCityLng),
      },
    });
  }

  function openDropMapDirect() {
    const d = useTripDraftStore.getState();
    if (!d.serviceCity.trim() || d.serviceCityLat == null || d.serviceCityLng == null) {
      Alert.alert('Select city', 'Choose your city from the list first.');
      setCityModalKind('service');
      setCitySearch(d.serviceCity);
      setCityModalOpen(true);
      return;
    }
    if (!d.pickupAddress || d.pickupLat == null) {
      Alert.alert('Pickup first', 'Choose your pickup location on the map before drop-off.');
      return;
    }
    if (!d.dropCity.trim()) {
      Alert.alert('Drop city', 'Choose the drop-off city first.');
      setCityModalKind('drop');
      setCitySearch('');
      setCityModalOpen(true);
      return;
    }
    const dropPk = findPakistanCityByName(d.dropCity.trim());
    const lat = dropPk?.lat ?? d.serviceCityLat;
    const lng = dropPk?.lng ?? d.serviceCityLng;
    router.push({
      pathname: '/pick-location' as any,
      params: {
        flow: 'trip',
        mode: 'drop',
        to: dropPk?.name ?? d.dropCity.trim(),
        centerLat: String(lat),
        centerLng: String(lng),
      },
    });
  }

  return (
    <LinearGradient
      colors={['rgb(51, 47, 56)','rgb(88, 88, 90)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[18px] font-semibold text-gray-200">Welcome!</Text>
              <Text className="text-lg font-semibold text-gray-200">{userName || 'User'}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <FontAwesome name="bell-o" size={16} color="#111827" />
              </Pressable>
              <Image source={{ uri: 'https://i.pravatar.cc/96?img=12' }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            </View>
          </View>

          {ongoingTrip ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/booking-details' as any,
                  params: { id: ongoingTrip.id, live: '1' },
                })
              }
              className="mt-4 overflow-hidden"
              style={{
                borderRadius: ONGOING_CARD_OUTER_RADIUS,
                shadowColor: '#4CAF50',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 12,
                elevation: 10,
              }}>
              <LinearGradient
                colors={ACCENT_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: ONGOING_CARD_GRADIENT_BORDER,
                  borderRadius: ONGOING_CARD_OUTER_RADIUS,
                }}>
                <View
                  className="overflow-hidden bg-[#121212]"
                  style={{
                    borderRadius: ONGOING_CARD_OUTER_RADIUS - ONGOING_CARD_GRADIENT_BORDER,
                  }}>
                  <View className="flex-row px-4 py-3.5">
                    <View className="min-w-0 flex-1 pr-2">
                      <Text
                        className="text-lg font-extrabold uppercase"
                        style={{ letterSpacing: 1.2, color: '#A0A0A0' }}>
                        Active op
                      </Text>

                      <View className="flex-row items-center gap-2">
                        <FontAwesome name="map-marker" size={18} color="#6B7280" />
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          className="mt-1.5 text-lg font-semibold"
                          style={{ color: '#A0A0A0' }}>
                          {ongoingTrip.pickupLocation} → {ongoingTrip.dropLocation}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <FontAwesome name="user" size={18} color="#6B7280" />
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          className="mt-1 text-md font-semibold"
                          style={{ color: '#A0A0A0' }}>
                          {ongoingTrip.driverName}
                        </Text>
                        <FontAwesome name="shield" size={18} color="#6B7280" />
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          className="mt-1 text-md font-semibold"
                          style={{ color: '#A0A0A0' }}>
                          {ongoingTrip.vehicleType}
                        </Text>
                      </View>
                    </View>
                    <View className="h-[88px] w-[56px] items-center justify-around pt-0.5">
                      <ActivityIndicator size="large" color="#4CAF50" />
                      <FontAwesome name="car" size={26} color="#6B6B6B" style={{ marginBottom: 2 }} />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          ) : null}

          
          <Text className="mt-20 text-center text-3xl font-semibold text-gray-200">Where are you going?</Text>

          <View className='bg-black mb-4 mt-4 rounded-2xl'>
            <Text className="text-xl py-1 ml-8 font-bold tracking-wide text-gray-400">Your city</Text>
          <View className='bg-gray-300 rounded-xl'>
            <Pressable
              onPress={() => {
                setCityModalKind('service');
                setCitySearch(draft.serviceCity);
                setCityModalOpen(true);
              }}
              className="overflow-hidden"
              style={{ borderRadius: FIELD_PILL_RADIUS }}>
              {/* <LinearGradient
                colors={ACCENT_GRADIENT_COLORS_2}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: FIELD_GRADIENT_BORDER,
                  borderRadius: FIELD_PILL_RADIUS,
                }}> */}
                <View
                  className="flex-row mt-1 items-center justify-between px-4 py-2 border-b border-gray-500"
                  style={{ borderRadius: FIELD_PILL_RADIUS - FIELD_GRADIENT_BORDER }}>
                  <FontAwesome name="map-marker" size={24} color="rgb(56, 56, 56)" />
                  <View className="ml-3 flex-1">
                    {/* <Text className="text-lg font-bold tracking-wide text-gray-600">Your city</Text> */}
                    <Text className={`text-xl font-bold ${draft.serviceCity ? 'text-gray-800' : 'text-gray-500'}`}>
                      {draft.serviceCity || 'Tap to choose pickup city'}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-down" size={14} color="rgb(56, 56, 56)" />
                </View>
              {/* </LinearGradient> */}
            </Pressable>
          
            <Pressable
              onPress={openPickupMapDirect}
              className="overflow-hidden"
              style={{ borderRadius: FIELD_LOCATION_RADIUS }}>
              {/* <LinearGradient
                colors={ACCENT_GRADIENT_COLORS_2}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: FIELD_GRADIENT_BORDER,
                  borderRadius: FIELD_LOCATION_RADIUS,
                }}> */}
                <View
                  className="h-[70px] flex-row items-center px-4 py-3.5"
                  style={{ borderRadius: FIELD_LOCATION_RADIUS - FIELD_GRADIENT_BORDER }}>
                  <FontAwesome name="dot-circle-o" size={22} color="rgb(56, 56, 56)" />
                  <Text
                    numberOfLines={2}
                    className={`ml-3 mr-3 flex-1 text-lg font-semibold bg-transparent border-b border-gray-500 ${draft.pickupAddress ? 'text-gray-800' : 'text-gray-500'}`}>
                    {draft.pickupAddress || 'Select pickup on map'}
                  </Text>
                  <FontAwesome name="map" size={20} color="rgb(56, 56, 56)" />
                </View>
              {/* </LinearGradient> */}
            </Pressable>
          </View>
          </View>

            <View
            style={{
              alignSelf: 'center',
              width: '100%',
              marginVertical: 4,
              borderBottomWidth: 2,
              borderBottomColor: 'rgb(222, 221, 221)',
              borderStyle: 'dashed',
            }}
          />

        <View className='bg-black mb-4 mt-4 rounded-2xl'>
          <Text className="text-xl py-1 ml-8 font-bold tracking-wide text-gray-400">Drop city</Text>
        <View className='bg-gray-300 rounded-xl'>
          <Pressable
            onPress={() => {
              setCityModalKind('drop');
              setCitySearch(draft.dropCity);
              setCityModalOpen(true);
            }}
            className="overflow-hidden border-b border-gray-400"
            style={{ borderRadius: FIELD_PILL_RADIUS }}>
            {/* <LinearGradient
              colors={ACCENT_GRADIENT_COLORS_2}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: FIELD_GRADIENT_BORDER,
                borderRadius: FIELD_PILL_RADIUS,
              }}> */}
              <View
                className="flex-row mt-1 items-center justify-between px-4 py-2"
                style={{ borderRadius: FIELD_PILL_RADIUS - FIELD_GRADIENT_BORDER }}>
                <FontAwesome name="building-o" size={22} color="rgb(56, 56, 56)" />
                <View className="ml-3 flex-1">
                  {/* <Text className="text-md font-bold tracking-wide text-gray-600">Drop city</Text> */}
                  <Text className={`text-lg font-bold ${draft.dropCity ? 'text-gray-800' : 'text-gray-500'}`}>
                    {draft.dropCity || 'Tap to choose drop city'}
                  </Text>
                </View>
                <FontAwesome name="chevron-down" size={14} color="rgb(56, 56, 56)" />
              </View>
            {/* </LinearGradient> */}
          </Pressable>

          <Pressable
            onPress={openDropMapDirect}
            className="overflow-hidden"
            style={{ borderRadius: FIELD_LOCATION_RADIUS }}>
            {/* <LinearGradient
              colors={ACCENT_GRADIENT_COLORS_2}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: FIELD_GRADIENT_BORDER,
                borderRadius: FIELD_LOCATION_RADIUS,
              }}> */}
              <View
                className="h-[70px] flex-row items-center px-4 py-3.5"
                style={{ borderRadius: FIELD_LOCATION_RADIUS - FIELD_GRADIENT_BORDER }}>
                <FontAwesome name="map-marker" size={24} color="rgb(56, 56, 56)" />
                <Text
                  numberOfLines={2}
                  className={`ml-3 mr-3 flex-1 text-lg font-semibold bg-transparent border-b border-gray-400 ${draft.dropAddress ? 'text-gray-800' : 'text-gray-500'}`}>
                  {draft.dropAddress || 'Select drop on map'}
                </Text>
                <FontAwesome name="map" size={20} color="rgb(56, 56, 56)" />
              </View>
            {/* </LinearGradient> */}
          </Pressable>
        </View>
        </View>

          {hasBothLocations ? (
            <Pressable
              onPress={() => router.push('/trip-schedule' as any)}
              className="mt-4 items-center rounded-full bg-[#111827] py-3.5">
              <Text className="text-lg font-extrabold text-white">Next — pickup time & duration</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <Modal visible={cityModalOpen} animationType="slide" transparent onRequestClose={closeCityModal}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="max-h-[85%] rounded-t-3xl bg-white px-4 pb-6 pt-3">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-gray-900">
                  {cityModalKind === 'drop' ? 'Drop city' : 'Pakistan cities'}
                </Text>
                <Pressable onPress={closeCityModal} hitSlop={12}>
                  <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
                </Pressable>
              </View>
              <View className="flex-row items-center rounded-2xl bg-gray-100 px-3 py-2">
                <FontAwesome name="search" size={14} color="#6B7280" />
                <TextInput
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholder="Type to search…"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                  className="ml-2 flex-1 py-2 text-sm font-semibold text-gray-900"
                />
              </View>
              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item.name}
                keyboardShouldPersistTaps="handled"
                className="mt-2"
                style={{ maxHeight: 420 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => selectCityFromModal(item)} className="border-b border-gray-100 py-3.5">
                    <Text className="text-sm font-extrabold text-gray-900">{item.name}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text className="py-6 text-center text-sm font-semibold text-gray-500">No matching city.</Text>
                }
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}
