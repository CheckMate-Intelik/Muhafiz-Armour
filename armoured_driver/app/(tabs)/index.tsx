import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { driverGet, driverPatch, ensureDriverSession } from '@/lib/api';

type BookingTab = 'Booking Requests' | 'Active Bookings';

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPrice: number | null;
  user?: { name: string } | null;
  vehicle?: { type: string; baseRatePerHour: number; location: string } | null;
};

export default function BookingsScreen() {
  const [tab, setTab] = useState<BookingTab>('Booking Requests');

  const [requests, setRequests] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const s = await ensureDriverSession();
    const [req, act] = await Promise.all([
      driverGet<Booking[]>(`/driver/requests`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/active`, s.driverId),
    ]);
    setRequests(Array.isArray(req) ? req : []);
    setActive(Array.isArray(act) ? act : []);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await ensureDriverSession();
        if (cancelled) return;
        await refresh();
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

  const list = tab === 'Booking Requests' ? requests : active;
  const emptyState = useMemo(() => !loading && list.length === 0, [list.length, loading]);

  function formatRange(startTime: string, endTime: string) {
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
    return `${s.toLocaleString()} → ${e.toLocaleString()}`;
  }

  async function respond(bookingId: string, accept: boolean) {
    try {
      setBusyId(bookingId);
      const s = await ensureDriverSession();
      await driverPatch(`/driver/bookings/${bookingId}/respond`, s.driverId, { accept });
      await refresh();
    } catch {
      // Ignore for now.
    } finally {
      setBusyId(null);
    }
  }

  async function startTrip(bookingId: string) {
    try {
      setBusyId(bookingId);
      const s = await ensureDriverSession();
      await driverPatch(`/driver/bookings/${bookingId}/start`, s.driverId);
      await refresh();
    } catch {
      // Ignore for now.
    } finally {
      setBusyId(null);
    }
  }

  async function completeTrip(bookingId: string) {
    try {
      setBusyId(bookingId);
      const s = await ensureDriverSession();
      await driverPatch(`/driver/bookings/${bookingId}/complete`, s.driverId);
      await refresh();
    } catch {
      // Ignore for now.
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="h-10 w-10" />
          <Text className="text-base font-extrabold text-gray-900">Bookings</Text>
          <Pressable className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="filter" size={16} color="#111827" />
          </Pressable>
        </View>

        <View className="mt-4 flex-row rounded-2xl bg-gray-100 p-1">
          {(['Booking Requests', 'Active Bookings'] as const).map((t) => {
            const isActive = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                  isActive ? 'bg-[#1D2DD9]' : ''
                }`}>
                <Text className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">Loading…</Text>
          </View>
        ) : null}

        {emptyState ? (
          <View className="mt-10 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
              <FontAwesome name="calendar" size={20} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-gray-900">No bookings</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">
              You will see your {tab.toLowerCase()} here.
            </Text>
          </View>
        ) : null}

        {list.map((b) => {
          const isBusy = busyId === b.id;
          const customerName = b.user?.name ?? '—';
          const vehicleType = b.vehicle?.type ?? '—';
          const payout = b.totalPrice ?? 0;

          return (
            <View key={b.id} className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-400">Customer</Text>
                  <Text className="mt-1 text-base font-extrabold text-gray-900">{customerName}</Text>
                  <View className="mt-2 flex-row items-center gap-2">
                    <View className="rounded-full bg-gray-100 px-3 py-1">
                      <Text className="text-[10px] font-extrabold text-gray-800">{vehicleType}</Text>
                    </View>
                    <View className="rounded-full bg-gray-100 px-3 py-1">
                      <Text className="text-[10px] font-extrabold text-gray-800">
                        {formatRange(b.startTime, b.endTime)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-xs font-bold text-gray-400">Payout</Text>
                  <Text className="mt-1 text-base font-extrabold text-[#1D2DD9]">${payout.toFixed(2)}</Text>
                </View>
              </View>

              <View className="mt-4 h-[1px] bg-gray-100" />

              <View className="mt-4">
                <LocationRow icon="location-arrow" label="Pick up" value={b.pickupLocation} />
                <View className="my-3 h-[1px] bg-gray-100" />
                <LocationRow icon="map-marker" label="Destination" value={b.dropLocation} />
              </View>

              {tab === 'Booking Requests' ? (
                <View className="mt-4 flex-row gap-3">
                  <Pressable
                    disabled={isBusy}
                    onPress={() => respond(b.id, false)}
                    className="flex-1 items-center justify-center rounded-2xl bg-gray-100 py-3">
                    <Text className="text-xs font-extrabold text-gray-900">{isBusy ? '...' : 'Decline'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={isBusy}
                    onPress={() => respond(b.id, true)}
                    className="flex-1 items-center justify-center rounded-2xl bg-[#1D2DD9] py-3">
                    <Text className="text-xs font-extrabold text-white">{isBusy ? '...' : 'Accept'}</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="mt-4 flex-row gap-3">
                  {b.status === 'CONFIRMED' ? (
                    <Pressable
                      disabled={isBusy}
                      onPress={() => startTrip(b.id)}
                      className="flex-1 items-center justify-center rounded-2xl bg-[#111827] py-3">
                      <Text className="text-xs font-extrabold text-white">{isBusy ? '...' : 'Start trip'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={isBusy}
                      onPress={() => completeTrip(b.id)}
                      className="flex-1 items-center justify-center rounded-2xl bg-[#111827] py-3">
                      <Text className="text-xs font-extrabold text-white">{isBusy ? '...' : 'Complete trip'}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function LocationRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
        <FontAwesome name={icon} size={16} color="#111827" />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
        <Text className="text-sm font-extrabold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
