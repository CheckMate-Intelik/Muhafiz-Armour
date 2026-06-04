import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, ViewStyle } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { APP_GRADIENT, AUTH_CARD, AUTH_GOLD } from '@/components/AuthForm';
import { BackButton } from '@/components/BackButton';
import { PUBLIC_API_BASE_URL } from '@/lib/api';
import { VehicleCard, VehicleCardData } from '@/components/VehicleCard';
import { useTripDraftStore } from '@/store/tripDraft';

const CARD_SHADOW: ViewStyle = {
  backgroundColor: AUTH_CARD,
  borderColor: 'rgba(255,255,255,0.06)',
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

export default function VehicleSelectScreen() {
  const filterSheetRef = useRef<any>(null);
  const draft = useTripDraftStore();
  const [search, setSearch] = useState('');
  const [selectedArmours, setSelectedArmours] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [selectedCarTypes, setSelectedCarTypes] = useState<string[]>(['ALL']);
  const [armourTypes, setArmourTypes] = useState<string[]>([]);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<string[]>(['ALL']);
  const [carTypePickerOpen, setCarTypePickerOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [vehicles, setVehicles] = useState<VehicleCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const startIso = draft.startTimeIso;
  const baseHours = draft.baseDurationHours;

  const window = useMemo(() => {
    if (!startIso || !baseHours) return null;
    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + baseHours * 60 * 60 * 1000);
    return { start, end };
  }, [startIso, baseHours]);

  useEffect(() => {
    if (!window) {
      router.replace('/(tabs)' as any);
    }
  }, [window]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/options`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          armourLevels?: { code: string; label: string }[];
          vehicleTypes?: { code: string; label: string }[];
        };
        if (cancelled) return;
        const nextArmours = Array.isArray(data.armourLevels)
          ? data.armourLevels.map((x) => x.code)
          : [];
        const nextVehicleTypes = Array.isArray(data.vehicleTypes)
          ? data.vehicleTypes.map((x) => x.code)
          : [];
        if (nextArmours.length > 0) {
          setArmourTypes(nextArmours);
          setSelectedArmours((prev) => prev.filter((x) => nextArmours.includes(x)));
        }
        if (nextVehicleTypes.length > 0) {
          const allTypes = ['ALL', ...nextVehicleTypes];
          setVehicleTypeOptions(allTypes);
          setSelectedCarTypes((prev) => {
            if (prev.includes('ALL')) return ['ALL'];
            const filtered = prev.filter((x) => allTypes.includes(x));
            return filtered.length > 0 ? filtered : ['ALL'];
          });
        }
      } catch {
        // ignore
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!window) return;
    let cancelled = false;
    async function loadVehicles() {
      if (!window) return;
      try {
        setLoading(true);
        const q = new URLSearchParams();
        q.set('startTime', window.start.toISOString());
        q.set('endTime', window.end.toISOString());
        if (draft.pickupCity.trim()) q.set('pickupCity', draft.pickupCity.trim());
        if (draft.dropCity.trim()) q.set('dropCity', draft.dropCity.trim());
        if (selectedArmours.length > 0) q.set('types', selectedArmours.join(','));
        if (city.trim().length > 0) q.set('city', city.trim());
        if (!selectedCarTypes.includes('ALL')) q.set('carType', selectedCarTypes.join(','));
        if (minPrice.trim().length > 0) q.set('minPrice', minPrice.trim());
        if (maxPrice.trim().length > 0) q.set('maxPrice', maxPrice.trim());
        const suffix = `?${q.toString()}`;
        const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/available${suffix}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          vehicles?: Array<
            VehicleCardData & {
              owner?: { name?: string } | null;
            }
          >;
        };
        if (cancelled) return;
        setVehicles(
          Array.isArray(data.vehicles)
            ? data.vehicles.map((v) => ({
                ...v,
                dispatcherName: v.dispatcherName ?? v.owner?.name ?? 'Dispatcher',
              }))
            : []
        );
      } catch {
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadVehicles();
    return () => {
      cancelled = true;
    };
  }, [
    window,
    selectedArmours,
    city,
    selectedCarTypes,
    minPrice,
    maxPrice,
    draft.pickupCity,
    draft.dropCity,
  ]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.manufacturer ?? ''} ${v.generation ?? ''} ${v.carModel ?? ''} ${v.location}`
        .toLowerCase()
        .includes(q)
    );
  }, [vehicles, search]);

  function toggleArmour(type: string) {
    setSelectedArmours((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]
    );
  }

  function applyFilters() {
    filterSheetRef.current?.close();
  }

  function toggleCarType(type: string) {
    setSelectedCarTypes((prev) => {
      if (type === 'ALL') return ['ALL'];
      const withoutAll = prev.filter((x) => x !== 'ALL');
      const next = withoutAll.includes(type)
        ? withoutAll.filter((x) => x !== type)
        : [...withoutAll, type];
      return next.length === 0 ? ['ALL'] : next;
    });
  }

  function handleMinPriceChange(next: string) {
    if (/^\d*$/.test(next)) setMinPrice(next);
  }

  function handleMaxPriceChange(next: string) {
    if (/^\d*$/.test(next)) setMaxPrice(next);
  }

  if (!window) {
    return null;
  }

  return (
    <LinearGradient
      colors={[...APP_GRADIENT]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          className="px-5 pt-4"
          keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-between">
            <BackButton variant="auth" onPress={() => router.replace('/(tabs)' as any)} />
            <Text className="text-2xl font-semibold" style={{ color: AUTH_GOLD }}>
              Choose vehicle
            </Text>
            <View className="h-10 w-10" />
          </View>

          <View className="mt-4 overflow-hidden rounded-2xl border" style={CARD_SHADOW}>
            <View className="border-b border-gray-900 bg-black px-4 py-2.5">
              <Text
                className="text-md text-center font-extrabold"
                style={{ color: AUTH_GOLD, letterSpacing: 0.5 }}>
                YOUR TRIP
              </Text>
            </View>
            <View className="px-4 py-3">
              <Text className="text-sm font-semibold text-gray-100" numberOfLines={2}>
                {draft.pickupAddress} → {draft.dropAddress}
              </Text>
              <Text className="mt-1 text-sm font-semibold" style={{ color: '#9CA3AF' }}>
                {window.start.toLocaleString()} • {baseHours}h
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            <View
              className="flex-1 flex-row items-center rounded-2xl border px-4 py-3"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}>
              <FontAwesome name="search" size={14} color={AUTH_GOLD} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search your dream car..."
                placeholderTextColor="#6B7280"
                className="text-md ml-2 flex-1 font-semibold text-gray-100"
              />
            </View>
            <Pressable
              onPress={() => filterSheetRef.current?.open()}
              className="ml-3 h-11 w-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: AUTH_GOLD }}>
              <FontAwesome name="sliders" size={14} color={AUTH_CARD} />
            </Pressable>
          </View>

          <Text
            className="mt-5 text-sm font-extrabold"
            style={{ color: AUTH_GOLD, letterSpacing: 0.4 }}>
            ARMOUR LEVELS
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {armourTypes.map((type) => {
              const active = selectedArmours.includes(type);
              return (
                <Pressable
                  key={type}
                  onPress={() => toggleArmour(type)}
                  className="h-[70px] min-w-[64px] flex-1 justify-center rounded-2xl border px-3 py-2"
                  style={{
                    backgroundColor: active ? AUTH_GOLD : 'rgba(0, 0, 0, 0.3)',
                    borderColor: active ? AUTH_GOLD : 'rgba(255,255,255,0.08)',
                  }}>
                  <Text
                    className="text-md text-center font-extrabold"
                    style={{ color: active ? AUTH_CARD : '#E5E7EB' }}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <Text className="text-md font-bold text-gray-100">Available vehicles</Text>
            <Text className="text-md font-bold" style={{ color: '#9CA3AF' }}>
              {filteredVehicles.length} cars
            </Text>
          </View>

          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>
                Loading…
              </Text>
            </View>
          ) : null}

          {!loading && filteredVehicles.length === 0 ? (
            <View className="mt-10 items-center rounded-2xl border px-4 py-8" style={CARD_SHADOW}>
              <FontAwesome name="car" size={24} color={AUTH_GOLD} />
              <Text className="mt-3 text-sm font-extrabold text-gray-100">No vehicles found</Text>
              <Text className="mt-1 text-center text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                Try different armour levels or adjust filters for this time window.
              </Text>
            </View>
          ) : null}

          <View className="mt-4">
            {filteredVehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                appearance="dark"
                onPress={() =>
                  router.push({ pathname: '/car-details' as any, params: { vehicleId: v.id } })
                }
              />
            ))}
          </View>
        </ScrollView>

        <RBSheet
          ref={filterSheetRef}
          closeOnPressMask
          draggable
          dragOnContent={false}
          height={480}
          customStyles={{
            wrapper: { backgroundColor: 'rgba(0,0,0,0.55)' },
            draggableIcon: { backgroundColor: '#6B7280' },
            container: {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 16,
              paddingBottom: 16,
              backgroundColor: AUTH_CARD,
            },
          }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-base font-extrabold" style={{ color: AUTH_GOLD }}>
              Filters
            </Text>
            <FilterField label="City" value={city} onChangeText={setCity} placeholder="Karachi" />
            <View
              className="mt-3 rounded-2xl border px-4 py-3"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}>
              <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                Car type
              </Text>
              <Pressable
                onPress={() => setCarTypePickerOpen((prev) => !prev)}
                className="mt-2 flex-row items-center justify-between rounded-xl border px-3 py-2.5"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}>
                <Text className="text-sm font-extrabold text-gray-100">
                  {selectedCarTypes.includes('ALL') ? 'ALL' : selectedCarTypes.join(', ')}
                </Text>
                <FontAwesome
                  name={carTypePickerOpen ? 'angle-up' : 'angle-down'}
                  size={16}
                  color={AUTH_GOLD}
                />
              </Pressable>
              {carTypePickerOpen ? (
                <View
                  className="mt-2 rounded-xl border p-1"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {vehicleTypeOptions.map((type) => {
                    const selected = selectedCarTypes.includes(type);
                    return (
                      <Pressable
                        key={type}
                        onPress={() => toggleCarType(type)}
                        className="flex-row items-center justify-between rounded-lg px-3 py-2">
                        <Text className="text-sm font-bold text-gray-100">{type}</Text>
                        {selected ? (
                          <FontAwesome name="check" size={14} color={AUTH_GOLD} />
                        ) : (
                          <View className="h-3.5 w-3.5" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <FilterField
                  label="Min price/hr"
                  value={minPrice}
                  onChangeText={handleMinPriceChange}
                  placeholder="100"
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <FilterField
                  label="Max price/hr"
                  value={maxPrice}
                  onChangeText={handleMaxPriceChange}
                  placeholder="500"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Pressable
              onPress={applyFilters}
              className="mt-4 items-center justify-center rounded-2xl py-3.5"
              style={{ backgroundColor: AUTH_GOLD }}>
              <Text className="text-xs font-extrabold" style={{ color: AUTH_CARD }}>
                Apply filters
              </Text>
            </Pressable>
          </ScrollView>
        </RBSheet>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FilterField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View
      className="mt-3 rounded-2xl border px-4 py-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        className="mt-1 text-sm font-extrabold text-gray-100"
      />
    </View>
  );
}
