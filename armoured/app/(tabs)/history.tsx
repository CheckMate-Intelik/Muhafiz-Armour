import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { apiGet, ensureUserSession, isNotAuthenticatedError } from '@/lib/api';

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number | null;
  driver?: { name: string } | null;
  vehicle?: { armourLevel: string; vehicleType: string; manufacturer?: string | null; carModel?: string | null } | null;
};

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function isPastStatus(status: string | null | undefined) {
  const s = normalizeStatus(status);
  if (s === 'COMPLETED') return true;
  if (s === 'REJECTED' || s === 'EXPIRED') return true;
  return false;
}

export default function HistoryScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await ensureUserSession();
        const data = await apiGet<Booking[]>(`/bookings`, s.userId);
        if (cancelled) return;
        setBookings(Array.isArray(data) ? data : []);
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

  const past = useMemo(() => {
    return bookings.filter((b) => isPastStatus(b.status));
  }, [bookings]);

  return (
    <LinearGradient
      colors={['rgb(51, 47, 56)', 'rgb(88, 88, 90)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-extrabold text-gray-100" style={{ letterSpacing: 0.8 }}>
              HISTORY
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-200">Loading…</Text>
            </View>
          ) : null}

          {!loading && past.length === 0 ? (
            <View className="mt-10 items-center">
              <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
                <FontAwesome name="history" size={20} color="#111827" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No history</Text>
              <Text className="mt-1 text-sm font-semibold text-gray-200">Your past bookings will appear here.</Text>
            </View>
          ) : null}

          {past.map((r) => {
            const vehicleName = `${r.vehicle?.manufacturer ?? ''} ${r.vehicle?.carModel ?? ''}`.trim();
            const driverAndArmour = `${r.driver?.name ?? '—'} • ${r.vehicle?.armourLevel ?? '—'}`.trim();
            const costLabel = typeof r.totalPrice === 'number' ? `Rs ${r.totalPrice.toFixed(2)}` : '—';
            const headerStatusLabel = normalizeStatus(r.status) === 'COMPLETED' ? 'COMPLETED MISSION' : 'CANCELED MISSION';
            return (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push({
                    pathname: '/booking-details' as any,
                    params: {
                      id: r.id,
                      pickupLocation: r.pickupLocation,
                      dropLocation: r.dropLocation,
                      status: r.status,
                      startTime: r.startTime,
                      endTime: r.endTime,
                      totalPrice: r.totalPrice == null ? '' : String(r.totalPrice),
                      driverName: r.driver?.name ?? '',
                      customerName: '',
                      vehicleArmour: r.vehicle?.armourLevel ?? '',
                      vehicleType: r.vehicle?.vehicleType ?? '',
                      vehicleName: vehicleName || '',
                    },
                  })
                }
                className="mb-4 overflow-hidden rounded-2xl"
                style={{
                  backgroundColor: '#3B3E43',
                  shadowColor: '#000',
                  shadowOpacity: 0.22,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }}>
                <View className="bg-black px-4 pb-3 pt-3.5 border-b border-gray-900">
                  <View className="flex-row items-center justify-between">
                    <Text
                      numberOfLines={1}
                      className="flex-1 pr-2 text-[12px] font-extrabold"
                      style={{ color: '#D8DADF', letterSpacing: 0.4 }}>
                      {headerStatusLabel} - {driverAndArmour}
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

                    <View className="flex-1">
                      <View className="flex-row">
                        <View className="flex-1 pr-3">
                          <Text className="text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                            FROM:
                          </Text>
                          <Text numberOfLines={1} className="mt-1 text-[16px] font-semibold text-gray-100">
                            {r.pickupLocation || '—'}
                          </Text>
                        </View>

                        <View className="w-[90px] items-end">
                          <Text className="text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                            COST:
                          </Text>
                          <Text numberOfLines={1} className="mt-1 text-[14px] font-semibold text-gray-100">
                            {costLabel}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 border-t border-[#55585D]" />

                      <View className="mt-3">
                        <Text className="text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                          TO:
                        </Text>
                        <Text numberOfLines={1} className="mt-1 text-[16px] font-semibold text-gray-100">
                          {r.dropLocation || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

