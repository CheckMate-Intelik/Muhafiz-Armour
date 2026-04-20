import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiGet, ensureUserSession } from '@/lib/api';

type RideStatus = 'Schedule' | 'Recent' | 'Completed' | 'Canceled';
type ActivityMode = 'Ride History' | 'Upcoming';

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number | null;
  driver?: { name: string } | null;
};

export default function ActivitiesScreen() {
  const [mode, setMode] = useState<ActivityMode>('Ride History');
  const [status, setStatus] = useState<RideStatus>('Schedule');

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

  const rides = useMemo(() => {
    if (mode === 'Upcoming') return bookings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'REJECTED');

    switch (status) {
      case 'Completed':
        return bookings.filter((b) => b.status === 'COMPLETED');
      case 'Canceled':
        return bookings.filter((b) => b.status === 'REJECTED' || b.status === 'EXPIRED');
      case 'Recent':
        return bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS');
      case 'Schedule':
      default:
        return bookings.filter((b) => b.status === 'REQUESTED' || b.status === 'PENDING_DRIVER');
    }
  }, [bookings, mode, status]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-center">
          <Text className="text-base font-extrabold text-gray-900">Activities</Text>
        </View>

        <View className="mt-4 flex-row rounded-2xl bg-gray-100 p-1">
          {(['Ride History', 'Upcoming'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${active ? 'bg-[#1D2DD9]' : ''}`}>
                <Text
                  className={`text-xs font-extrabold ${active ? 'text-white' : 'text-gray-500'}`}>
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 flex-row justify-between">
          {(['Schedule', 'Recent', 'Completed', 'Canceled'] as const).map((s) => {
            const active = status === s;
            return (
              <Pressable key={s} onPress={() => setStatus(s)} className="items-center">
                <Text className={`text-xs font-bold ${active ? 'text-gray-900' : 'text-gray-500'}`}>
                  {s}
                </Text>
                <View
                  className={`mt-2 h-[2px] w-10 rounded-full ${active ? 'bg-[#1D2DD9]' : 'bg-transparent'}`}
                />
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

        {!loading && rides.length === 0 ? (
          <View className="mt-10 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
              <FontAwesome name="calendar" size={20} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-gray-900">No activities</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">Your bookings will appear here.</Text>
          </View>
        ) : null}

        {rides.map((r) => (
          <View key={r.id} className="mb-4 rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                    <FontAwesome name="location-arrow" size={16} color="#111827" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-gray-400">Pick up</Text>
                    <Text className="text-sm font-extrabold text-gray-900">{r.pickupLocation}</Text>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center gap-2">
                  <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                    <FontAwesome name="map-marker" size={16} color="#111827" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-gray-400">Destination</Text>
                    <Text className="text-sm font-extrabold text-gray-900">{r.dropLocation}</Text>
                  </View>
                </View>
              </View>

              <Pressable className="ml-3 h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <FontAwesome name="random" size={16} color="#111827" />
              </Pressable>
            </View>

            <View className="mt-4 h-[1px] bg-gray-100" />

            <View className="mt-4">
              <Row label="Status" value={r.status} />
              <Row label="Driver" value={r.driver?.name ?? '—'} />
              <Row
                label="Planned time"
                value={`${new Date(r.startTime).toLocaleString()} → ${new Date(r.endTime).toLocaleString()}`}
              />
              <Row label="Price" value={r.totalPrice ? `$${r.totalPrice}` : '—'} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-xs font-bold text-gray-400">{label}</Text>
      <Text className="text-xs font-extrabold text-gray-900">{value}</Text>
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
