import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BookingDetailsBody } from '@/components/BookingDetailsBody';
import { driverGet, driverPatch, ensureDriverSession } from '@/lib/api';

const SNOOZE_KEY = 'armoured_driver:ongoing-trip-snooze:v1';
const IN_MEMORY_SNOOZE_KEY = '__armouredDriverOngoingTripSnoozeUntilMs';

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPrice: number | null;
  user?: { name: string } | null;
  vehicle?: {
    armourLevel: string;
    vehicleType: string;
    baseRatePerHour: number;
    location: string;
    manufacturer?: string | null;
    carModel?: string | null;
  } | null;
};

export default function DriverOngoingTripScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId ?? '';
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!booking) return;
    if (booking.status === 'COMPLETED') {
      router.replace('/(driver-tabs)/dashboard' as any);
      return;
    }
    if (booking.status === 'REJECTED' || booking.status === 'EXPIRED') {
      router.replace('/(driver-tabs)' as any);
    }
  }, [booking]);

  async function load() {
    const s = await ensureDriverSession();
    const active = await driverGet<Booking[]>(`/driver/bookings/active`, s.driverId);
    const match = Array.isArray(active) ? active.find((b) => b.id === bookingId) : undefined;
    setBooking(match ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    async function boot() {
      if (!bookingId) {
        router.replace('/(driver-tabs)' as any);
        return;
      }
      try {
        await ensureDriverSession();
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
            const s = await ensureDriverSession();
            await driverPatch(`/driver/bookings/${booking.id}/cancel`, s.driverId);
            await load();
            router.replace('/(driver-tabs)' as any);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel trip failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function dismissToTabs() {
    const untilMs = Date.now() + 6 * 60 * 60 * 1000;
    (globalThis as any)[IN_MEMORY_SNOOZE_KEY] = untilMs;
    try {
      await AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify({ untilMs }));
    } catch {
      // ignore
    }
    router.replace('/(driver-tabs)' as any);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm font-semibold text-gray-500">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={dismissToTabs} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
              <FontAwesome name="arrow-left" size={16} color="#111827" />
            </Pressable>
            <Text className="text-base font-extrabold text-gray-900">Ongoing trip</Text>
            <View className="h-10 w-10" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base font-extrabold text-gray-900">No active trip</Text>
          <Text className="mt-2 text-xs font-semibold text-gray-500">This trip may have ended.</Text>
          <Pressable onPress={dismissToTabs} className="mt-4 rounded-2xl bg-[#1D2DD9] px-4 py-3">
            <Text className="text-xs font-extrabold text-white">Back to bookings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const payout = booking.totalPrice ?? NaN;
  const payoutLabel = Number.isFinite(payout) ? `Rs ${payout.toFixed(2)}` : '—';
  const v = booking.vehicle;
  const vehicleName =
    [v?.manufacturer, v?.carModel].filter(Boolean).join(' ').trim() || v?.vehicleType || '—';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={dismissToTabs} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Ongoing trip</Text>
          <Pressable onPress={() => void load()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="refresh" size={16} color="#111827" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} className="px-5 pt-4">
        <BookingDetailsBody
          personLabel="Customer"
          personName={booking.user?.name ?? '—'}
          statusLabel={booking.status}
          payoutLabel={payoutLabel}
          vehicleName={vehicleName}
          vehicleType={v?.vehicleType ?? '—'}
          vehicleArmour={v?.armourLevel ?? '—'}
          bookingId={booking.id}
          pickupLocation={booking.pickupLocation}
          dropLocation={booking.dropLocation}
          startTime={booking.startTime}
          endTime={booking.endTime}
        />

        {booking.status !== 'IN_PROGRESS' ? (
          <Pressable
            disabled={busy}
            onPress={cancel}
            className={`mt-3 items-center justify-center rounded-2xl py-3 ${busy ? 'bg-gray-200' : 'bg-red-600'}`}>
            <Text className={`text-xs font-extrabold ${busy ? 'text-gray-500' : 'text-white'}`}>
              {busy ? 'Please wait...' : 'Cancel trip'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
