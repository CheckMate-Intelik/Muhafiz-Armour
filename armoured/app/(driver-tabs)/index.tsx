import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { driverGet, ensureDriverSession, isNotAuthenticatedError } from '@/lib/api';
import { useStore } from '@/store/store';

const SCREEN_GRADIENT_COLORS = [
  'rgb(51, 47, 56)',
  'rgb(88, 88, 90)',
  'rgb(112, 112, 112)',
  'rgb(202, 202, 202)',
  'rgb(247, 248, 255)',
] as const;

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  actualEndTime: string | null;
  totalPrice: number | null;
};

const listCardShadow = {
  backgroundColor: '#3B3E43',
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

export default function DriverDashboardScreen() {
  const [completed, setCompleted] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const hydrate = useStore((s) => s.hydrate);
  const profile = useStore((s) => s.driverProfile);
  const profileLoading = useStore((s) => s.loading);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await ensureDriverSession();
        const data = await driverGet<Booking[]>(`/driver/bookings/completed`, s.driverId);
        if (cancelled) return;
        setCompleted(Array.isArray(data) ? data : []);
      } catch (e) {
        if (isNotAuthenticatedError(e)) {
          router.replace('/login' as any);
        }
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
  const driverName = (profile?.name ?? '').trim() || 'Driver';

  const trips = useMemo(
    () =>
      completed.map((b) => ({
        id: b.id,
        date: b.actualEndTime ? new Date(b.actualEndTime).toLocaleDateString() : '—',
        pickup: b.pickupLocation,
        destination: b.dropLocation,
        earning: b.totalPrice ?? 0,
      })),
    [completed],
  );

  return (
    <LinearGradient
      colors={[...SCREEN_GRADIENT_COLORS]}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[18px] font-semibold text-gray-200">Welcome!</Text>
              <Text className="text-lg font-semibold text-gray-200">
                {profileLoading && !profile?.name ? '…' : driverName}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <FontAwesome name="bell-o" size={16} color="#111827" />
              </Pressable>
              <Image
                source={{ uri: 'https://i.pravatar.cc/96?img=32' }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 overflow-hidden rounded-2xl" style={listCardShadow}>
              <View className="border-b border-gray-900 bg-black px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#D8DADF', letterSpacing: 0.4 }}>
                    TOTAL EARNINGS
                  </Text>
                  <View className="h-9 w-9 items-center justify-center rounded-2xl bg-[#2F3135]">
                    <FontAwesome name="money" size={16} color="#B8BBC0" />
                  </View>
                </View>
              </View>
              <View className="px-4 py-4">
                <Text className="text-2xl font-bold text-gray-100">Rs {totalEarnings.toFixed(2)}</Text>
                <Text className="mt-1 text-xs font-semibold text-gray-400">This period</Text>
              </View>
            </View>

            <View className="flex-1 overflow-hidden rounded-2xl" style={listCardShadow}>
              <View className="border-b border-gray-900 bg-black px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#D8DADF', letterSpacing: 0.4 }}>
                    COMPLETED
                  </Text>
                  <View className="h-9 w-9 items-center justify-center rounded-2xl bg-[#2F3135]">
                    <FontAwesome name="check" size={16} color="#B8BBC0" />
                  </View>
                </View>
              </View>
              <View className="px-4 py-4">
                <Text className="text-2xl font-extrabold text-gray-100">{completedTrips}</Text>
                <Text className="mt-1 text-xs font-semibold text-gray-400">All time</Text>
              </View>
            </View>
          </View>

          <View className="mt-8">
            <Text className="text-2xl font-extrabold text-gray-100" style={{ letterSpacing: 0.8 }}>
              TRIP EARNINGS
            </Text>
            <Text className="mt-1 text-sm font-semibold text-gray-300">Your earnings per completed trip</Text>
          </View>

          <View className="mt-4">
            {loading ? (
              <View className="mt-6 items-center">
                <Text className="text-sm font-semibold text-gray-400">Loading…</Text>
              </View>
            ) : null}

            {!loading && trips.length === 0 ? (
              <View className="mt-10 items-center">
                <View className="h-14 w-14 items-center justify-center rounded-3xl bg-[#2F3135]">
                  <FontAwesome name="bar-chart" size={20} color="#B8BBC0" />
                </View>
                <Text className="mt-4 text-lg font-extrabold text-gray-200">No completed trips yet</Text>
                <Text className="mt-1 text-sm font-semibold text-gray-300">
                  Finished trips will show here with payout details.
                </Text>
              </View>
            ) : null}

            {trips.map((t) => (
              <View key={t.id} className="mb-4 overflow-hidden rounded-2xl" style={listCardShadow}>
                <View className="border-b border-gray-900 bg-black px-4 py-3">
                  <View className="flex-row items-center justify-between">
                    <Text
                      numberOfLines={1}
                      className="flex-1 pr-2 text-[12px] font-extrabold"
                      style={{ color: '#D8DADF', letterSpacing: 0.4 }}>
                      COMPLETED MISSION — {t.date}
                    </Text>
                    <FontAwesome name="car" size={22} color="#B8BBC0" />
                  </View>
                </View>
                <View className="px-4 py-4">
                  <View className="flex-row">
                    <View className="mr-3 w-5 items-center">
                      <View className="h-3 w-3 rounded-full bg-[#D9D9D9]" />
                      <View className="my-2 w-[2px] flex-1 bg-[rgb(42,156,61)]" />
                      <View className="h-3 w-3 rounded-full bg-[#D9D9D9]" />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        FROM:
                      </Text>
                      <Text numberOfLines={2} className="mt-1 text-[16px] font-semibold text-gray-100">
                        {t.pickup}
                      </Text>
                      <View className="my-3 border-t border-[#55585D]" />
                      <Text className="text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        TO:
                      </Text>
                      <Text numberOfLines={2} className="mt-1 text-[16px] font-semibold text-gray-100">
                        {t.destination}
                      </Text>
                    </View>
                    <View className="ml-2 items-end">
                      <Text className="text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        PAID
                      </Text>
                      <Text className="mt-1 text-sm font-extrabold text-gray-100">
                        Rs {t.earning.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
