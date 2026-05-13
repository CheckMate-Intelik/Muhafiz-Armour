import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  filterPakistanCities,
  findPakistanCityByName,
  type PakistanCity,
} from '@/constants/pakistanCities';
import { useTripDraftStore } from '@/store/tripDraft';

type CityPickerTarget = 'pickup' | 'drop' | null;
type MapTarget = 'pickup' | 'drop';

const cardOuter = {
  backgroundColor: '#0B0F14',
  borderColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

export default function NewBookingScreen() {
  const draft = useTripDraftStore();
  const [cityPicker, setCityPicker] = useState<CityPickerTarget>(null);
  const [cityQuery, setCityQuery] = useState('');

  const pickupCityName = draft.pickupCity.trim();
  const dropCityName = draft.dropCity.trim();
  const pickupLocationReady =
    pickupCityName.length > 0 && draft.pickupLat != null && draft.pickupAddress.trim().length > 0;
  const dropLocationReady =
    dropCityName.length > 0 && draft.dropLat != null && draft.dropAddress.trim().length > 0;
  const canContinue = pickupLocationReady && dropLocationReady;

  const filteredCities = useMemo(() => filterPakistanCities(cityQuery), [cityQuery]);

  function openCityPicker(target: 'pickup' | 'drop') {
    setCityQuery('');
    setCityPicker(target);
  }

  function chooseCity(c: PakistanCity) {
    if (cityPicker === 'pickup') {
      draft.setPickupCity(c.name);
      draft.setServiceCity(c.name, c.lat, c.lng);
      // Clear stale pickup map data when city changes.
      useTripDraftStore.setState({ pickupAddress: '', pickupLat: null, pickupLng: null });
    } else if (cityPicker === 'drop') {
      draft.setDropCity(c.name);
      useTripDraftStore.setState({ dropAddress: '', dropLat: null, dropLng: null });
    }
    setCityPicker(null);
  }

  function openMap(target: MapTarget) {
    const cityName = target === 'pickup' ? pickupCityName : dropCityName;
    const match = findPakistanCityByName(cityName);
    const center =
      match != null
        ? { centerLat: String(match.lat), centerLng: String(match.lng) }
        : draft.serviceCityLat != null && draft.serviceCityLng != null
          ? { centerLat: String(draft.serviceCityLat), centerLng: String(draft.serviceCityLng) }
          : {};

    router.push({
      pathname: '/pick-location' as any,
      params: {
        flow: 'trip',
        mode: target,
        from: target === 'pickup' ? draft.pickupAddress : undefined,
        to: target === 'drop' ? draft.dropAddress : undefined,
        ...center,
      },
    });
  }

  function continueToSchedule() {
    if (!canContinue) return;
    router.push('/trip-schedule' as any);
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
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <FontAwesome name="arrow-left" size={16} color="#9CA3AF" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-200">New booking</Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-6">
          <Text
            className="text-[13px] font-extrabold"
            style={{ letterSpacing: 2, color: '#9CA3AF' }}>
            TRIP LOCATIONS
          </Text>
          <Text className="mt-1 text-sm font-semibold text-gray-300">
            Pick the city and exact spots for your pickup and drop-off.
          </Text>

          <LocationCard
            title="PICKUP"
            icon="map-marker"
            accentColor="#22C55E"
            cityName={pickupCityName}
            address={draft.pickupAddress}
            locationReady={pickupLocationReady}
            onPressCity={() => openCityPicker('pickup')}
            onPressMap={() => openMap('pickup')}
          />

          <LocationCard
            title="DROP-OFF"
            icon="flag-checkered"
            accentColor="#EF4444"
            cityName={dropCityName}
            address={draft.dropAddress}
            locationReady={dropLocationReady}
            disabledMap={pickupCityName.length === 0}
            onPressCity={() => openCityPicker('drop')}
            onPressMap={() => openMap('drop')}
          />

          <Pressable
            disabled={!canContinue}
            onPress={continueToSchedule}
            className="mt-6 items-center justify-center rounded-2xl py-4"
            style={{
              backgroundColor: canContinue ? '#C9B37A' : 'rgba(255,255,255,0.08)',
              opacity: canContinue ? 1 : 0.7,
            }}>
            <Text
              className="text-sm font-extrabold"
              style={{ color: canContinue ? '#0B0F14' : '#9CA3AF' }}>
              {canContinue ? 'Continue — date & time' : 'Select pickup and drop-off first'}
            </Text>
          </Pressable>
        </ScrollView>

        <Modal
          transparent
          visible={cityPicker !== null}
          animationType="slide"
          onRequestClose={() => setCityPicker(null)}>
          <Pressable
            className="flex-1"
            onPress={() => setCityPicker(null)}
            style={{ backgroundColor: 'rgba(2,6,23,0.7)' }}>
            <View
              onStartShouldSetResponder={() => true}
              className="mt-auto rounded-t-3xl px-5 pb-8 pt-4"
              style={{
                backgroundColor: '#0B0F14',
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.08)',
                maxHeight: '85%',
                minHeight: '60%',
              }}>
              <View className="items-center pb-3">
                <View
                  style={{
                    height: 4,
                    width: 48,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}
                />
              </View>

              <Text
                className="text-[13px] font-extrabold"
                style={{ letterSpacing: 2, color: '#C9B37A' }}>
                {cityPicker === 'pickup' ? 'PICKUP CITY' : 'DROP-OFF CITY'}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gray-300">
                Pick a city in Pakistan
              </Text>

              <View
                className="mt-3 flex-row items-center rounded-2xl px-3"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}>
                <FontAwesome name="search" size={14} color="#9CA3AF" />
                <TextInput
                  value={cityQuery}
                  onChangeText={setCityQuery}
                  placeholder="Search city…"
                  placeholderTextColor="#9CA3AF"
                  className="ml-2 flex-1 py-3 text-sm font-semibold"
                  style={{ color: '#F3F4F6' }}
                />
                {cityQuery.length > 0 ? (
                  <Pressable onPress={() => setCityQuery('')} hitSlop={8}>
                    <FontAwesome name="times-circle" size={14} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>

              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item.name}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.04)' }} />
                )}
                renderItem={({ item }) => {
                  const selected =
                    (cityPicker === 'pickup' ? pickupCityName : dropCityName).toLowerCase() ===
                    item.name.toLowerCase();
                  return (
                    <Pressable
                      onPress={() => chooseCity(item)}
                      className="flex-row items-center justify-between px-1 py-3">
                      <View className="flex-row items-center">
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: selected ? 'rgba(201,179,122,0.12)' : 'rgba(255,255,255,0.04)',
                          }}>
                          <FontAwesome
                            name="map-pin"
                            size={14}
                            color={selected ? '#C9B37A' : '#9CA3AF'}
                          />
                        </View>
                        <Text
                          className="ml-3 text-sm font-bold"
                          style={{ color: selected ? '#C9B37A' : '#F3F4F6' }}>
                          {item.name}
                        </Text>
                      </View>
                      {selected ? <FontAwesome name="check" size={14} color="#C9B37A" /> : null}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View className="items-center py-12">
                    <Text className="text-sm font-semibold text-gray-300">
                      No matching cities
                    </Text>
                  </View>
                }
              />
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function LocationCard({
  title,
  icon,
  accentColor,
  cityName,
  address,
  locationReady,
  disabledMap,
  onPressCity,
  onPressMap,
}: {
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  accentColor: string;
  cityName: string;
  address: string;
  locationReady: boolean;
  disabledMap?: boolean;
  onPressCity: () => void;
  onPressMap: () => void;
}) {
  const hasCity = cityName.trim().length > 0;
  const mapDisabled = disabledMap === true || !hasCity;

  return (
    <View className="mt-4 overflow-hidden rounded-2xl" style={cardOuter}>
      <View
        className="border-b px-4 py-3"
        style={{ backgroundColor: '#000000', borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className="h-9 w-9 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(201,179,122,0.12)' }}>
              <FontAwesome name={icon} size={14} color={accentColor} />
            </View>
            <Text
              className="ml-3 text-[14px] font-extrabold"
              style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
              {title}
            </Text>
          </View>
          {locationReady ? (
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <Text className="text-[10px] font-extrabold" style={{ color: '#22C55E' }}>
                READY
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="px-4 py-4">
        <Pressable
          onPress={onPressCity}
          className="flex-row items-center justify-between rounded-2xl px-3 py-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}>
          <View className="flex-1 pr-2">
            <Text className="text-[11px] font-bold" style={{ color: '#9CA3AF', letterSpacing: 0.6 }}>
              CITY
            </Text>
            <Text
              numberOfLines={1}
              className={`mt-1 text-[15px] font-extrabold ${hasCity ? 'text-gray-100' : ''}`}
              style={!hasCity ? { color: '#9CA3AF' } : undefined}>
              {hasCity ? cityName : 'Select a city…'}
            </Text>
          </View>
          <FontAwesome name="chevron-down" size={14} color="#9CA3AF" />
        </Pressable>

        <Pressable
          disabled={mapDisabled}
          onPress={onPressMap}
          className="mt-3 flex-row items-center justify-between rounded-2xl px-3 py-3"
          style={{
            backgroundColor: mapDisabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: locationReady ? '#C9B37A' : 'rgba(255,255,255,0.08)',
            opacity: mapDisabled ? 0.5 : 1,
          }}>
          <View className="flex-1 pr-2">
            <Text className="text-[11px] font-bold" style={{ color: '#9CA3AF', letterSpacing: 0.6 }}>
              EXACT LOCATION
            </Text>
            <Text
              numberOfLines={2}
              className="mt-1 text-[14px] font-bold"
              style={{ color: locationReady ? '#F3F4F6' : '#9CA3AF' }}>
              {locationReady
                ? address
                : hasCity
                  ? 'Pick on map…'
                  : 'Choose a city first'}
            </Text>
          </View>
          <FontAwesome name="map" size={16} color={locationReady ? '#C9B37A' : '#9CA3AF'} />
        </Pressable>
      </View>
    </View>
  );
}
