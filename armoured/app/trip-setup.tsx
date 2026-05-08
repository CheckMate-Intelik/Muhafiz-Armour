import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { findPakistanCityByName } from '@/constants/pakistanCities';
import { useTripDraftStore } from '@/store/tripDraft';

type Phase = 'pickupCity' | 'pickupMap' | 'dropCity' | 'dropMap';

export default function TripSetupScreen() {
  const { entry } = useLocalSearchParams<{ entry?: string }>();
  const draft = useTripDraftStore();
  const [phase, setPhase] = useState<Phase>('pickupCity');
  const [pickupCityInput, setPickupCityInput] = useState(draft.pickupCity);
  const [dropCityInput, setDropCityInput] = useState(draft.dropCity);

  useEffect(() => {
    const d = useTripDraftStore.getState();
    const sc = d.serviceCity.trim();
    const hasService = sc.length > 0 && d.serviceCityLat != null && d.serviceCityLng != null;

    if (entry === 'drop') {
      if (!d.pickupAddress || d.pickupLat == null) {
        if (hasService) {
          d.setPickupCity(sc);
          setPickupCityInput(sc);
          setPhase('pickupMap');
        } else {
          setPhase('pickupCity');
        }
        return;
      }
      setDropCityInput((prev) => (prev.trim() ? prev : d.dropCity || sc));
      setPhase('dropCity');
      return;
    }

    if (hasService) {
      d.setPickupCity(sc);
      setPickupCityInput(sc);
      setPhase('pickupMap');
    } else {
      setPhase('pickupCity');
    }
  }, [entry]);

  useFocusEffect(
    useCallback(() => {
      const d = useTripDraftStore.getState();
      if (entry === 'drop' && (!d.pickupAddress || d.pickupLat == null)) {
        const sc = d.serviceCity.trim();
        if (sc && d.serviceCityLat != null) {
          d.setPickupCity(sc);
          setPickupCityInput(sc);
          setPhase('pickupMap');
        } else {
          setPhase('pickupCity');
        }
      }
    }, [entry]),
  );

  function mapCenterParams(): { centerLat: string; centerLng: string } | Record<string, never> {
    const d = useTripDraftStore.getState();
    if (d.serviceCityLat != null && d.serviceCityLng != null) {
      return { centerLat: String(d.serviceCityLat), centerLng: String(d.serviceCityLng) };
    }
    return {};
  }

  function openPickupMap() {
    const match = findPakistanCityByName(pickupCityInput.trim());
    const fallback = mapCenterParams();
    const center =
      match != null
        ? { centerLat: String(match.lat), centerLng: String(match.lng) }
        : Object.keys(fallback).length > 0
          ? fallback
          : {};
    router.push({
      pathname: '/pick-location' as any,
      params: {
        flow: 'trip',
        mode: 'pickup',
        from: pickupCityInput.trim() || draft.pickupAddress,
        ...center,
      },
    });
  }

  function openDropMap() {
    const match = findPakistanCityByName(dropCityInput.trim());
    const d = useTripDraftStore.getState();
    const center =
      match != null
        ? { centerLat: String(match.lat), centerLng: String(match.lng) }
        : d.serviceCityLat != null && d.serviceCityLng != null
          ? { centerLat: String(d.serviceCityLat), centerLng: String(d.serviceCityLng) }
          : {};
    router.push({
      pathname: '/pick-location' as any,
      params: {
        flow: 'trip',
        mode: 'drop',
        to: dropCityInput.trim() || draft.dropAddress,
        ...center,
      },
    });
  }

  function nextFromPickupCity() {
    const c = pickupCityInput.trim();
    if (!c) {
      Alert.alert('City required', 'Enter pickup city.');
      return;
    }
    draft.setPickupCity(c);
    setPhase('pickupMap');
  }

  function nextFromPickupMap() {
    if (draft.pickupLat == null || !draft.pickupAddress.trim()) {
      Alert.alert('Location required', 'Select pickup location on the map.');
      return;
    }
    setPhase('dropCity');
  }

  function nextFromDropCity() {
    const c = dropCityInput.trim();
    if (!c) {
      Alert.alert('City required', 'Enter drop-off city.');
      return;
    }
    draft.setDropCity(c);
    setPhase('dropMap');
  }

  function nextFromDropMap() {
    if (draft.dropLat == null || !draft.dropAddress.trim()) {
      Alert.alert('Location required', 'Select drop-off location on the map.');
      return;
    }
    router.replace('/(tabs)' as any);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Trip locations</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-6">
        {phase === 'pickupCity' ? (
          <View>
            <Text className="text-sm font-extrabold text-gray-900">1. Pickup city</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">Where should the driver meet you?</Text>
            <TextInput
              value={pickupCityInput}
              onChangeText={setPickupCityInput}
              placeholder="e.g. Karachi"
              placeholderTextColor="#9CA3AF"
              className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900"
            />
            <Pressable onPress={nextFromPickupCity} className="mt-6 items-center rounded-2xl bg-[#111827] py-3">
              <Text className="text-xs font-extrabold text-white">Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'pickupMap' ? (
          <View>
            <Text className="text-sm font-extrabold text-gray-900">2. Exact pickup on map</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">City: {draft.pickupCity}</Text>
            <Pressable onPress={openPickupMap} className="mt-4 items-center rounded-2xl border-2 border-dashed border-gray-300 py-8">
              <FontAwesome name="map-marker" size={28} color="#111827" />
              <Text className="mt-2 text-xs font-extrabold text-gray-800">Open map picker</Text>
            </Pressable>
            {draft.pickupAddress ? (
              <Text className="mt-3 text-xs font-semibold text-gray-600" numberOfLines={3}>
                {draft.pickupAddress}
              </Text>
            ) : null}
            <Pressable onPress={nextFromPickupMap} className="mt-6 items-center rounded-2xl bg-[#111827] py-3">
              <Text className="text-xs font-extrabold text-white">Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'dropCity' ? (
          <View>
            <Text className="text-sm font-extrabold text-gray-900">3. Drop-off city</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">Where is the destination area?</Text>
            <TextInput
              value={dropCityInput}
              onChangeText={setDropCityInput}
              placeholder="e.g. Lahore"
              placeholderTextColor="#9CA3AF"
              className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900"
            />
            <Pressable onPress={nextFromDropCity} className="mt-6 items-center rounded-2xl bg-[#111827] py-3">
              <Text className="text-xs font-extrabold text-white">Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'dropMap' ? (
          <View>
            <Text className="text-sm font-extrabold text-gray-900">4. Exact drop-off on map</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">City: {draft.dropCity}</Text>
            <Pressable onPress={openDropMap} className="mt-4 items-center rounded-2xl border-2 border-dashed border-gray-300 py-8">
              <FontAwesome name="map-marker" size={28} color="#111827" />
              <Text className="mt-2 text-xs font-extrabold text-gray-800">Open map picker</Text>
            </Pressable>
            {draft.dropAddress ? (
              <Text className="mt-3 text-xs font-semibold text-gray-600" numberOfLines={3}>
                {draft.dropAddress}
              </Text>
            ) : null}
            <Pressable onPress={nextFromDropMap} className="mt-6 items-center rounded-2xl bg-[#111827] py-3">
              <Text className="text-xs font-extrabold text-white">Next: date & duration</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
