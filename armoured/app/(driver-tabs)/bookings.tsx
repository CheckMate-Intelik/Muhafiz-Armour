import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BookingSummaryCard } from '@/components/BookingSummaryCard';
import { TripRouteCard } from '@/components/TripRouteCard';
import { driverGet, driverPatch, ensureDriverSession, isNotAuthenticatedError } from '@/lib/api';

function driverMissionBanner(status: string) {
  const s = (status ?? '').trim().toUpperCase();
  if (s === 'IN_PROGRESS') return 'ACTIVE MISSION';
  if (s === 'CONFIRMED') return 'CONFIRMED MISSION';
  if (s === 'COMPLETED') return 'COMPLETED MISSION';
  if (s === 'REJECTED' || s === 'EXPIRED') return 'CANCELED MISSION';
  if (s === 'PENDING_DRIVER') return 'PENDING MISSION';
  if (s === 'REQUESTED') return 'REQUEST MISSION';
  return 'BOOKING';
}

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
      } catch (e) {
        if (isNotAuthenticatedError(e)) {
          router.replace('/login' as any);
        }
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

  return (
    <LinearGradient
      colors={['rgb(51, 47, 56)', 'rgb(88, 88, 90)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-extrabold text-gray-100" style={{ letterSpacing: 0.8 }}>
              BOOKINGS
            </Text>
          </View>

          <View className="mt-4 flex-row overflow-hidden rounded-xl bg-[#2F3135]">
            {(['Booking Requests', 'Booking History'] as const).map((t, idx) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  className="flex-1"
                  style={{
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderLeftColor: '#515458',
                  }}>
                  <View
                    className="items-center justify-center px-1 py-3"
                    style={{
                      borderWidth: active ? 2 : 0,
                      borderColor: active ? 'black' : 'transparent',
                      borderRadius: 10,
                      margin: 6,
                    }}>
                    <FontAwesome
                      name={t === 'Booking Requests' ? 'inbox' : 'history'}
                      size={18}
                      color={active ? '#E5E7EB' : '#B8BBC0'}
                    />
                    <Text
                      className="mt-1 text-[10px] font-extrabold"
                      style={{ color: active ? '#E5E7EB' : '#B8BBC0' }}>
                      {t === 'Booking Requests' ? 'REQUESTS' : 'HISTORY'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          {approvedVehicles.length > 0 ? (
            <View className="mb-4 overflow-hidden rounded-xl bg-[#2F3135] py-2 pl-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }}>
                <Pressable
                  onPress={() => setSelectedVehicleId('ALL')}
                  className="mr-1"
                  style={{
                    borderWidth: selectedVehicleId === 'ALL' ? 2 : 0,
                    borderColor: '#000',
                    borderRadius: 10,
                    margin: 4,
                  }}>
                  <View className="h-[74px] w-[96px] items-center justify-center rounded-lg bg-[#3B3E43]">
                    <Text
                      className={`text-xs font-extrabold ${selectedVehicleId === 'ALL' ? 'text-gray-100' : 'text-[#B8BBC0]'}`}>
                      All
                    </Text>
                  </View>
                </Pressable>

                {approvedVehicles.map((v) => {
                  const id = String(v.id);
                  const activeCar = selectedVehicleId === id;
                  const firstImg = Array.isArray(v.imageUrls) && v.imageUrls.length > 0 ? v.imageUrls[0] : '';
                  const label =
                    `${v.manufacturer ?? ''} ${v.carModel ?? ''}`.trim() || v.vehicleType || v.armourLevel || 'Vehicle';

                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSelectedVehicleId(id)}
                      className="mr-1"
                      style={{
                        borderWidth: activeCar ? 2 : 0,
                        borderColor: '#000',
                        borderRadius: 10,
                        margin: 4,
                      }}>
                      <View className="h-[74px] w-[140px] flex-row items-center overflow-hidden rounded-lg bg-[#3B3E43]">
                        <View className="h-[74px] w-[74px] items-center justify-center bg-black/20">
                          {firstImg ? (
                            <Image source={{ uri: firstImg }} style={{ width: 74, height: 74 }} resizeMode="cover" />
                          ) : (
                            <FontAwesome name="car" size={18} color={activeCar ? '#E5E7EB' : '#B8BBC0'} />
                          )}
                        </View>
                        <View className="flex-1 px-2">
                          <Text
                            numberOfLines={2}
                            className={`text-[11px] font-extrabold ${activeCar ? 'text-gray-100' : 'text-[#B8BBC0]'}`}>
                            {label}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 text-[10px] font-bold text-gray-500">
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
                const missionHeaderLine = `${driverMissionBanner(b.status)} - ${metaLine}`;
                const costLabel =
                  typeof b.totalPrice === 'number' ? `Rs ${b.totalPrice.toFixed(2)}` : undefined;

                return (
                  <View key={b.id} className={busyId === b.id ? 'opacity-50' : ''}>
                    <TripRouteCard
                      variant="mission"
                      missionHeaderLine={missionHeaderLine}
                      missionCostLabel={costLabel}
                      from={b.pickupLocation}
                      to={b.dropLocation}
                      status={b.status}
                      onPress={() =>
                        router.push({
                          pathname: '/booking-details' as any,
                          params:
                            b.status === 'IN_PROGRESS'
                              ? { id: b.id, live: '1' }
                              : detailParams,
                        })
                      }
                    />
                  </View>
                );
              })
            : null}

          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-400">Loading…</Text>
            </View>
          ) : null}

          {emptyState ? (
            <View className="mt-10 items-center">
              <View className="h-14 w-14 items-center justify-center rounded-3xl bg-[#2F3135]">
                <FontAwesome name="calendar" size={20} color="#B8BBC0" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No bookings</Text>
              <Text className="mt-1 text-sm font-semibold text-gray-200">
                You will see your {tab.toLowerCase()} here.
              </Text>
            </View>
          ) : null}

          {list.map((b) => {
            const isBusy = busyId === b.id;
            const customerName = b.user?.name ?? '—';
            const payout = b.totalPrice ?? 0;
            const vehicleName = `${b.vehicle?.manufacturer ?? ''} ${b.vehicle?.carModel ?? ''}`.trim();
            const vehicleBit = b.vehicle?.vehicleType ?? b.vehicle?.armourLevel ?? '—';
            const missionHeaderLine = `${driverMissionBanner(b.status)} - ${customerName} • ${vehicleBit}`;

            return (
              <View key={b.id}>
                <BookingSummaryCard
                  variant="mission"
                  missionHeaderLine={missionHeaderLine}
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
                      className="flex-1 items-center justify-center rounded-2xl border border-[#515458] bg-[#2F3135] py-3">
                      <Text className="text-xs font-extrabold text-gray-100">{isBusy ? '…' : 'Decline'}</Text>
                    </Pressable>
                    <Pressable
                      disabled={isBusy}
                      onPress={() => respond(b.id, true)}
                      className="flex-1 items-center justify-center rounded-2xl bg-[#1D2DD9] py-3">
                      <Text className="text-xs font-extrabold text-white">{isBusy ? '…' : 'Accept'}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
