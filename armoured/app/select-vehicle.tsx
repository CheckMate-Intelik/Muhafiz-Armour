import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { APP_GRADIENT, AUTH_CARD, AUTH_GOLD } from '@/components/AuthForm';
import { apiGet, apiPost, ensureUserSession } from '@/lib/api';

type Option = {
  vehicleId: string;
  dispatcherId: string;
  armourLevel: string;
  vehicleType: string;
  baseRatePerHour: number;
  location: string;
  dispatcherName: string;
  estimatedPrice: number;
};

const CARD_SHADOW: ViewStyle = {
  backgroundColor: AUTH_CARD,
  borderColor: 'rgba(255,255,255,0.06)',
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
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
    <LinearGradient
      colors={[...APP_GRADIENT]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <FontAwesome name="angle-left" size={20} color="#111827" />
            </Pressable>
            <Text className="text-2xl font-semibold" style={{ color: AUTH_GOLD }}>
              Select vehicle
            </Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4" keyboardShouldPersistTaps="handled">
          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>
                Loading options…
              </Text>
            </View>
          ) : null}

          {visibleEmptyState ? (
            <View className="mt-10 items-center rounded-2xl border px-4 py-8" style={CARD_SHADOW}>
              <FontAwesome name="car" size={24} color={AUTH_GOLD} />
              <Text className="mt-3 text-base font-extrabold text-gray-100">No vehicles available</Text>
              <Text className="mt-1 text-center text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                Try a different time range.
              </Text>
            </View>
          ) : null}

          {visibleOptions.map((o) => (
            <Pressable
              key={o.vehicleId}
              onPress={() => select(o.vehicleId, o.estimatedPrice)}
              className="mb-4 overflow-hidden rounded-2xl border"
              style={CARD_SHADOW}>
              <View className="border-b border-gray-900 bg-black px-4 py-2">
                <Text className="text-center text-xs font-extrabold" style={{ color: AUTH_GOLD, letterSpacing: 0.4 }}>
                  {o.armourLevel} • {o.vehicleType}
                </Text>
              </View>
              <View className="p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                      Dispatcher
                    </Text>
                    <Text className="mt-1 text-base font-extrabold text-gray-100">{o.dispatcherName}</Text>
                    <Text className="mt-2 text-xs font-semibold" style={{ color: '#B8BBC0' }}>
                      {o.location}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                      Estimated
                    </Text>
                    <Text className="mt-1 text-base font-extrabold" style={{ color: AUTH_GOLD }}>
                      Rs {o.estimatedPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3"
                  style={{ backgroundColor: AUTH_GOLD }}>
                  <Text className="text-xs font-extrabold" style={{ color: AUTH_CARD }}>
                    Choose this vehicle
                  </Text>
                  <FontAwesome name="angle-right" size={16} color={AUTH_CARD} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
