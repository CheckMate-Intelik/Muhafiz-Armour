import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PUBLIC_API_BASE_URL, driverGet, ensureDriverSession } from '@/lib/api';

type VehicleDetails = {
  id: string;
  imageUrls: string[];
  manufacturer: string | null;
  generation: string | null;
  carModel: string | null;
  year: number | null;
  color: string | null;
  numberPlate: string | null;
  registrationNumber: string | null;
  armourLevel: string;
  vehicleType: string;
  location: string;
  baseRatePerHour: number;
  certification: string;
  condition: string;
  seatingCapacity?: number;
  owner: { id: string; name: string; rating: number };
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CarDetailsScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string; readonly?: string }>();
  const vehicleId = params.vehicleId ?? '';
  const isReadonly = params.readonly === '1';
  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!vehicleId) {
        setLoading(false);
        return;
      }
      try {
        let data: { vehicle?: VehicleDetails | null } | null = null;
        if (isReadonly) {
          const s = await ensureDriverSession();
          data = await driverGet<{ vehicle?: VehicleDetails | null }>(`/driver/vehicles/${vehicleId}`, s.driverId);
        } else {
          const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/${vehicleId}`);
          if (!res.ok) return;
          data = (await res.json()) as { vehicle?: VehicleDetails | null };
        }
        if (cancelled) return;
        setVehicle(data?.vehicle ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, isReadonly]);

  const title = useMemo(() => {
    if (!vehicle) return 'Vehicle details';
    return `${vehicle.manufacturer ?? 'Armoured'} ${vehicle.generation ?? ''} ${vehicle.carModel ?? 'Vehicle'}`.trim();
  }, [vehicle]);
  const images = vehicle?.imageUrls?.length ? vehicle.imageUrls : ['https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg'];
  const IMAGE_WIDTH = SCREEN_WIDTH;
  const specificationCards = useMemo(() => {
    if (!vehicle) return [];
    return [
      { key: 'capacity', label: 'Capacity', value: `${vehicle.seatingCapacity ?? 4} seats`, icon: 'users' as const },
      { key: 'certification', label: 'Certification', value: vehicle.certification, icon: 'shield' as const },
      { key: 'location', label: 'City', value: vehicle.location, icon: 'map-marker' as const },
    ];
  }, [vehicle]);

  function onGalleryScrollEnd(offsetX: number) {
    const nextIndex = Math.max(0, Math.min(images.length - 1, Math.round(offsetX / IMAGE_WIDTH)));
    setActiveImageIndex(nextIndex);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F7]">
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        
        {loading ? <Text className="mt-8 text-sm font-semibold text-gray-500">Loading...</Text> : null}

        {!loading && !vehicle ? (
          <View className="mt-8 items-center px-5">
            <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
              <FontAwesome name="angle-left" size={18} color="#111827" />
            </Pressable>
            <Text className="mt-4 text-sm font-semibold text-gray-600">Vehicle details are unavailable.</Text>
          </View>
        ) : null}

        {vehicle ? (
          <View className="mt-4 rounded-3xl bg-white pb-4">
            
            <View className="bg-gray-300 rounded-t-3xl pt-4">
              <View className="flex-row items-center justify-between mx-4">
                <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <FontAwesome name="angle-left" size={18} color="#111827" />
                </Pressable>
              </View>  
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                className="mt-4"
                onMomentumScrollEnd={(e) => onGalleryScrollEnd(e.nativeEvent.contentOffset.x)}>
                {images.map((img) => (
                  <Image key={img} source={{ uri: img }} style={{ width: IMAGE_WIDTH, height: 220 }} resizeMode="cover" />
                ))}
              </ScrollView>
              <View className="mt-3 flex-row items-center justify-center">
                {images.map((img, index) => {
                  const active = index === activeImageIndex;
                  return <View key={`${img}-${index}`} className={`mx-1 h-2 w-2 rounded-full ${active ? 'bg-black' : 'bg-gray-500'}`} />;
                })}
              </View>

              <View className="mt-4 px-4 py-3">

                {/* <Text className="mt-5 text-base font-extrabold text-gray-900">Overview</Text> */}
                <Text className="text-2xl font-bold text-gray-900">{vehicle.carModel}</Text>
                <Text className="mb-3 text-md font-semibold text-gray-500">
                  {vehicle.generation ?? '—'}
                </Text>

                <View className="border-t border-gray-400 pt-4">
                  <View className="flex-row">
                    <View className="flex-1 pr-2">
                      <Row label="Brand" value={vehicle.manufacturer ?? '—'} />
                    </View>
                    <View className="flex-1 px-2">
                      <Row label="Year" value={vehicle.year?.toString() ?? '—'} />
                    </View>
                    <View className="flex-1 pl-2">
                      <Row label="Color" value={vehicle.color ?? '—'} />
                    </View>
                  </View>

                  <View className="flex-row mt-4 mb-2">
                    <View className="flex-1 pr-2">
                      <Row label="Armour level" value={vehicle.armourLevel} />
                    </View>
                    <View className="flex-1 px-2">
                      <Row label="Vehicle type" value={vehicle.vehicleType} />
                    </View>
                    <View className="flex-1 pl-2">
                      <Row label="Number plate" value={vehicle.numberPlate ?? '—'} />
                    </View>
                  </View>
                  {/* <View className="mt-4">
                    <Row label="Registration" value={vehicle.registrationNumber ?? '—'} />
                  </View> */}
                </View>
              </View>
            </View>

            <Text className="mt-4 text-sm font-extrabold text-gray-900 px-4">Specification</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 px-4">
              {specificationCards.map((item) => (
                <View key={item.key} className="mr-2 w-[110px] rounded-2xl bg-[#EEF1F8] px-3 py-3">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-white">
                    <FontAwesome name={item.icon} size={16} color="#1D2DD9" />
                  </View>
                  <Text className="mt-3 text-[10px] font-bold text-gray-500">{item.label}</Text>
                  <Text className="mt-1 text-xs font-extrabold text-gray-900">{item.value}</Text>
                </View>
              ))}
            </ScrollView>

            {/* <Text className="mt-4 text-sm font-extrabold text-gray-900 px-4">Features</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {vehicle.features.map((f) => (
                <View key={f} className="mr-2 rounded-full bg-gray-100 px-3 py-2">
                  <Text className="text-[11px] font-semibold text-gray-700">{f}</Text>
                </View>
              ))}
            </ScrollView> */}

            <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 mx-4 py-3">
              <View>
                <Text className="text-[12px] font-bold text-gray-400">Owner</Text>
                <Text className="text-[14px] font-extrabold text-gray-900">{vehicle.owner.name}</Text>
              </View>
              <Text className="text-sm font-extrabold text-amber-500">★ {vehicle.owner.rating.toFixed(1)}</Text>
            </View>

          </View>
        ) : null}
      </ScrollView>
      {vehicle ? (
        <View
          className="flex-row items-center justify-between border-t border-gray-100 bg-white px-5 py-4"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
            elevation: 10,
          }}>
          <View>
            <Text className="text-[12px] font-bold text-gray-400">Price details</Text>
            <Text className="text-xl font-extrabold text-gray-900">Rs {vehicle.baseRatePerHour}/hr</Text>
          </View>
          {!isReadonly ? (
            <Pressable
              onPress={() => router.push({ pathname: '/book-confirm' as any, params: { vehicleId: vehicle.id } })}
              className="rounded-2xl bg-[#111827] px-6 py-3">
              <Text className="text-sm font-extrabold text-white">Book Now</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2">
      <Text className="text-[13px] text-gray-800">{label}</Text>
      <Text className="text-[13px] font-bold text-gray-900">{value}</Text>
    </View>
  );
}
