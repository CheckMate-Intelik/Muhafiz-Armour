import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiGet, apiPost, ensureUserSession } from '@/lib/api';

type Option = {
  vehicleId: string;
  driverId: string;
  armourLevel: string;
  vehicleType: string;
  baseRatePerHour: number;
  location: string;
  driverName: string;
  estimatedPrice: number;
};

export default function SelectVehicleScreen() {
  const params = useLocalSearchParams<{ bookingId?: string; type?: string }>();
  const bookingId = params.bookingId ?? '';
  const selectedType = (params.type ?? '').trim();

  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<Option[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await ensureUserSession();
        if (cancelled) return;
        setUserId(s.userId);
        if (!bookingId) return;
        const data = await apiGet<{ options: Option[] }>(`/bookings/${bookingId}/options`, s.userId);
        if (cancelled) return;
        setOptions(Array.isArray(data.options) ? data.options : []);
      } catch {
        router.replace('/login' as any);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const visibleOptions = useMemo(() => {
    if (!selectedType) return options;
    return options.filter((o) => o.armourLevel === selectedType);
  }, [options, selectedType]);
  const visibleEmptyState = useMemo(() => !loading && visibleOptions.length === 0, [loading, visibleOptions.length]);

  async function select(vehicleId: string, estimatedPrice: number) {
    try {
      const s = userId ? { userId } : await ensureUserSession();
      setUserId(s.userId);
      if (!bookingId) return;
      const booking = await apiPost<{ totalPrice?: number; pickupLocation?: string; dropLocation?: string }>(
        `/bookings/${bookingId}/select`,
        s.userId,
        { vehicleId },
      );
      const amount = (booking.totalPrice ?? estimatedPrice).toFixed(2);
      router.replace({
        pathname: '/payment',
        params: { amount, from: booking.pickupLocation ?? '', to: booking.dropLocation ?? '' },
      });
    } catch {
      // Ignore for now.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Select vehicle</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4">
        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">Loading options…</Text>
          </View>
        ) : null}

        {visibleEmptyState ? (
          <View className="mt-10 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
              <FontAwesome name="car" size={20} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-gray-900">No vehicles available</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">Try a different time range.</Text>
          </View>
        ) : null}

        {visibleOptions.map((o) => (
          <Pressable
            key={o.vehicleId}
            onPress={() => select(o.vehicleId, o.estimatedPrice)}
            className="mb-4 rounded-3xl bg-white p-4"
            style={cardShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-400">Driver</Text>
                <Text className="mt-1 text-base font-extrabold text-gray-900">{o.driverName}</Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-[10px] font-extrabold text-gray-800">{o.armourLevel}</Text>
                  </View>
                  <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-[10px] font-extrabold text-gray-800">{o.vehicleType}</Text>
                  </View>
                  <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-[10px] font-extrabold text-gray-800">{o.location}</Text>
                  </View>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-xs font-bold text-gray-400">Estimated</Text>
                <Text className="mt-1 text-base font-extrabold text-[#1D2DD9]">
                  Rs {o.estimatedPrice.toFixed(2)}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-[#1D2DD9] px-4 py-3">
              <Text className="text-xs font-extrabold text-white">Choose this vehicle</Text>
              <FontAwesome name="angle-right" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

