import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingSummaryCard } from '@/components/BookingSummaryCard';
import { TripRouteCard } from '@/components/TripRouteCard';
import { driverGet, driverPatch, ensureDriverSession } from '@/lib/api';

type BookingTab = 'Booking Requests' | 'Booking History';

type DriverVehicle = {
  id: string;
  armourLevel: string;
  vehicleType: string;
  carModel?: string | null;
  manufacturer?: string | null;
  generation?: string | null;
  year?: number | null;
  color?: string | null;
  numberPlate?: string | null;
  registrationNumber?: string | null;
  imageUrls?: string[];
  baseRatePerHour: number;
  location: string;
  isApproved: boolean;
};

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
    id?: string;
    armourLevel: string;
    vehicleType: string;
    baseRatePerHour: number;
    location: string;
    manufacturer?: string | null;
    carModel?: string | null;
    imageUrls?: string[];
  } | null;
};

export default function DriverBookingsScreen() {
  const [tab, setTab] = useState<BookingTab>('Booking Requests');
  const [requests, setRequests] = useState<Booking[]>([]);
  const [history, setHistory] = useState<Booking[]>([]);
  const [active, setActive] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const s = await ensureDriverSession();
    const [req, done, act, vs] = await Promise.all([
      driverGet<Booking[]>(`/driver/requests`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/completed`, s.driverId),
      driverGet<Booking[]>(`/driver/bookings/active`, s.driverId),
      driverGet<DriverVehicle[]>(`/driver/vehicles`, s.driverId),
    ]);
    setRequests(Array.isArray(req) ? req : []);
    setHistory(Array.isArray(done) ? done : []);
    setActive(Array.isArray(act) ? act : []);
    setVehicles(Array.isArray(vs) ? vs : []);
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

  const approvedVehicles = useMemo(() => vehicles.filter((v) => v.isApproved), [vehicles]);

  const list = useMemo(() => {
    const src = tab === 'Booking Requests' ? requests : history;
    if (selectedVehicleId === 'ALL') return src;
    return src.filter((b) => (b.vehicle?.id ? String(b.vehicle.id) === selectedVehicleId : false));
  }, [tab, requests, history, selectedVehicleId]);

  const ongoingCardBookings = useMemo(
    () =>
      active
        .filter((b) => {
          if (selectedVehicleId === 'ALL') return true;
          return b.vehicle?.id ? String(b.vehicle.id) === selectedVehicleId : false;
        })
        .filter((b) => b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED')
        .sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'IN_PROGRESS' ? -1 : 1;
        }),
    [active, selectedVehicleId],
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
                  isActive ? 'bg-gray-800' : ''
                }`}>
                <Text className={`text-xs font-extrabold ${isActive ? 'text-white' : 'text-gray-500'}`}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        {approvedVehicles.length > 0 ? (
          <View className="mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => setSelectedVehicleId('ALL')}
                className={`mr-2 h-[74px] w-[96px] items-center justify-center rounded-2xl border border-gray-200 ${
                  selectedVehicleId === 'ALL' ? 'bg-gray-800' : 'bg-white'
                }`}>
                <Text className={`text-xs font-extrabold ${selectedVehicleId === 'ALL' ? 'text-white' : 'text-gray-800'}`}>All</Text>
              </Pressable>

              {approvedVehicles.map((v) => {
                const id = String(v.id);
                const activeCar = selectedVehicleId === id;
                const firstImg = Array.isArray(v.imageUrls) && v.imageUrls.length > 0 ? v.imageUrls[0] : '';
                const label = `${v.manufacturer ?? ''} ${v.carModel ?? ''}`.trim() || v.vehicleType || v.armourLevel || 'Vehicle';

                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedVehicleId(id)}
                    className={`mr-2 h-[74px] w-[140px] overflow-hidden rounded-2xl border ${
                      activeCar ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}>
                    <View className="flex-row items-center">
                      <View className={`h-[74px] w-[74px] items-center justify-center ${activeCar ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        {firstImg ? (
                          <Image source={{ uri: firstImg }} style={{ width: 74, height: 74 }} resizeMode="cover" />
                        ) : (
                          <FontAwesome name="car" size={18} color={activeCar ? '#FFFFFF' : '#111827'} />
                        )}
                      </View>
                      <View className="flex-1 px-2">
                        <Text numberOfLines={2} className={`text-[11px] font-extrabold ${activeCar ? 'text-white' : 'text-gray-900'}`}>
                          {label}
                        </Text>
                        <Text numberOfLines={1} className={`mt-0.5 text-[10px] font-bold ${activeCar ? 'text-gray-200' : 'text-gray-500'}`}>
                          {v.numberPlate ?? v.registrationNumber ?? v.armourLevel}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {!loading && tab === 'Booking Requests' && ongoingCardBookings.length > 0
          ? ongoingCardBookings.map((b) => {
              const metaLine = `${b.user?.name ?? '—'} • ${b.vehicle?.vehicleType ?? b.vehicle?.armourLevel ?? '—'}`;
              const detailParams = {
                id: b.id,
                pickupLocation: b.pickupLocation,
                dropLocation: b.dropLocation,
                status: b.status,
                startTime: b.startTime,
                endTime: b.endTime,
                totalPrice: String(b.totalPrice ?? 0),
                driverName: '',
                customerName: b.user?.name ?? '',
                vehicleArmour: b.vehicle?.armourLevel ?? '',
                vehicleType: b.vehicle?.vehicleType ?? '',
                vehicleName: `${b.vehicle?.manufacturer ?? ''} ${b.vehicle?.carModel ?? ''}`.trim(),
              };

              if (b.status === 'IN_PROGRESS') {
                return (
                  <View key={b.id} className={busyId === b.id ? 'opacity-50' : ''}>
                    <TripRouteCard
                      from={b.pickupLocation}
                      to={b.dropLocation}
                      status={b.status}
                      rightMetaText={metaLine}
                      onPress={() => router.push({ pathname: '/driver-ongoing-trip' as any, params: { bookingId: b.id } })}
                    />
                  </View>
                );
              }

              return (
                <View key={b.id}>
                  <TripRouteCard
                    from={b.pickupLocation}
                    to={b.dropLocation}
                    status={b.status}
                    rightMetaText={metaLine}
                    onPress={() => router.push({ pathname: '/booking-details' as any, params: detailParams })}
                  />
                </View>
              );
            })
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
                status={b.status}
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
