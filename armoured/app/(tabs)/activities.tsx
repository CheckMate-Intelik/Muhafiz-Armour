import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingSummaryCard } from '@/components/BookingSummaryCard';
import { apiGet, ensureUserSession } from '@/lib/api';

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
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-center">
          <Text className="text-base font-extrabold text-gray-900">Activities</Text>
        </View>

        <View className="mt-4 flex-row rounded-2xl bg-gray-100 p-1">
          {(['Schedule', 'Recent', 'Completed', 'Canceled'] as const).map((s) => {
            const active = status === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${active ? 'bg-black' : ''}`}>
                <Text
                  className={`text-xs font-extrabold ${active ? 'text-white' : 'text-gray-500'}`}>
                  {s === 'Schedule' ? 'Scheduled' : s}
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

        {!loading && rides.length === 0 ? (
          <View className="mt-10 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
              <FontAwesome name="calendar" size={20} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-gray-900">No activities</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">
              Your bookings will appear here.
            </Text>
          </View>
        ) : null}

        {rides.map((r) => (
          (() => {
            const vehicleName = `${r.vehicle?.manufacturer ?? ''} ${r.vehicle?.carModel ?? ''}`.trim();
            return (
          <BookingSummaryCard
            key={r.id}
            pickupLocation={r.pickupLocation}
            dropLocation={r.dropLocation}
            payout={r.totalPrice}
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
          />
            );
          })()
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
