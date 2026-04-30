import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingSummaryCard } from '@/components/BookingSummaryCard';
import { driverGet, driverPatch, ensureDriverSession } from '@/lib/api';

type BookingTab = 'Booking Requests' | 'Booking History';

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

export default function DriverBookingsScreen() {
  const [tab, setTab] = useState<BookingTab>('Booking Requests');
  const [requests, setRequests] = useState<Booking[]>([]);
  const [history, setHistory] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const s = await ensureDriverSession();
    const [req, done, act] = await Promise.all([
      driverGet<Booking[]>(`/driver/requests`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/completed`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/active`, s.driverId),
    ]);
    setRequests(Array.isArray(req) ? req : []);
    setHistory(Array.isArray(done) ? done : []);
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

  const list = tab === 'Booking Requests' ? requests : history;
  const ongoingCardBookings = useMemo(
    () =>
      active
        .filter((b) => b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED')
        .sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'IN_PROGRESS' ? -1 : 1;
        }),
    [active],
  );
  const emptyState = useMemo(() => {
    if (loading) return false;
    if (tab === 'Booking Requests') {
      return list.length === 0 && ongoingCardBookings.length === 0;
    }
    return list.length === 0;
  }, [loading, tab, list.length, ongoingCardBookings.length]);

  function formatRange(startTime: string, endTime: string) {
    const s = new Date(startTime);
    const e = new Date(endTime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
    return `${s.toLocaleString()} -> ${e.toLocaleString()}`;
  }

  async function respond(bookingId: string, accept: boolean) {
    try {
      setBusyId(bookingId);
      const s = await ensureDriverSession();
      await driverPatch(`/driver/bookings/${bookingId}/respond`, s.driverId, { accept });
      await refresh();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusyId(null);
    }
  }

  async function startTrip(bookingId: string) {
    try {
      setBusyId(bookingId);
      const s = await ensureDriverSession();
      await driverPatch(`/driver/bookings/${bookingId}/start`, s.driverId);
      router.push({ pathname: '/driver-ongoing-trip' as any, params: { bookingId } });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Start trip failed');
    } finally {
      setBusyId(null);
    }
  }

  async function cancelTrip(bookingId: string) {
    Alert.alert('Cancel trip?', 'This will cancel the selected trip.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(bookingId);
            const s = await ensureDriverSession();
            await driverPatch(`/driver/bookings/${bookingId}/cancel`, s.driverId);
            await refresh();
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Cancel trip failed');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-center">
          <Text className="text-base font-extrabold text-gray-900">Bookings</Text>
          {/* <Pressable className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="filter" size={16} color="#111827" />
          </Pressable> */}
        </View>

        <View className="mt-4 flex-row rounded-2xl bg-gray-100 p-1">
          {(['Booking Requests', 'Booking History'] as const).map((t) => {
            const isActive = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                  isActive ? 'bg-black' : ''
                }`}>
                <Text className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-gray-500'}`}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        {!loading && tab === 'Booking Requests' && ongoingCardBookings.length > 0
          ? ongoingCardBookings.map((ongoingCardBooking) => (
              <Pressable key={ongoingCardBooking.id} 
              className="mb-4 rounded-3xl bg-white p-4" 
              style={cardShadow}
              onPress={() =>
                router.push({
                  pathname: '/booking-details' as any,
                  params: {
                      id: ongoingCardBooking.id,
                    pickupLocation: ongoingCardBooking.pickupLocation,
                    dropLocation: ongoingCardBooking.dropLocation,
                    status: ongoingCardBooking.status,
                    startTime: ongoingCardBooking.startTime,
                    endTime: ongoingCardBooking.endTime,
                    totalPrice: String(ongoingCardBooking.totalPrice ?? 0),
                    driverName: '',
                    customerName: ongoingCardBooking.user?.name ?? '',
                    vehicleArmour: ongoingCardBooking.vehicle?.armourLevel ?? '',
                    vehicleType: ongoingCardBooking.vehicle?.vehicleType ?? '',
                    vehicleName: (ongoingCardBooking.vehicle?.manufacturer ?? '') + ' ' + (ongoingCardBooking.vehicle?.carModel ?? ''),
                  },
                })
              }
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-gray-400">
                      {ongoingCardBooking.status === 'CONFIRMED' ? 'Requested trip' : 'Ongoing trip'}
                    </Text>
                    <Text className="mt-1 text-base font-extrabold text-gray-900">
                      {ongoingCardBooking.pickupLocation}
                      {' -> '}
                      {ongoingCardBooking.dropLocation}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold text-gray-500">
                      {ongoingCardBooking.user?.name ?? '-'} • {ongoingCardBooking.vehicle?.armourLevel ?? '-'}
                    </Text>
                  </View>
                  <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-[10px] font-extrabold text-gray-800">{ongoingCardBooking.status}</Text>
                  </View>
                </View>

                {ongoingCardBooking.status === 'CONFIRMED' ? (
                  <View className="mt-4 flex-row gap-3">
                    <Pressable
                      disabled={busyId === ongoingCardBooking.id}
                      onPress={() => void cancelTrip(ongoingCardBooking.id)}
                      className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                        busyId === ongoingCardBooking.id ? 'bg-gray-200' : 'bg-red-600'
                      }`}>
                      <Text className={`text-xs font-extrabold ${busyId === ongoingCardBooking.id ? 'text-gray-500' : 'text-white'}`}>
                        {busyId === ongoingCardBooking.id ? 'Please wait...' : 'Cancel trip'}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={busyId === ongoingCardBooking.id}
                      onPress={() => void startTrip(ongoingCardBooking.id)}
                      className={`flex-1 items-center justify-center rounded-2xl py-3 ${
                        busyId === ongoingCardBooking.id ? 'bg-gray-300' : 'bg-[#111827]'
                      }`}>
                      <Text className="text-xs font-extrabold text-white">
                        {busyId === ongoingCardBooking.id ? 'Please wait...' : 'Start trip'}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    disabled={busyId === ongoingCardBooking.id}
                    onPress={() =>
                      router.push({ pathname: '/driver-ongoing-trip' as any, params: { bookingId: ongoingCardBooking.id } })
                    }
                    className={`mt-4 items-center justify-center rounded-2xl py-3 ${
                      busyId === ongoingCardBooking.id ? 'bg-gray-300' : 'bg-[#111827]'
                    }`}>
                    <Text className="text-xs font-extrabold text-white">
                      {busyId === ongoingCardBooking.id ? 'Please wait...' : 'Open ongoing trip'}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            ))
          : null}

        {loading ? (
          <View className="mt-10 items-center">
            <Text className="text-sm font-semibold text-gray-500">Loading...</Text>
          </View>
        ) : null}

        {emptyState ? (
          <View className="mt-10 items-center">
            <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
              <FontAwesome name="calendar" size={20} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-extrabold text-gray-900">No bookings</Text>
            <Text className="mt-1 text-xs font-semibold text-gray-500">You will see your {tab.toLowerCase()} here.</Text>
          </View>
        ) : null}

        {list.map((b) => {
          const isBusy = busyId === b.id;
          const customerName = b.user?.name ?? '-';
          const payout = b.totalPrice ?? 0;
          const vehicleName = `${b.vehicle?.manufacturer ?? ''} ${b.vehicle?.carModel ?? ''}`.trim();

          return (
            <View key={b.id}>
              <BookingSummaryCard
                pickupLocation={b.pickupLocation}
                dropLocation={b.dropLocation}
                payout={payout}
                onPress={() =>
                  router.push({
                    pathname: '/booking-details' as any,
                    params: {
                      id: b.id,
                      pickupLocation: b.pickupLocation,
                      dropLocation: b.dropLocation,
                      status: b.status,
                      startTime: b.startTime,
                      endTime: b.endTime,
                      totalPrice: String(payout),
                      driverName: '',
                      customerName,
                      vehicleArmour: b.vehicle?.armourLevel ?? '',
                      vehicleType: b.vehicle?.vehicleType ?? '',
                      vehicleName: vehicleName || '',
                    },
                  })
                }
              />
              {tab === 'Booking Requests' ? (
                <View className="mb-4 -mt-1 flex-row gap-3">
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
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
