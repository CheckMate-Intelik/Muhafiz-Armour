import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BackButton } from '@/components/BackButton';
import { apiGet, apiPost, ensureUserSession } from '@/lib/api';
import { colors, gradientProps, gradients, listCardShadow } from '@/constants/theme';

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
    if (!bookingId) return;
    try {
      const s = userId ? { userId } : await ensureUserSession();
      setUserId(s.userId);
      const rows = await apiGet<
        Array<{
          id: string;
          startTime?: string;
          endTime?: string;
          pickupLocation?: string;
          dropLocation?: string;
        }>
      >(`/bookings`, s.userId);
      const booking = Array.isArray(rows) ? rows.find((b) => b.id === bookingId) : undefined;
      if (!booking?.startTime || !booking.endTime) {
        Alert.alert('Missing trip', 'Booking details are incomplete.');
        return;
      }
      router.push({
        pathname: '/payment',
        params: {
          vehicleId,
          bookingId,
          amount: estimatedPrice.toFixed(2),
          from: booking.pickupLocation ?? '',
          to: booking.dropLocation ?? '',
          startTime: booking.startTime,
          endTime: booking.endTime,
        },
      });
    } catch {
      Alert.alert('Unable to continue', 'Please try again.');
    }
  }

  return (
    <LinearGradient
      colors={[...gradients.screen]}
      {...gradientProps.screen}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-2">
          <View className="flex-row items-center justify-between">
            <BackButton variant="auth" />
            <Text className="text-2xl font-semibold" style={{ color: colors.gold }}>
              Select vehicle
            </Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4" keyboardShouldPersistTaps="handled">
          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                Loading options…
              </Text>
            </View>
          ) : null}

          {visibleEmptyState ? (
            <View className="mt-10 items-center rounded-2xl border px-4 py-8" style={listCardShadow}>
              <FontAwesome name="car" size={24} color={colors.gold} />
              <Text className="mt-3 text-base font-extrabold text-gray-100">No vehicles available</Text>
              <Text className="mt-1 text-center text-xs font-semibold" style={{ color: colors.textSecondary }}>
                Try a different time range.
              </Text>
            </View>
          ) : null}

          {visibleOptions.map((o) => (
            <Pressable
              key={o.vehicleId}
              onPress={() => select(o.vehicleId, o.estimatedPrice)}
              className="mb-4 overflow-hidden rounded-2xl border"
              style={listCardShadow}>
              <View className="border-b border-gray-900 bg-black px-4 py-2">
                <Text className="text-center text-xs font-extrabold" style={{ color: colors.gold, letterSpacing: 0.4 }}>
                  {o.armourLevel} • {o.vehicleType}
                </Text>
              </View>
              <View className="p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                      Dispatcher
                    </Text>
                    <Text className="mt-1 text-base font-extrabold text-gray-100">{o.dispatcherName}</Text>
                    <Text className="mt-2 text-xs font-semibold" style={{ color: colors.textMuted }}>
                      {o.location}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                      Estimated
                    </Text>
                    <Text className="mt-1 text-base font-extrabold" style={{ color: colors.gold }}>
                      Rs {o.estimatedPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3"
                  style={{ backgroundColor: colors.gold }}>
                  <Text className="text-xs font-extrabold" style={{ color: colors.textOnGold }}>
                    Choose this vehicle
                  </Text>
                  <FontAwesome name="angle-right" size={16} color={colors.textOnGold} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
