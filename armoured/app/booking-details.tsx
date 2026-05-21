import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BookingDetailsBody } from '@/components/BookingDetailsBody';
import {
  apiGet,
  apiPatch,
  apiPost,
  dispatcherGet,
  dispatcherPatch,
  ensureDispatcherSession,
  ensureUserSession,
} from '@/lib/api';
import { useStore } from '@/store/store';
import { useBookingsStore } from '@/store/bookingsStore';
import { LinearGradient } from 'expo-linear-gradient';

const USER_SNOOZE_KEY = 'armoured:ongoing-trip-snooze:v1';
const USER_IN_MEMORY_SNOOZE_KEY = '__armouredOngoingTripSnoozeUntilMs';
const DISPATCHER_SNOOZE_KEY = 'armoured_dispatcher:ongoing-trip-snooze:v1';
const DISPATCHER_IN_MEMORY_SNOOZE_KEY = '__armouredDispatcherOngoingTripSnoozeUntilMs';

type BookingParams = {
  id?: string;
  live?: string;
  pickupLocation?: string;
  dropLocation?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  totalPrice?: string;
  dispatcherName?: string;
  customerName?: string;
  vehicleArmour?: string;
  vehicleType?: string;
  vehicleName?: string;
};

type ExtensionRequest = {
  id: string;
  additionalHours: number;
  previousEndTime: string;
  requestedEndTime: string;
  proposedTotalPrice: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

const MAX_BOOKING_HOURS = 5 * 24;

function maxExtensionHoursForBooking(startTime: string, endTime: string) {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return MAX_BOOKING_HOURS;
  const currentHours = (endMs - startMs) / (1000 * 60 * 60);
  return Math.max(1, Math.floor(MAX_BOOKING_HOURS - currentHours));
}

function clampExtensionHours(value: number, max: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

type UserLiveBooking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number | null;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  extensionRequest?: ExtensionRequest | null;
  dispatcher?: { name: string } | null;
  vehicle?: {
    armourLevel: string;
    vehicleType: string;
    manufacturer?: string | null;
    carModel?: string | null;
    baseRatePerHour?: number | null;
    extensionRatePerHour?: number | null;
  } | null;
};

type DispatcherLiveBooking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  status: string;
  startTime: string;
  endTime: string;
  totalPrice: number | null;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  extensionRequest?: ExtensionRequest | null;
  user?: { name: string } | null;
  vehicle?: {
    armourLevel: string;
    vehicleType: string;
    manufacturer?: string | null;
    carModel?: string | null;
    baseRatePerHour?: number | null;
    extensionRatePerHour?: number | null;
  } | null;
};

function formatAdditionalHours(hours: number) {
  if (hours === 1) return '+1 hour';
  return `+${hours} hours`;
}

function formatExtensionDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function extensionStatusLabel(status: ExtensionRequest['status']) {
  if (status === 'PENDING') return 'Awaiting dispatcher approval';
  if (status === 'APPROVED') return 'Extension approved';
  return 'Extension declined';
}

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
  pendingExpiresAt: string | null;
  createdAt: string | null;
};

export default function BookingDetailsScreen() {
  const params = useLocalSearchParams<BookingParams>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extendHours, setExtendHours] = useState(1);
  const [fetchedUser, setFetchedUser] = useState<UserLiveBooking | null>(null);
  const [fetchedDispatcher, setFetchedDispatcher] = useState<DispatcherLiveBooking | null>(null);
  const [pollReady, setPollReady] = useState(false);

  const activeRole = useStore((s) => s.activeRole);
  const isDispatcherMode = activeRole === 'DISPATCHER';

  const bookingId = (params.id ?? '').trim();
  const isLiveRoute = params.live === '1';
  const initialStatus = (params.status ?? '').trim().toUpperCase();
  const hasParamDetails = Boolean(
    (params.pickupLocation ?? '').trim() && (params.dropLocation ?? '').trim()
  );

  const shouldFetch = Boolean(bookingId);
  const shouldPollInterval =
    Boolean(bookingId) &&
    (isLiveRoute || initialStatus === 'IN_PROGRESS' || initialStatus === 'CONFIRMED');

  const load = useCallback(async () => {
    if (!bookingId || !shouldFetch) return;
    try {
      if (isDispatcherMode) {
        const s = await ensureDispatcherSession();
        const active = await dispatcherGet<DispatcherLiveBooking[]>(
          `/dispatcher/bookings/active`,
          s.dispatcherId
        );
        const match = Array.isArray(active) ? active.find((b) => b.id === bookingId) : undefined;
        setFetchedDispatcher(match ?? null);
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
  }, [bookingId, shouldFetch, isDispatcherMode]);

  useEffect(() => {
    if (!shouldFetch) {
      setPollReady(true);
      return;
    }
    setPollReady(false);
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    void load().then(() => {
      if (cancelled) return;
      if (!shouldPollInterval) return;
      interval = setInterval(() => {
        void load().catch(() => null);
      }, 5000);
    });
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [shouldFetch, shouldPollInterval, load]);

  const display = useMemo((): DisplayBooking => {
    const personLabel = isDispatcherMode ? 'Customer' : 'Dispatcher';
    if (isDispatcherMode && fetchedDispatcher) {
      const b = fetchedDispatcher;
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
        pendingExpiresAt: b.pendingExpiresAt ?? null,
        createdAt: b.createdAt ?? null,
      };
    }
    if (!isDispatcherMode && fetchedUser) {
      const b = fetchedUser;
      const v = b.vehicle;
      const payout = b.totalPrice ?? NaN;
      const vehicleName =
        [v?.manufacturer, v?.carModel].filter(Boolean).join(' ').trim() ||
        (params.vehicleName ?? '').trim() ||
        v?.vehicleType ||
        '—';
      return {
        personLabel,
        personName: b.dispatcher?.name ?? '—',
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
        pendingExpiresAt: b.pendingExpiresAt ?? null,
        createdAt: b.createdAt ?? null,
      };
    }
    const payout = Number(params.totalPrice ?? '');
    return {
      personLabel,
      personName: isDispatcherMode ? (params.customerName ?? '—') : (params.dispatcherName ?? '—'),
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
      pendingExpiresAt: null,
      createdAt: null,
    };
  }, [isDispatcherMode, fetchedUser, fetchedDispatcher, params, bookingId]);

  const maxExtendHours = useMemo(
    () => maxExtensionHoursForBooking(display.startTime, display.endTime),
    [display.startTime, display.endTime]
  );

  useEffect(() => {
    setExtendHours((hours) => clampExtensionHours(hours, maxExtendHours));
  }, [maxExtendHours]);

  const hasLiveRow = isDispatcherMode ? fetchedDispatcher != null : fetchedUser != null;

  useEffect(() => {
    if (!shouldPollInterval) return;
    const st = display.status;
    if (st === 'COMPLETED') {
      router.replace(isDispatcherMode ? ('/(dispatcher-tabs)' as any) : ('/(tabs)' as any));
      return;
    }
    if (st === 'REJECTED' || st === 'EXPIRED') {
      router.replace(isDispatcherMode ? ('/(dispatcher-tabs)' as any) : ('/(tabs)' as any));
    }
  }, [shouldPollInterval, display.status, isDispatcherMode]);

  const extendVehicle = isDispatcherMode ? fetchedDispatcher?.vehicle : fetchedUser?.vehicle;
  const extensionRatePerHour = useMemo(() => {
    const v = extendVehicle;
    if (!v) return null;
    if (typeof v.extensionRatePerHour === 'number' && Number.isFinite(v.extensionRatePerHour)) {
      return v.extensionRatePerHour;
    }
    if (typeof v.baseRatePerHour === 'number' && Number.isFinite(v.baseRatePerHour)) {
      return v.baseRatePerHour;
    }
    return null;
  }, [extendVehicle]);

  const estimatedExtensionCharge =
    extensionRatePerHour != null ? Math.round(extensionRatePerHour * extendHours) : null;

  async function dismissLive() {
    const untilMs = Date.now() + 6 * 60 * 60 * 1000;
    if (isDispatcherMode) {
      (globalThis as unknown as Record<string, number>)[DISPATCHER_IN_MEMORY_SNOOZE_KEY] = untilMs;
      try {
        await AsyncStorage.setItem(DISPATCHER_SNOOZE_KEY, JSON.stringify({ untilMs }));
      } catch {
        // ignore
      }
      router.replace('/(dispatcher-tabs)' as any);
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

  async function cancelTripDispatcher(bookingIdParam: string) {
    Alert.alert('Cancel trip?', 'This will cancel the selected trip.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(bookingIdParam);
            const s = await ensureDispatcherSession();
            await dispatcherPatch(`/dispatcher/bookings/${bookingIdParam}/cancel`, s.dispatcherId);
            await useBookingsStore
              .getState()
              .refreshDispatcherBookings()
              .catch(() => null);
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
            await useBookingsStore
              .getState()
              .refreshUserBookings()
              .catch(() => null);
            router.replace('/(tabs)' as any);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel failed');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  async function extendUser() {
    if (!display.id || display.id === '—') return;
    try {
      setBusy(true);
      const s = await ensureUserSession();
      const updated = await apiPost<UserLiveBooking>(`/bookings/${display.id}/extend`, s.userId, {
        hours: extendHours,
      });
      setFetchedUser(updated);
      await useBookingsStore
        .getState()
        .refreshUserBookings()
        .catch(() => null);
    } catch (e) {
      Alert.alert('Extension denied', e instanceof Error ? e.message : 'Conflict or error');
    } finally {
      setBusy(false);
    }
  }

  async function cancelExtensionUser(bookingIdParam: string) {
    Alert.alert('Cancel extension?', 'Your extension request will be withdrawn.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const s = await ensureUserSession();
            const updated = await apiPatch<UserLiveBooking>(
              `/bookings/${bookingIdParam}/extend/cancel`,
              s.userId
            );
            setFetchedUser(updated);
            await useBookingsStore
              .getState()
              .refreshUserBookings()
              .catch(() => null);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not cancel extension');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function declineExtensionDispatcher(bookingIdParam: string) {
    Alert.alert(
      'Decline extension?',
      'The customer will be notified that the extension was declined.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              const s = await ensureDispatcherSession();
              const updated = await dispatcherPatch<DispatcherLiveBooking>(
                `/dispatcher/bookings/${bookingIdParam}/extend/decline`,
                s.dispatcherId
              );
              setFetchedDispatcher(updated);
              await useBookingsStore
                .getState()
                .refreshDispatcherBookings()
                .catch(() => null);
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Could not decline extension');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function approveExtensionDispatcher(bookingIdParam: string) {
    Alert.alert('Approve extension?', 'The trip end time and price will be updated.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setBusy(true);
            const s = await ensureDispatcherSession();
            const updated = await dispatcherPatch<DispatcherLiveBooking>(
              `/dispatcher/bookings/${bookingIdParam}/extend/approve`,
              s.dispatcherId
            );
            setFetchedDispatcher(updated);
            await useBookingsStore
              .getState()
              .refreshDispatcherBookings()
              .catch(() => null);
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not approve extension');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function respondDispatcher(accept: boolean) {
    const id = display.id;
    if (!id || id === '—') return;
    try {
      setBusy(true);
      const s = await ensureDispatcherSession();
      await dispatcherPatch(`/dispatcher/bookings/${id}/respond`, s.dispatcherId, { accept });
      await useBookingsStore
        .getState()
        .refreshDispatcherBookings()
        .catch(() => null);
      router.replace('/(dispatcher-tabs)/bookings' as any);
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  async function startTripDispatcher(bookingIdParam: string) {
    Alert.alert('Start trip?', 'Mark this trip as in progress.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          try {
            setBusy(true);
            const s = await ensureDispatcherSession();
            await dispatcherPatch(`/dispatcher/bookings/${bookingIdParam}/start`, s.dispatcherId);
            await useBookingsStore
              .getState()
              .refreshDispatcherBookings()
              .catch(() => null);
            await load();
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Start trip failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function completeTripDispatcher(bookingIdParam: string) {
    Alert.alert('Complete trip?', 'Mark this trip as completed.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setBusy(true);
            const s = await ensureDispatcherSession();
            await dispatcherPatch(
              `/dispatcher/bookings/${bookingIdParam}/complete`,
              s.dispatcherId
            );
            await useBookingsStore
              .getState()
              .refreshDispatcherBookings()
              .catch(() => null);
            router.replace('/(dispatcher-tabs)' as any);
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
        colors={['rgb(26, 68, 160)', 'rgb(22, 34, 63)', '#020617']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-5">
          <Text className="text-sm font-semibold text-gray-100">Missing booking.</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-2xl px-4 py-3"
            style={{ backgroundColor: '#C9B37A' }}>
            <Text className="text-xs font-extrabold" style={{ color: '#0B0F14' }}>
              Go back
            </Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (shouldFetch && !pollReady && (!hasParamDetails || isLiveRoute)) {
    return (
      <LinearGradient
        colors={['#1a2744', '#0f172a', '#020617']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-sm font-semibold text-gray-100">Loading…</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (isLiveRoute && shouldPollInterval && pollReady && !hasLiveRow) {
    return (
      <LinearGradient
        colors={['#1a2744', '#0f172a', '#020617']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.45, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => void dismissLive()}
                className="h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <FontAwesome name="arrow-left" size={16} color="#9CA3AF" />
              </Pressable>
              <Text className="text-lg font-bold text-gray-200">Booking details</Text>
              <View className="h-10 w-10" />
            </View>
          </View>
          <View className="flex-1 items-center justify-center px-5">
            <Text className="text-base font-extrabold text-gray-100">No active trip</Text>
            <Text className="mt-2 text-xs font-semibold" style={{ color: '#B8BBC0' }}>
              This trip may have ended.
            </Text>
            <Pressable
              onPress={() => void dismissLive()}
              className="mt-4 rounded-2xl px-4 py-3"
              style={{ backgroundColor: '#C9B37A' }}>
              <Text className="text-xs font-extrabold" style={{ color: '#0B0F14' }}>
                {isDispatcherMode ? 'Back to bookings' : 'Back to home'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const st = (display.status ?? '').trim().toUpperCase();
  const userMayCancel = st === 'REQUESTED' || st === 'PENDING_DISPATCHER' || st === 'CONFIRMED';
  const showUserExtend = !isDispatcherMode && (st === 'IN_PROGRESS' || st === 'CONFIRMED');
  const showUserCancel = !isDispatcherMode && userMayCancel;
  const showDispatcherStart = isDispatcherMode && st === 'CONFIRMED';
  const showDispatcherComplete = isDispatcherMode && st === 'IN_PROGRESS';
  const showDispatcherCancel = isDispatcherMode && st === 'CONFIRMED';
  const showDispatcherRespond =
    isDispatcherMode && (st === 'REQUESTED' || st === 'PENDING_DISPATCHER');
  const showUserInfoDuringTrip = !isDispatcherMode && st === 'IN_PROGRESS';

  const extensionRequest: ExtensionRequest | null = isDispatcherMode
    ? (fetchedDispatcher?.extensionRequest ?? null)
    : (fetchedUser?.extensionRequest ?? null);

  const hasPendingExtension = extensionRequest?.status === 'PENDING';
  const showExtensionSection = Boolean(extensionRequest);
  const showUserExtendActions = showUserExtend && !hasPendingExtension;
  const showDispatcherExtensionActions =
    isDispatcherMode && hasPendingExtension && (st === 'IN_PROGRESS' || st === 'CONFIRMED');
  const showUserCancelExtension =
    !isDispatcherMode && hasPendingExtension && (st === 'IN_PROGRESS' || st === 'CONFIRMED');

  return (
    <LinearGradient
      colors={['rgb(23, 45, 92)', 'rgb(22, 37, 68)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.3, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onPressBack}
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <FontAwesome name="arrow-left" size={16} color="#9CA3AF" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-200">Booking details</Text>
            {shouldPollInterval ? (
              <Pressable
                onPress={() => void load()}
                className="h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <FontAwesome name="refresh" size={16} color="#9CA3AF" />
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
            pendingExpiresAt={display.pendingExpiresAt}
            createdAt={display.createdAt}
          />

          {showUserInfoDuringTrip ? (
            <View
              className="mt-4 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}>
              <Text className="text-md font-semibold" style={{ color: '#B8BBC0' }}>
                You’ll be notified here once the dispatcher completes the trip.
              </Text>
            </View>
          ) : null}

          {showExtensionSection && extensionRequest ? (
            <View
              className="mt-4 gap-2 rounded-2xl px-4 py-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}>
              <Text className="text-lg font-bold text-gray-100">Trip extension</Text>
              <Text className="text-md font-bold" style={{ color: '#B8BBC0' }}>
                Requested: {formatAdditionalHours(extensionRequest.additionalHours)}
              </Text>
              <Text className="text-md font-bold" style={{ color: '#B8BBC0' }}>
                Current end: {formatExtensionDateTime(extensionRequest.previousEndTime)}
              </Text>
              <Text className="text-md font-bold" style={{ color: '#B8BBC0' }}>
                Proposed end: {formatExtensionDateTime(extensionRequest.requestedEndTime)}
              </Text>
              <Text className="text-md font-bold" style={{ color: '#B8BBC0' }}>
                Proposed total: Rs {extensionRequest.proposedTotalPrice.toFixed(2)}
              </Text>
              <Text
                className="text-md mt-1 font-bold"
                style={{
                  color:
                    extensionRequest.status === 'APPROVED'
                      ? '#34D399'
                      : extensionRequest.status === 'PENDING'
                        ? '#FBBF24'
                        : '#F87171',
                }}>
                {extensionStatusLabel(extensionRequest.status)}
              </Text>
              {showUserCancelExtension ? (
                <Pressable
                  disabled={busy}
                  onPress={() => {
                    const id = display.id;
                    if (id && id !== '—') void cancelExtensionUser(id);
                  }}
                  className="mt-3 items-center justify-center rounded-2xl py-3"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.35)',
                    opacity: busy ? 0.6 : 1,
                  }}>
                  <Text className="text-md font-extrabold text-red-300">
                    {busy ? 'Please wait…' : 'Cancel extension'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {showDispatcherExtensionActions ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                disabled={busy}
                onPress={() => {
                  const id = display.id;
                  if (id && id !== '—') void declineExtensionDispatcher(id);
                }}
                className="flex-1 items-center justify-center rounded-2xl py-4"
                style={{
                  backgroundColor: '#0B0F14',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.45)',
                  opacity: busy ? 0.6 : 1,
                }}>
                <Text className="text-sm font-extrabold text-red-300">
                  {busy ? 'Please wait…' : 'Decline'}
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => {
                  const id = display.id;
                  if (id && id !== '—') void approveExtensionDispatcher(id);
                }}
                className="flex-1 items-center justify-center rounded-2xl py-4"
                style={{ backgroundColor: '#C9B37A', opacity: busy ? 0.6 : 1 }}>
                <Text className="text-sm font-extrabold" style={{ color: '#0B0F14' }}>
                  {busy ? 'Please wait…' : 'Approve'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showUserExtendActions ? (
            <View className="mt-4 gap-3">
              <Text className="text-lg font-extrabold text-gray-100">Extend booking</Text>
              <Text className="text-md font-semibold" style={{ color: '#B8BBC0' }}>
                Extension requires dispatcher approval after availability is checked.
              </Text>
              <Text className="text-md font-semibold" style={{ color: '#9CA3AF' }}>
                Add up to {maxExtendHours} hour{maxExtendHours === 1 ? '' : 's'} (booking max{' '}
                {MAX_BOOKING_HOURS} h total).
              </Text>
              {extensionRatePerHour != null ? (
                <View
                  className="rounded-2xl px-3 py-2.5"
                  style={{
                    backgroundColor: 'rgba(201,179,122,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(201,179,122,0.25)',
                  }}>
                  <Text className="text-md font-semibold" style={{ color: '#B8BBC0' }}>
                    Extension rate:{' '}
                    <Text className="font-bold text-gray-100">Rs {extensionRatePerHour}/hr</Text>
                  </Text>
                  {estimatedExtensionCharge != null ? (
                    <Text className="text-md mt-1 font-semibold" style={{ color: '#B8BBC0' }}>
                      Estimated extension charge:{' '}
                      <Text className="font-bold text-gray-100">
                        Rs {estimatedExtensionCharge.toFixed(0)}
                      </Text>
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <View className="flex-row items-center gap-2">
                <Pressable
                  disabled={busy || extendHours <= 1}
                  onPress={() => setExtendHours((h) => clampExtensionHours(h - 1, maxExtendHours))}
                  accessibilityLabel="Decrease extension hours"
                  className="h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: '#0B0F14',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    opacity: busy || extendHours <= 1 ? 0.45 : 1,
                  }}>
                  <Text className="text-xl font-extrabold text-gray-100">−</Text>
                </Pressable>
                <View
                  className="min-h-12 flex-1 flex-row items-center justify-center rounded-2xl px-3"
                  style={{
                    backgroundColor: '#0B0F14',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}>
                  <TextInput
                    value={String(extendHours)}
                    onChangeText={(text) => {
                      const digits = text.replace(/[^\d]/g, '');
                      if (!digits) {
                        setExtendHours(1);
                        return;
                      }
                      setExtendHours(
                        clampExtensionHours(Number.parseInt(digits, 10), maxExtendHours)
                      );
                    }}
                    keyboardType="number-pad"
                    editable={!busy}
                    selectTextOnFocus
                    maxLength={3}
                    className="min-w-[3rem] text-center text-lg font-extrabold text-gray-100"
                    style={{ paddingVertical: 8 }}
                  />
                  <Text className="ml-1 text-sm font-bold" style={{ color: '#9CA3AF' }}>
                    hr{extendHours === 1 ? '' : 's'}
                  </Text>
                </View>
                <Pressable
                  disabled={busy || extendHours >= maxExtendHours}
                  onPress={() => setExtendHours((h) => clampExtensionHours(h + 1, maxExtendHours))}
                  accessibilityLabel="Increase extension hours"
                  className="h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: '#0B0F14',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    opacity: busy || extendHours >= maxExtendHours ? 0.45 : 1,
                  }}>
                  <Text className="text-xl font-extrabold text-gray-100">+</Text>
                </Pressable>
              </View>
              <Pressable
                disabled={busy}
                onPress={() => void extendUser()}
                className="items-center rounded-2xl py-3"
                style={{
                  backgroundColor: busy ? 'rgba(255,255,255,0.06)' : '#C9B37A',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                }}>
                <Text
                  className="text-md font-extrabold"
                  style={{ color: busy ? '#9CA3AF' : '#0B0F14' }}>
                  {busy
                    ? 'Please wait…'
                    : estimatedExtensionCharge != null
                      ? `Request ${formatAdditionalHours(extendHours)} · Rs ${estimatedExtensionCharge}`
                      : `Request ${formatAdditionalHours(extendHours)}`}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showDispatcherRespond ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                disabled={busy}
                onPress={() => void respondDispatcher(false)}
                className="flex-1 items-center justify-center rounded-2xl py-4"
                style={{
                  backgroundColor: '#0B0F14',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  opacity: busy ? 0.6 : 1,
                }}>
                <Text className="text-sm font-extrabold text-gray-100">
                  {busy ? 'Please wait…' : 'Decline'}
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void respondDispatcher(true)}
                className="flex-1 items-center justify-center rounded-2xl py-4"
                style={{ backgroundColor: '#C9B37A', opacity: busy ? 0.6 : 1 }}>
                <Text className="text-sm font-extrabold" style={{ color: '#0B0F14' }}>
                  {busy ? 'Please wait…' : 'Accept'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {showDispatcherStart ? (
            <Pressable
              disabled={busy}
              onPress={() => {
                const id = display.id;
                if (id && id !== '—') void startTripDispatcher(id);
              }}
              className="mt-4 items-center justify-center rounded-2xl py-4"
              style={{
                backgroundColor: busy ? 'rgba(255,255,255,0.12)' : '#C9B37A',
                opacity: busy ? 0.6 : 1,
              }}>
              <Text
                className="text-sm font-extrabold"
                style={{ color: busy ? '#9CA3AF' : '#0B0F14' }}>
                {busy ? 'Please wait…' : 'Start trip'}
              </Text>
            </Pressable>
          ) : null}

          {showDispatcherComplete ? (
            <Pressable
              disabled={busy}
              onPress={() => {
                const id = display.id;
                if (id && id !== '—') void completeTripDispatcher(id);
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
              <Text
                className={`text-sm font-bold ${busyId === display.id ? 'text-gray-500' : 'text-white'}`}>
                {busyId === display.id ? 'Please wait…' : 'Cancel trip'}
              </Text>
            </Pressable>
          ) : null}

          {showDispatcherCancel ? (
            <Pressable
              disabled={busyId === display.id}
              onPress={() => {
                const id = display.id;
                if (id && id !== '—') void cancelTripDispatcher(id);
              }}
              className={`mt-4 items-center justify-center rounded-full py-4 ${
                busyId === display.id ? 'bg-gray-200' : 'bg-red-600'
              }`}>
              <Text
                className={`text-sm font-bold ${busyId === display.id ? 'text-gray-500' : 'text-white'}`}>
                {busyId === display.id ? 'Please wait…' : 'Cancel trip'}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
