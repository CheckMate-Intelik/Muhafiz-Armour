import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiGet, apiPatch, ensureUserSession } from '@/lib/api';

const SNOOZE_KEY = 'armoured:ongoing-trip-snooze:v1';
const IN_MEMORY_SNOOZE_KEY = '__armouredOngoingTripSnoozeUntilMs';

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number | null;
  driver?: { name: string } | null;
  vehicle?: { type: string } | null;
};

export default function OngoingTripScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId ?? '';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => {
    if (!booking) return 'Ongoing trip';
    if (booking.status === 'IN_PROGRESS') return 'Trip in progress';
    if (booking.status === 'CONFIRMED') return 'Driver confirmed';
    return 'Trip';
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    if (booking.status === 'COMPLETED') {
      router.replace('/(tabs)/activities' as any);
      return;
    }
    if (booking.status === 'REJECTED' || booking.status === 'EXPIRED') {
      router.replace('/(tabs)/activities' as any);
    }
  }, [booking]);

  async function load() {
    const s = await ensureUserSession();
    const rows = await apiGet<Booking[]>(`/bookings`, s.userId);
    const match = Array.isArray(rows) ? rows.find((b) => b.id === bookingId) : undefined;
    setBooking(match ?? null);
  }

  async function cancel() {
    if (!booking) return;
    Alert.alert('Cancel trip?', 'This will cancel the current trip.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const s = await ensureUserSession();
            await apiPatch(`/bookings/${booking.id}/cancel`, s.userId);
            await load();
            router.replace('/(tabs)/activities' as any);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function dismissToHome() {
    const untilMs = Date.now() + 6 * 60 * 60 * 1000;
    (globalThis as any)[IN_MEMORY_SNOOZE_KEY] = untilMs;
    try {
      await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify({ untilMs }));
    } catch {
      // ignore
    }
    router.replace('/(tabs)' as any);
  }

  useEffect(() => {
    let cancelled = false;
    let interval: any = null;

    async function boot() {
      if (!bookingId) {
        router.replace('/(tabs)' as any);
        return;
      }
      try {
        await ensureUserSession();
        if (cancelled) return;
        await load();
        if (cancelled) return;
        interval = setInterval(() => {
          void load().catch(() => null);
        }, 5000);
      } catch {
        router.replace('/login' as any);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm font-semibold text-gray-500">Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={dismissToHome}
              className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
              <FontAwesome name="arrow-left" size={16} color="#111827" />
            </Pressable>
            <Text className="text-base font-extrabold text-gray-900">Ongoing trip</Text>
            <View className="h-10 w-10" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base font-extrabold text-gray-900">No active trip</Text>
          <Text className="mt-2 text-xs font-semibold text-gray-500">This trip may have ended.</Text>
          <Pressable onPress={dismissToHome} className="mt-4 rounded-2xl bg-[#1D2DD9] px-4 py-3">
            <Text className="text-xs font-extrabold text-white">Back to home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const driverName = booking.driver?.name ?? '—';
  const vehicleType = booking.vehicle?.type ?? '—';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={dismissToHome} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">{title}</Text>
          <Pressable onPress={() => void load()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="refresh" size={16} color="#111827" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-6">
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs font-bold text-gray-400">Driver</Text>
              <Text className="mt-1 text-base font-extrabold text-gray-900">{driverName}</Text>
              <View className="mt-2 flex-row items-center gap-2">
                <View className="rounded-full bg-gray-100 px-3 py-1">
                  <Text className="text-[10px] font-extrabold text-gray-800">{vehicleType}</Text>
                </View>
                <View className="rounded-full bg-gray-100 px-3 py-1">
                  <Text className="text-[10px] font-extrabold text-gray-800">{booking.status}</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-4 h-[1px] bg-gray-100" />

          <View className="mt-4">
            <Row label="Pick up" value={booking.pickupLocation} />
            <Row label="Destination" value={booking.dropLocation} />
            <Row label="Planned" value={`${new Date(booking.startTime).toLocaleString()} → ${new Date(booking.endTime).toLocaleString()}`} />
            <Row label="Price" value={booking.totalPrice != null ? `$${booking.totalPrice}` : '—'} />
          </View>

          <View className="mt-4 rounded-2xl bg-gray-50 px-4 py-3">
            <Text className="text-xs font-semibold text-gray-600">
              You’ll be notified here once the driver completes the trip.
            </Text>
          </View>

          {booking.status !== 'IN_PROGRESS' ? (
            <Pressable
              disabled={busy}
              onPress={cancel}
              className={`mt-4 items-center justify-center rounded-2xl py-3 ${busy ? 'bg-gray-200' : 'bg-red-600'}`}>
              <Text className={`text-xs font-extrabold ${busy ? 'text-gray-500' : 'text-white'}`}>
                {busy ? 'Please wait…' : 'Cancel trip'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3">
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <Text className="mt-1 text-sm font-extrabold text-gray-900">{value}</Text>
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

