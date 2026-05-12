import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BookingDetailsBody } from '@/components/BookingDetailsBody';
import {
  apiGet,
  apiPatch,
  apiPost,
  driverGet,
  driverPatch,
  ensureDriverSession,
  ensureUserSession,
} from '@/lib/api';
import { useStore } from '@/store/store';
import { LinearGradient } from 'expo-linear-gradient';

const USER_SNOOZE_KEY = 'armoured:ongoing-trip-snooze:v1';
const USER_IN_MEMORY_SNOOZE_KEY = '__armouredOngoingTripSnoozeUntilMs';
const DRIVER_SNOOZE_KEY = 'armoured_driver:ongoing-trip-snooze:v1';
const DRIVER_IN_MEMORY_SNOOZE_KEY = '__armouredDriverOngoingTripSnoozeUntilMs';

type BookingParams = {
  id?: string;
  live?: string;
  pickupLocation?: string;
  dropLocation?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: string;
  driverName?: string;
  customerName?: string;
  vehicleArmour?: string;
  vehicleType?: string;
  vehicleName?: string;
};

type UserLiveBooking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number | null;
  driver?: { name: string } | null;
  vehicle?: { armourLevel: string; vehicleType: string } | null;
};

type DriverLiveBooking = {
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
    manufacturer?: string | null;
    carModel?: string | null;
  } | null;
};

type DisplayBooking = {
  personLabel: string;
  personName: string;
  status: string;
  payoutLabel: string;
  vehicleName: string;
  vehicleType: string;
  vehicleArmour: string;
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
};

export default function BookingDetailsScreen() {
  const params = useLocalSearchParams<BookingParams>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetchedUser, setFetchedUser] = useState<UserLiveBooking | null>(null);
  const [fetchedDriver, setFetchedDriver] = useState<DriverLiveBooking | null>(null);
  const [pollReady, setPollReady] = useState(false);

  const activeRole = useStore((s) => s.activeRole);
  const isDriverMode = activeRole === 'DRIVER';

  const bookingId = (params.id ?? '').trim();
  const isLiveRoute = params.live === '1';
  const initialStatus = (params.status ?? '').trim();

  const shouldPoll =
    Boolean(bookingId) &&
    (isLiveRoute || initialStatus === 'IN_PROGRESS' || initialStatus === 'CONFIRMED');

  const load = useCallback(async () => {
    if (!bookingId || !shouldPoll) return;
    try {
      if (isDriverMode) {
        const s = await ensureDriverSession();
        const active = await driverGet<DriverLiveBooking[]>(`/driver/bookings/active`, s.driverId);
        const match = Array.isArray(active) ? active.find((b) => b.id === bookingId) : undefined;
        setFetchedDriver(match ?? null);
      } else {
        const s = await ensureUserSession();
        const rows = await apiGet<UserLiveBooking[]>(`/bookings`, s.userId);
        const match = Array.isArray(rows) ? rows.find((b) => b.id === bookingId) : undefined;
        setFetchedUser(match ?? null);
      }
    } catch {
      // Login and other screens handle session errors.
    } finally {
      setPollReady(true);
    }
  }, [bookingId, shouldPoll, isDriverMode]);

  useEffect(() => {
    if (!shouldPoll) {
      setPollReady(true);
      return;
    }
    setPollReady(false);
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    void load().then(() => {
      if (cancelled) return;
      interval = setInterval(() => {
        void load().catch(() => null);
      }, 5000);
    });
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [shouldPoll, load]);

  const display = useMemo((): DisplayBooking => {
    const personLabel = isDriverMode ? 'Customer' : 'Driver';
    if (shouldPoll) {
      if (isDriverMode && fetchedDriver) {
        const b = fetchedDriver;
        const v = b.vehicle;
        const vehicleName =
          [v?.manufacturer, v?.carModel].filter(Boolean).join(' ').trim() || v?.vehicleType || '—';
        const payout = b.totalPrice ?? NaN;
        return {
          personLabel,
          personName: b.user?.name ?? '—',
          status: b.status,
          payoutLabel: Number.isFinite(payout) ? `Rs ${payout.toFixed(2)}` : '—',
          vehicleName,
          vehicleType: v?.vehicleType ?? '—',
          vehicleArmour: v?.armourLevel ?? '—',
          id: b.id,
          pickupLocation: b.pickupLocation,
          dropLocation: b.dropLocation,
          startTime: b.startTime,
          endTime: b.endTime,
        };
      }
      if (!isDriverMode && fetchedUser) {
        const b = fetchedUser;
        const v = b.vehicle;
        const payout = b.totalPrice ?? NaN;
        const vehicleName =
          (params.vehicleName ?? '').trim() || v?.vehicleType || '—';
        return {
          personLabel,
          personName: b.driver?.name ?? '—',
          status: b.status,
          payoutLabel: Number.isFinite(payout) ? `Rs ${payout.toFixed(2)}` : '—',
          vehicleName,
          vehicleType: v?.vehicleType ?? '—',
          vehicleArmour: v?.armourLevel ?? '—',
          id: b.id,
          pickupLocation: b.pickupLocation,
          dropLocation: b.dropLocation,
          startTime: b.startTime,
          endTime: b.endTime,
        };
      }
    }
    const payout = Number(params.totalPrice ?? '');
    return {
      personLabel,
      personName: isDriverMode ? params.customerName ?? '—' : params.driverName ?? '—',
      status: params.status ?? '—',
      payoutLabel: Number.isFinite(payout) ? `Rs ${payout.toFixed(2)}` : '—',
      vehicleName: params.vehicleName ?? '—',
      vehicleType: params.vehicleType ?? '—',
      vehicleArmour: params.vehicleArmour ?? '—',
      id: bookingId || '—',
      pickupLocation: params.pickupLocation ?? '—',
      dropLocation: params.dropLocation ?? '—',
      startTime: params.startTime ?? '',
      endTime: params.endTime ?? '',
    };
  }, [shouldPoll, isDriverMode, fetchedUser, fetchedDriver, params, bookingId]);

  const hasLiveRow = isDriverMode ? fetchedDriver != null : fetchedUser != null;

  useEffect(() => {
    if (!shouldPoll) return;
    const st = display.status;
    if (st === 'COMPLETED') {
      router.replace(isDriverMode ? ('/(driver-tabs)/dashboard' as any) : ('/(tabs)/activities' as any));
      return;
    }
    if (st === 'REJECTED' || st === 'EXPIRED') {
      router.replace(isDriverMode ? ('/(driver-tabs)' as any) : ('/(tabs)/activities' as any));
    }
  }, [shouldPoll, display.status, isDriverMode]);

  async function dismissLive() {
    const untilMs = Date.now() + 6 * 60 * 60 * 1000;
    if (isDriverMode) {
      (globalThis as unknown as Record<string, number>)[DRIVER_IN_MEMORY_SNOOZE_KEY] = untilMs;
      try {
        await AsyncStorage.setItem(DRIVER_SNOOZE_KEY, JSON.stringify({ untilMs }));
      } catch {
        // ignore
      }
      router.replace('/(driver-tabs)' as any);
    } else {
      (globalThis as unknown as Record<string, number>)[USER_IN_MEMORY_SNOOZE_KEY] = untilMs;
      try {
        await AsyncStorage.setItem(USER_SNOOZE_KEY, JSON.stringify({ untilMs }));
      } catch {
        // ignore
      }
      router.replace('/(tabs)' as any);
    }
  }

  function onPressBack() {
    if (isLiveRoute) {
      void dismissLive();
    } else {
      router.back();
    }
  }

  async function cancelTripDriver(bookingIdParam: string) {
    Alert.alert('Cancel trip?', 'This will cancel the selected trip.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(bookingIdParam);
            const s = await ensureDriverSession();
            await driverPatch(`/driver/bookings/${bookingIdParam}/cancel`, s.driverId);
            router.back();
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel trip failed');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  async function cancelTripUser(bookingIdParam: string) {
    Alert.alert('Cancel trip?', 'This will cancel the current trip.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(bookingIdParam);
            const s = await ensureUserSession();
            await apiPatch(`/bookings/${bookingIdParam}/cancel`, s.userId);
            await load();
            router.replace('/(tabs)/activities' as any);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel failed');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  async function extendUser(mode: 'ADD_2_HOURS' | 'ADD_1_DAY') {
    if (!display.id || display.id === '—') return;
    try {
      setBusy(true);
      const s = await ensureUserSession();
      const updated = await apiPost<UserLiveBooking>(`/bookings/${display.id}/extend`, s.userId, { mode });
      setFetchedUser(updated);
    } catch (e) {
      Alert.alert('Extension denied', e instanceof Error ? e.message : 'Conflict or error');
    } finally {
      setBusy(false);
    }
  }

  async function completeTripDriver(bookingIdParam: string) {
    Alert.alert('Complete trip?', 'Mark this trip as completed.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setBusy(true);
            const s = await ensureDriverSession();
            await driverPatch(`/driver/bookings/${bookingIdParam}/complete`, s.driverId);
            router.replace('/(driver-tabs)/dashboard' as any);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Complete failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (!bookingId) {
    return (
      <LinearGradient
        colors={['rgb(77, 76, 76)', 'rgb(165, 165, 165)', 'rgb(235, 235, 235)', 'rgb(247, 248, 255)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-5">
          <Text className="text-sm font-semibold text-gray-600">Missing booking.</Text>
          <Pressable onPress={() => router.back()} className="mt-4 rounded-2xl bg-[#1D2DD9] px-4 py-3">
            <Text className="text-xs font-extrabold text-white">Go back</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isLiveRoute && shouldPoll && !pollReady) {
    return (
      <LinearGradient
        colors={['rgb(77, 76, 76)', 'rgb(165, 165, 165)', 'rgb(235, 235, 235)', 'rgb(247, 248, 255)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-sm font-semibold text-gray-500">Loading…</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isLiveRoute && shouldPoll && pollReady && !hasLiveRow) {
    return (
      <LinearGradient
        colors={['rgb(77, 76, 76)', 'rgb(165, 165, 165)', 'rgb(235, 235, 235)', 'rgb(247, 248, 255)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => void dismissLive()}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <FontAwesome name="arrow-left" size={16} color="#111827" />
              </Pressable>
              <Text className="text-lg font-bold text-gray-200">Booking details</Text>
              <View className="h-10 w-10" />
            </View>
          </View>
          <View className="flex-1 items-center justify-center px-5">
            <Text className="text-base font-extrabold text-gray-900">No active trip</Text>
            <Text className="mt-2 text-xs font-semibold text-gray-500">This trip may have ended.</Text>
            <Pressable onPress={() => void dismissLive()} className="mt-4 rounded-2xl bg-[#1D2DD9] px-4 py-3">
              <Text className="text-xs font-extrabold text-white">
                {isDriverMode ? 'Back to bookings' : 'Back to home'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const st = display.status;
  const userMayCancel =
    st === 'REQUESTED' || st === 'PENDING_DRIVER' || st === 'CONFIRMED';
  const showUserExtend = !isDriverMode && (st === 'IN_PROGRESS' || st === 'CONFIRMED');
  const showUserCancel = !isDriverMode && userMayCancel;
  const showDriverComplete = isDriverMode && st === 'IN_PROGRESS';
  const showDriverCancel = isDriverMode && st === 'CONFIRMED';
  const showUserInfoDuringTrip = !isDriverMode && st === 'IN_PROGRESS';

  return (
    <LinearGradient
      colors={['rgb(77, 76, 76)', 'rgb(165, 165, 165)', 'rgb(235, 235, 235)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.3, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onPressBack}
              className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
              <FontAwesome name="arrow-left" size={16} color="#111827" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-200">Booking details</Text>
            {shouldPoll ? (
              <Pressable
                onPress={() => void load()}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <FontAwesome name="refresh" size={16} color="#111827" />
              </Pressable>
            ) : (
              <View className="h-10 w-10" />
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-4">
          <BookingDetailsBody
            personLabel={display.personLabel}
            personName={display.personName}
            statusLabel={display.status}
            payoutLabel={display.payoutLabel}
            vehicleName={display.vehicleName}
            vehicleType={display.vehicleType}
            vehicleArmour={display.vehicleArmour}
            bookingId={display.id}
            pickupLocation={display.pickupLocation}
            dropLocation={display.dropLocation}
            startTime={display.startTime}
            endTime={display.endTime}
          />

          {showUserInfoDuringTrip ? (
            <View className="mt-4 rounded-2xl bg-gray-50 px-4 py-3">
              <Text className="text-xs font-semibold text-gray-600">
                You’ll be notified here once the driver completes the trip.
              </Text>
            </View>
          ) : null}

          {showUserExtend ? (
            <View className="mt-4 gap-3">
              <Text className="text-xs font-extrabold text-gray-900">Extend booking</Text>
              <View className="flex-row gap-3">
                <Pressable
                  disabled={busy}
                  onPress={() => void extendUser('ADD_2_HOURS')}
                  className={`flex-1 items-center rounded-2xl py-3 ${busy ? 'bg-gray-200' : 'bg-[#1D2DD9]'}`}>
                  <Text className={`text-xs font-extrabold ${busy ? 'text-gray-500' : 'text-white'}`}>
                    +2 hours
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy}
                  onPress={() => void extendUser('ADD_1_DAY')}
                  className={`flex-1 items-center rounded-2xl py-3 ${busy ? 'bg-gray-200' : 'bg-[#1D2DD9]'}`}>
                  <Text className={`text-xs font-extrabold ${busy ? 'text-gray-500' : 'text-white'}`}>
                    +1 day
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {showDriverComplete ? (
            <Pressable
              disabled={busy}
              onPress={() => {
                const id = display.id;
                if (id && id !== '—') void completeTripDriver(id);
              }}
              className={`mt-4 items-center justify-center rounded-2xl py-4 ${busy ? 'bg-gray-200' : 'bg-emerald-600'}`}>
              <Text className={`text-sm font-extrabold ${busy ? 'text-gray-500' : 'text-white'}`}>
                {busy ? 'Please wait…' : 'Complete trip'}
              </Text>
            </Pressable>
          ) : null}

          {showUserCancel ? (
            <Pressable
              disabled={busyId === display.id}
              onPress={() => {
                const id = display.id;
                if (id && id !== '—') void cancelTripUser(id);
              }}
              className={`mt-4 items-center justify-center rounded-full py-4 ${
                busyId === display.id ? 'bg-gray-200' : 'bg-red-600'
              }`}>
              <Text className={`text-sm font-bold ${busyId === display.id ? 'text-gray-500' : 'text-white'}`}>
                {busyId === display.id ? 'Please wait…' : 'Cancel trip'}
              </Text>
            </Pressable>
          ) : null}

          {showDriverCancel ? (
            <Pressable
              disabled={busyId === display.id}
              onPress={() => {
                const id = display.id;
                if (id && id !== '—') void cancelTripDriver(id);
              }}
              className={`mt-4 items-center justify-center rounded-full py-4 ${
                busyId === display.id ? 'bg-gray-200' : 'bg-red-600'
              }`}>
              <Text className={`text-sm font-bold ${busyId === display.id ? 'text-gray-500' : 'text-white'}`}>
                {busyId === display.id ? 'Please wait…' : 'Cancel trip'}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
