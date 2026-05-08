import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
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
import { apiGet, ensureUserSession } from '@/lib/api';
import { useTripDraftStore } from '@/store/tripDraft';

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
      } catch {
        router.replace('/login' as any);
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
      colors={['rgb(77, 76, 76)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.3, 0.6, 1]}
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
              onPress={() => router.push({ pathname: '/ongoing-trip' as any, params: { bookingId: ongoingTrip.id } })}
              className="mt-4 rounded-2xl bg-[rgb(71,138,44)] px-4 py-3">
              <Text className="text-md font-bold text-gray-200">Ongoing trip</Text>
              <Text className="mt-1 text-[12px] font-semibold text-gray-300">
                {ongoingTrip.pickupLocation}
                {' -> '}
                {ongoingTrip.dropLocation}
              </Text>
              <Text className="text-[12px] font-semibold text-gray-300">
                {ongoingTrip.driverName} • {ongoingTrip.vehicleType}
              </Text>
            </Pressable>
          ) : null}

          
          <Text className="mt-20 text-center text-3xl font-semibold text-gray-200">Where are you going?</Text>

          <Text className="mt-6 text-md font-bold uppercase tracking-wide text-gray-300">Your city</Text>
          <Pressable
            onPress={() => {
              setCityModalKind('service');
              setCitySearch(draft.serviceCity);
              setCityModalOpen(true);
            }}
            className="mt-2 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3.5">
            <View className="flex-1 flex-row items-center">
              <FontAwesome name="map-marker" size={16} color="#111827" />
              <Text className={`ml-3 flex-1 text-sm font-extrabold ${draft.serviceCity ? 'text-gray-900' : 'text-gray-400'}`}>
                {draft.serviceCity || 'Tap to search cities…'}
              </Text>
            </View>
            <FontAwesome name="chevron-down" size={14} color="#6B7280" />
          </Pressable>
          
          <View className="mt-8 gap-5">
            <View>
              {/* <Text className="text-md font-bold uppercase tracking-wide text-gray-300">Pickup</Text> */}
              <Pressable
                onPress={openPickupMapDirect}
                className="h-[70px] mt-2 flex-row items-center rounded-2xl border border-gray-200 px-4 py-3.5">
                <FontAwesome name="dot-circle-o" size={20} color="#6B7280" />
                <Text
                  numberOfLines={2}
                  className={`ml-3 mr-3 flex-1 text-md font-semibold bg-transparent border-b border-gray-200 ${draft.pickupAddress ? 'text-gray-900' : 'text-gray-300'}`}>
                  {draft.pickupAddress || 'Select pickup on map'}
                </Text>
                <FontAwesome name="map-marker" size={20} color="#9CA3AF" />
              </Pressable>
            </View>

            <View>
              <Text className="text-md font-bold uppercase tracking-wide text-gray-800">Drop city</Text>
              <Pressable
                onPress={() => {
                  setCityModalKind('drop');
                  setCitySearch(draft.dropCity);
                  setCityModalOpen(true);
                }}
                className="mt-2 flex-row items-center justify-between rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-sm">
                <View className="flex-1 flex-row items-center">
                  <FontAwesome name="building-o" size={15} color="#111827" />
                  <Text className={`ml-3 flex-1 text-sm font-extrabold ${draft.dropCity ? 'text-gray-900' : 'text-gray-400'}`}>
                    {draft.dropCity || 'Tap to choose drop city'}
                  </Text>
                </View>
                <FontAwesome name="chevron-down" size={14} color="#6B7280" />
              </Pressable>
            </View>

            <View>
              {/* <Text className="text-md font-bold uppercase tracking-wide text-gray-800">Drop location</Text> */}
              <Pressable
                onPress={openDropMapDirect}
                className="h-[70px] mt-2 flex-row items-center rounded-2xl border border-gray-500 px-4 py-3.5">
                <FontAwesome name="map-marker" size={20} color="#6B7280" />
                <Text
                  numberOfLines={2}
                  className={`ml-3 mr-3 flex-1 text-md font-semibold bg-transparent border-b border-gray-500 ${draft.dropAddress ? 'text-gray-900' : 'text-gray-500'}`}>
                  {draft.dropAddress || 'Select drop on map'}
                </Text>
                <FontAwesome name="map" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {hasBothLocations ? (
            <Pressable
              onPress={() => router.push('/trip-schedule' as any)}
              className="mt-8 items-center rounded-2xl bg-[#111827] py-3.5">
              <Text className="text-sm font-extrabold text-white">Next — pickup time & duration</Text>
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
