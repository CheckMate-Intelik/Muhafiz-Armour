import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BackButton } from '@/components/BackButton';
import { PUBLIC_API_BASE_URL, dispatcherGet, ensureDispatcherSession } from '@/lib/api';

const GOLD = '#C9B37A';
const CARD_BG = '#0B0F14';
const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PADDING = 20;
const GALLERY_WIDTH = SCREEN_WIDTH;

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
  extensionRatePerHour: number;
  certification: string;
  condition: string;
  seatingCapacity?: number;
  features?: string[];
  owner: { id: string; name: string; rating: number };
};

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

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
          const s = await ensureDispatcherSession();
          data = await dispatcherGet<{ vehicle?: VehicleDetails | null }>(
            `/dispatcher/vehicles/${vehicleId}`,
            s.dispatcherId
          );
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

  const images = useMemo(() => {
    const urls =
      vehicle?.imageUrls?.filter((u) => typeof u === 'string' && u.trim().length > 0) ?? [];
    const unique = [...new Set(urls)];
    return unique.length > 0
      ? unique
      : ['https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg'];
  }, [vehicle?.imageUrls]);

  const specificationCards = useMemo(() => {
    if (!vehicle) return [];
    return [
      {
        key: 'capacity',
        label: 'Capacity',
        value: `${vehicle.seatingCapacity ?? 4} seats`,
        icon: 'users' as const,
      },
      {
        key: 'certification',
        label: 'Certification',
        value: vehicle.certification,
        icon: 'shield' as const,
      },
      { key: 'location', label: 'City', value: vehicle.location, icon: 'map-marker' as const },
      {
        key: 'condition',
        label: 'Condition',
        value: vehicle.condition,
        icon: 'check-circle' as const,
      },
    ];
  }, [vehicle]);

  function onGalleryScrollEnd(offsetX: number) {
    const nextIndex = Math.max(0, Math.min(images.length - 1, Math.round(offsetX / GALLERY_WIDTH)));
    setActiveImageIndex(nextIndex);
  }

  const ownerName = vehicle?.owner?.name?.trim() || '—';
  const ownerRating =
    typeof vehicle?.owner?.rating === 'number' && Number.isFinite(vehicle.owner.rating)
      ? vehicle.owner.rating
      : 0;

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingBottom: isReadonly ? 120 : 140 }}
          showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between">
              <BackButton />
              <Text
                className="flex-1 px-3 text-center text-lg font-extrabold"
                style={{ color: GOLD }}
                numberOfLines={1}>
                {loading ? '…' : title}
              </Text>
              <View className="h-10 w-10" />
            </View>
          </View>

          {loading ? (
            <Text className="mt-10 px-5 text-center text-sm font-semibold text-gray-300">
              Loading…
            </Text>
          ) : null}

          {!loading && !vehicle ? (
            <View className="mt-8 items-center px-5">
              <Text className="text-center text-sm font-semibold text-gray-300">
                Vehicle details are unavailable.
              </Text>
            </View>
          ) : null}

          {vehicle ? (
            <>
              <View className="mt-4 overflow-hidden" style={{ marginHorizontal: -H_PADDING }}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => onGalleryScrollEnd(e.nativeEvent.contentOffset.x)}>
                  {images.map((img, index) => (
                    <Image
                      key={`${vehicle.id}-gallery-${index}`}
                      source={{ uri: img }}
                      style={{ width: GALLERY_WIDTH, height: 240 }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <View
                  className="flex-row items-center justify-center py-3"
                  style={{ backgroundColor: '#000000' }}>
                  {images.map((img, index) => {
                    const active = index === activeImageIndex;
                    return (
                      <View
                        key={`${img}-${index}`}
                        className="mx-1 h-2 w-2 rounded-full"
                        style={{ backgroundColor: active ? GOLD : 'rgba(255,255,255,0.25)' }}
                      />
                    );
                  })}
                </View>
              </View>

              <View className="mt-4 px-5">
                <View
                  className="overflow-hidden rounded-2xl border"
                  style={{
                    backgroundColor: CARD_BG,
                    borderColor: 'rgba(255,255,255,0.06)',
                    ...cardShadow,
                  }}>
                  <LinearGradient
                    colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 1, y: 1 }}></LinearGradient>
                  <View
                    className="border-b px-4 pb-3 pt-3.5"
                    style={{
                      backgroundColor: '#000000',
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    }}>
                    <Text
                      className="mt-1 text-center text-xl font-extrabold text-gray-100"
                      numberOfLines={2}
                      style={{ color: GOLD, letterSpacing: 0.5 }}>
                      {vehicle.carModel ?? 'Vehicle'}
                    </Text>
                    <Text
                      className="text-md mt-0.5 text-center font-semibold"
                      style={{ color: '#9CA3AF' }}
                      numberOfLines={1}>
                      {vehicle.generation?.trim() || vehicle.manufacturer || '—'}
                    </Text>
                  </View>

                  <View className="px-4 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <View className="flex-row">
                      <View className="flex-1 pr-1">
                        <DetailRow label="Brand" value={vehicle.manufacturer ?? '—'} />
                      </View>
                      <View className="flex-1 px-1">
                        <DetailRow
                          label="Year"
                          value={vehicle.year != null ? String(vehicle.year) : '—'}
                        />
                      </View>
                      <View className="flex-1 pl-1">
                        <DetailRow label="Color" value={vehicle.color ?? '—'} />
                      </View>
                    </View>
                    <View className="mt-4 flex-row">
                      <View className="flex-1 pr-1">
                        <DetailRow label="Armour" value={vehicle.armourLevel} />
                      </View>
                      <View className="flex-1 px-1">
                        <DetailRow label="Type" value={vehicle.vehicleType} />
                      </View>
                      <View className="flex-1 pl-1">
                        <DetailRow label="Plate" value={vehicle.numberPlate ?? '—'} />
                      </View>
                    </View>
                  </View>
                </View>

                <Text
                  className="text-md mt-5 font-extrabold"
                  style={{ color: GOLD, letterSpacing: 0.5 }}>
                  SPECIFICATION
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 pb-1">
                  {specificationCards.map((item) => (
                    <LinearGradient
                      key={item.key}
                      colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="mr-3 w-[118px] rounded-2xl px-3 py-3"
                      style={{
                        backgroundColor: CARD_BG,
                        borderRadius: 15,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.06)',
                        ...cardShadow,
                      }}>
                      <View>
                        <View
                          className="h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <FontAwesome name={item.icon} size={16} color={GOLD} />
                        </View>
                        <Text className="text-md mt-3 font-bold" style={{ color: '#9CA3AF' }}>
                          {item.label}
                        </Text>
                        <Text
                          className="text-md mt-1 font-extrabold text-gray-100"
                          numberOfLines={3}>
                          {item.value}
                        </Text>
                      </View>
                    </LinearGradient>
                  ))}
                </ScrollView>

                {/* {Array.isArray(vehicle.features) && vehicle.features.length > 0 ? (
                  <>
                    <Text
                      className="text-md mt-4 font-extrabold"
                      style={{ color: GOLD, letterSpacing: 0.5 }}>
                      FEATURES
                    </Text>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {vehicle.features.map((f, index) => (
                        <View
                          key={`${vehicle.id}-feature-${index}`}
                          className="rounded-full border px-3 py-1.5"
                          style={{
                            borderColor: 'rgba(255,255,255,0.12)',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                          }}>
                          <Text className="text-md font-semibold text-gray-200">{f}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null} */}

                <View
                  className="mt-5 rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: CARD_BG,
                    borderColor: 'rgba(255,255,255,0.06)',
                    ...cardShadow,
                  }}>
                  <Text
                    className="text-md border-b border-[#4d4d4d] pb-2 font-extrabold"
                    style={{ color: GOLD, letterSpacing: 0.5 }}>
                    RATES
                  </Text>
                  <View className="mt-3 flex-row">
                    <View className="flex-1 pr-2">
                      <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                        Base rate
                      </Text>
                      <Text className="mt-1 text-lg font-extrabold text-gray-100">
                        Rs {vehicle.baseRatePerHour}/hr
                      </Text>
                    </View>
                    <View className="flex-1 pl-2">
                      <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                        Extension rate
                      </Text>
                      <Text className="mt-1 text-lg font-extrabold text-gray-100">
                        Rs {vehicle.extensionRatePerHour ?? vehicle.baseRatePerHour}/hr
                      </Text>
                    </View>
                  </View>
                </View>

                <View
                  className="mt-4 flex-row items-center justify-between rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: CARD_BG,
                    borderColor: 'rgba(255,255,255,0.06)',
                    ...cardShadow,
                  }}>
                  <View className="flex-1 pr-2">
                    <Text className="text-md font-bold" style={{ color: '#9CA3AF' }}>
                      Owner
                    </Text>
                    <Text className="mt-1 text-lg font-bold text-gray-100" numberOfLines={1}>
                      {ownerName}
                    </Text>
                  </View>
                  <View
                    className="flex-row items-center rounded-full px-3 py-1.5"
                    style={{ backgroundColor: 'rgba(201,179,122,0.15)' }}>
                    <FontAwesome name="star" size={12} color={GOLD} />
                    <Text className="text-md ml-1 font-bold" style={{ color: GOLD }}>
                      {ownerRating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        {vehicle && !isReadonly ? (
          <View
            className="absolute bottom-0 left-0 right-0 border-t px-5 py-4"
            style={{
              backgroundColor: CARD_BG,
              borderTopColor: 'rgba(255,255,255,0.08)',
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -6 },
              elevation: 16,
            }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[11px] font-bold" style={{ color: '#9CA3AF' }}>
                  Base rate
                </Text>
                <Text className="mt-0.5 text-lg font-extrabold" style={{ color: GOLD }}>
                  Rs {vehicle.baseRatePerHour}/hr
                </Text>
                <Text className="mt-1 text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>
                  Extension Rs {vehicle.extensionRatePerHour ?? vehicle.baseRatePerHour}/hr
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/book-confirm' as any,
                    params: { vehicleId: vehicle.id },
                  })
                }
                className="rounded-2xl px-6 py-3.5"
                style={{ backgroundColor: GOLD }}>
                <Text className="text-sm font-extrabold" style={{ color: '#0B0F14' }}>
                  Book now
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-lg font-bold" style={{ color: '#9CA3AF' }}>
        {label}
      </Text>
      <Text className="text-md mt-1 font-bold text-gray-100" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
