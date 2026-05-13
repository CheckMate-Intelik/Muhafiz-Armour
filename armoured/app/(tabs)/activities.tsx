import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { isNotAuthenticatedError } from '@/lib/api';
import { useBookingsStore } from '@/store/bookingsStore';

type RideStatus = 'Schedule' | 'Recent' | 'Completed' | 'Canceled';

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

export default function ActivitiesScreen() {
  const [status, setStatus] = useState<RideStatus>('Schedule');
  const userBookings = useBookingsStore((s) => s.userBookings);
  const userLoading = useBookingsStore((s) => s.userLoading);
  const userLoaded = useBookingsStore((s) => s.userLoaded);
  const refreshUserBookings = useBookingsStore((s) => s.refreshUserBookings);
  const bookings = userBookings as unknown as Booking[];
  const loading = userLoading && !userLoaded;

  useEffect(() => {
    refreshUserBookings().catch((e) => {
      if (isNotAuthenticatedError(e)) router.replace('/login' as any);
    });
  }, [refreshUserBookings]);

  const rides = useMemo(() => {
    switch (status) {
      case 'Completed':
        return bookings.filter((b) => normalizeStatus(b.status) === 'COMPLETED');
      case 'Canceled':
        return bookings.filter((b) => {
          const s = normalizeStatus(b.status);
          return s === 'REJECTED' || s === 'EXPIRED';
        });
      case 'Recent':
        return bookings.filter((b) => normalizeStatus(b.status) === 'IN_PROGRESS');
      case 'Schedule':
      default:
        return bookings.filter((b) => {
          const s = normalizeStatus(b.status);
          return s === 'REQUESTED' || s === 'PENDING_DRIVER' || s === 'CONFIRMED';
        });
    }
  }, [bookings, status]);

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[18px] font-semibold text-gray-200">History</Text>
              <Text className="text-lg font-semibold text-gray-200">Your bookings</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <FontAwesome name="bell-o" size={16} color="#111827" />
              </Pressable>
              <Image source={{ uri: 'https://i.pravatar.cc/96?img=12' }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            </View>
          </View>

          <View
            className="mt-4 flex-row overflow-hidden rounded-xl"
            style={{ backgroundColor: '#2F3135' }}>
            {(
              [
                { key: 'Schedule', label: 'SCHEDULED', icon: 'calendar' },
                { key: 'Recent', label: 'RECENT', icon: 'clock-o' },
                { key: 'Completed', label: 'COMPLETED', icon: 'check' },
                { key: 'Canceled', label: 'CANCELED', icon: 'times' },
              ] as const
            ).map((t, idx) => {
              const active = status === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setStatus(t.key)}
                  className="flex-1"
                  style={{
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderLeftColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <View
                    className="items-center justify-center px-1 py-3"
                    style={{
                      backgroundColor: active ? '#C9B37A' : 'transparent',
                      height: 70,
                      // borderRadius: 10,
                      // margin:6
                    }}>
                    <FontAwesome name={t.icon as any} size={22} color={active ? '#0B0F14' : '#B8BBC0'} />
                    <Text
                      className="mt-1 text-sm font-extrabold"
                      style={{ color: active ? '#0B0F14' : '#B8BBC0' }}>
                      {t.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-300">Loading…</Text>
            </View>
          ) : null}

          {!loading && rides.length === 0 ? (
            <View className="mt-10 items-center">
              <View
                className="h-14 w-14 items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <FontAwesome name="calendar" size={20} color="#9CA3AF" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No history</Text>
              <Text className="mt-1 text-center text-sm font-semibold text-gray-300">
                Your bookings will appear here.
              </Text>
            </View>
          ) : null}

          <View className="mt-4">
            {rides.map((r) => (
          (() => {
            const vehicleName = `${r.vehicle?.manufacturer ?? ''} ${r.vehicle?.carModel ?? ''}`.trim();
            const headerStatusLabel =
              status === 'Schedule'
                ? 'SCHEDULED MISSION'
                : status === 'Recent'
                  ? 'RECENT MISSION'
                  : status === 'Completed'
                    ? 'COMPLETED MISSION'
                    : 'CANCELED MISSION';
            const driverAndArmour = `${r.driver?.name ?? '—'} • ${r.vehicle?.armourLevel ?? '—'}`.trim();
            const costLabel = typeof r.totalPrice === 'number' ? `Rs ${r.totalPrice.toFixed(2)}` : '—';
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
                  backgroundColor: '#0B0F14',
                  borderColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOpacity: 0.28,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 14 },
                  elevation: 8,
                }}>
                <View
                  className="border-b px-4 pb-3 pt-3.5"
                  style={{ backgroundColor: '#000000', borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <View className="flex-row items-center justify-between">
                    <Text
                      numberOfLines={1}
                      className="flex-1 pr-2 text-[14px] font-extrabold"
                      style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
                      {headerStatusLabel} - {driverAndArmour}
                    </Text>
                    <FontAwesome name="car" size={22} color="#C9B37A" />
                  </View>
                </View>

                <View className="px-4 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <View className="flex-row">
                    <View className="mr-3 w-5 items-center">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{ borderWidth: 2, borderColor: '#F59E0B', backgroundColor: 'transparent' }}
                      />
                      <View className="my-2 w-[2px] flex-1" style={{ backgroundColor: 'rgba(34,197,94,0.7)' }} />
                      <View className="h-3 w-3 rounded-full" style={{ borderWidth: 2, borderColor: '#E5E7EB' }} />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row">
                        <View className="flex-1 pr-3">
                          <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                            FROM:
                          </Text>
                          <Text numberOfLines={1} className="mt-1 text-[18px] font-extrabold text-gray-100">
                            {r.pickupLocation || '—'}
                          </Text>
                        </View>

                        <View className="w-[90px] items-end">
                          <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                            COST:
                          </Text>
                          <Text numberOfLines={1} className="mt-1 text-[14px] font-extrabold text-gray-100">
                            {costLabel}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 border-t" style={{ borderTopColor: 'rgba(255,255,255,0.06)' }} />

                      <View className="mt-3">
                        <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                          TO:
                        </Text>
                        <Text numberOfLines={1} className="mt-1 text-[18px] font-extrabold text-gray-100">
                          {r.dropLocation || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })()
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
