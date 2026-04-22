import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PUBLIC_API_BASE_URL, apiGet, ensureUserSession } from '@/lib/api';
const ARMOUR_TYPES = ['B4', 'B5', 'B6', 'B7'] as const;

type VehicleCard = {
  id: string;
  imageUrls: string[];
  manufacturer: string | null;
  generation: string | null;
  carModel: string | null;
  type: string;
  rating: number;
  baseRatePerHour: number;
  location: string;
};

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedArmours, setSelectedArmours] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [city, setCity] = useState('');
  const [carType, setCarType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [vehicles, setVehicles] = useState<VehicleCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [ongoingTrip, setOngoingTrip] = useState<null | { id: string; pickupLocation: string; dropLocation: string; driverName: string; vehicleType: string }>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const s = await ensureUserSession();
        if (cancelled) return;
        setUserId(s.userId);
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
    async function loadVehicles() {
      try {
        setLoading(true);
        const q = new URLSearchParams();
        if (selectedArmours.length > 0) q.set('types', selectedArmours.join(','));
        if (city.trim().length > 0) q.set('city', city.trim());
        if (carType.trim().length > 0) q.set('carType', carType.trim());
        if (minPrice.trim().length > 0) q.set('minPrice', minPrice.trim());
        if (maxPrice.trim().length > 0) q.set('maxPrice', maxPrice.trim());
        const suffix = q.toString() ? `?${q.toString()}` : '';
        const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/available${suffix}`);
        if (!res.ok) return;
        const data = (await res.json()) as { vehicles?: VehicleCard[] };
        if (cancelled) return;
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
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
  }, [selectedArmours, city, carType, minPrice, maxPrice]);

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
          vehicleType: String(b.vehicle?.type ?? '—'),
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

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles
      .filter((v) => `${v.manufacturer ?? ''} ${v.generation ?? ''} ${v.carModel ?? ''} ${v.location}`.toLowerCase().includes(q));
  }, [vehicles, search]);

  function toggleArmour(type: string) {
    setSelectedArmours((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  }

  function applyFilters() {
    setFilterOpen(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F7]">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] font-semibold text-gray-500">Location</Text>
            <Text className="text-sm font-extrabold text-gray-900">{city.trim() || 'Colomadu, Surakarta'}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <FontAwesome name="bell-o" size={16} color="#111827" />
            </Pressable>
            <Image source={{ uri: 'https://i.pravatar.cc/96?img=12' }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          </View>
        </View>

        <View className="mt-4 flex-row items-center">
          <View className="flex-1 flex-row items-center rounded-2xl bg-white px-4 py-3">
            <FontAwesome name="search" size={14} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search your dream car..."
              placeholderTextColor="#9CA3AF"
              className="ml-2 flex-1 text-sm font-semibold text-gray-900"
            />
          </View>
          <Pressable onPress={() => setFilterOpen(true)} className="ml-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#111827]">
            <FontAwesome name="sliders" size={14} color="#FFFFFF" />
          </Pressable>
        </View>

        {ongoingTrip ? (
          <Pressable
            onPress={() => router.push({ pathname: '/ongoing-trip' as any, params: { bookingId: ongoingTrip.id } })}
            className="mt-4 rounded-2xl bg-white px-4 py-3">
            <Text className="text-xs font-extrabold text-gray-900">Ongoing trip</Text>
            <Text className="mt-1 text-[11px] font-semibold text-gray-600">
              {ongoingTrip.pickupLocation}
              {' -> '}
              {ongoingTrip.dropLocation}
            </Text>
            <Text className="mt-1 text-[11px] font-semibold text-gray-500">
              {ongoingTrip.driverName} • {ongoingTrip.vehicleType}
            </Text>
          </Pressable>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
          {ARMOUR_TYPES.map((type) => {
            const active = selectedArmours.includes(type);
            return (
              <Pressable
                key={type}
                onPress={() => toggleArmour(type)}
                className={`mr-2 rounded-full px-4 py-2 ${active ? 'bg-[#111827]' : 'bg-white'}`}>
                <Text className={`text-xs font-extrabold ${active ? 'text-white' : 'text-gray-700'}`}>{type}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-gray-900">Available Vehicles</Text>
          <Text className="text-xs font-bold text-gray-400">{filteredVehicles.length} cars</Text>
        </View>

        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">Loading...</Text>
          </View>
        ) : null}

        {!loading && filteredVehicles.length === 0 ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">No vehicles found for selected filters.</Text>
          </View>
        ) : null}

        <View className="mt-4 flex-row flex-wrap justify-between">
          {filteredVehicles.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => router.push({ pathname: '/car-details' as any, params: { vehicleId: v.id } })}
              className="mb-3 w-[48.5%] rounded-2xl bg-white p-2.5">
              <Image
                source={{ uri: v.imageUrls?.[0] || 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg' }}
                style={{ width: '100%', height: 84, borderRadius: 12 }}
                resizeMode="cover"
              />
              <View className="mt-2">
                <Text className="text-[11px] font-extrabold text-gray-900" numberOfLines={1}>
                  {`${v.manufacturer ?? 'Armoured'} ${v.carModel ?? 'Vehicle'}`.trim()}
                </Text>
                <Text className="mt-0.5 text-[9px] font-semibold text-gray-500" numberOfLines={1}>
                  {v.location}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-[9px] font-extrabold text-amber-500">★ {v.rating.toFixed(1)}</Text>
                <Text className="text-[9px] font-extrabold text-gray-700">{v.type}</Text>
              </View>
              <Text className="mt-1 text-[10px] font-extrabold text-[#1D2DD9]">${v.baseRatePerHour}/hr</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal transparent visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable className="flex-1 bg-black/40 px-5 pt-20" onPress={() => setFilterOpen(false)}>
          <Pressable className="rounded-3xl bg-white p-4">
            <Text className="text-base font-extrabold text-gray-900">Filters</Text>
            <Field label="City" value={city} onChangeText={setCity} placeholder="Karachi" />
            <Field label="Car type" value={carType} onChangeText={setCarType} placeholder="SUV, Sedan..." />
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Field label="Min price/hr" value={minPrice} onChangeText={setMinPrice} placeholder="100" keyboardType="number-pad" />
              </View>
              <View className="flex-1">
                <Field label="Max price/hr" value={maxPrice} onChangeText={setMaxPrice} placeholder="500" keyboardType="number-pad" />
              </View>
            </View>
            <Pressable onPress={applyFilters} className="mt-4 items-center justify-center rounded-2xl bg-[#111827] py-3">
              <Text className="text-xs font-extrabold text-white">Apply filters</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
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
    <View className="mt-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        className="mt-1 text-sm font-extrabold text-gray-900"
      />
    </View>
  );
}
