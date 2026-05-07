import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { driverGet, ensureDriverSession } from '@/lib/api';

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  actualEndTime: string | null;
  totalPrice: number | null;
};

export default function DriverDashboardScreen() {
  const [completed, setCompleted] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await ensureDriverSession();
        const data = await driverGet<Booking[]>(`/driver/bookings/completed`, s.driverId);
        if (cancelled) return;
        setCompleted(Array.isArray(data) ? data : []);
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
  }, []);

  const completedTrips = completed.length;
  const totalEarnings = completed.reduce((sum, t) => sum + (t.totalPrice ?? 0), 0);

  const trips = useMemo(
    () =>
      completed.map((b) => ({
        id: b.id,
        date: b.actualEndTime ? new Date(b.actualEndTime).toLocaleDateString() : '-',
        pickup: b.pickupLocation,
        destination: b.dropLocation,
        earning: b.totalPrice ?? 0,
      })),
    [completed],
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="h-10 w-10" />
          <Text className="text-base font-extrabold text-gray-900">Dashboard</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-3xl bg-gray-800 p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-gray-200">Total earnings</Text>
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <FontAwesome name="money" size={16} color="#111827" />
              </View>
            </View>
            <Text className="mt-3 text-2xl font-bold text-gray-200">Rs {totalEarnings.toFixed(2)}</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-400">This period</Text>
          </View>

          <View className="flex-1 rounded-3xl bg-gray-800 p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-gray-200">Completed trips</Text>
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <FontAwesome name="check" size={16} color="#111827" />
              </View>
            </View>
            <Text className="mt-3 text-2xl font-extrabold text-gray-200">{completedTrips}</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-400">All time</Text>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-sm font-extrabold text-gray-900">Trip earnings</Text>
          <Text className="mt-1 text-xs font-semibold text-gray-500">Your earnings per completed trip</Text>
        </View>

        <View className="mt-4">
          {loading ? (
            <View className="mt-6 items-center">
              <Text className="text-sm font-semibold text-gray-500">Loading...</Text>
            </View>
          ) : null}

          {trips.map((t) => (
            <View key={t.id} className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-400">{t.date}</Text>
                  <Text className="mt-2 text-sm font-extrabold text-gray-900">
                    {t.pickup}
                    {' -> '}
                    {t.destination}
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Rs {t.earning.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>
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
