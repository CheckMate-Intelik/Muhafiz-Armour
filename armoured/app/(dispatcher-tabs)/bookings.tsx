import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BookingHistoryCard } from '@/components/BookingHistoryCard';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { dispatcherGet, ensureDispatcherSession, isNotAuthenticatedError } from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';
import { useNavigationReady } from '@/hooks/useNavigationReady';
import { useBookingsStore } from '@/store/bookingsStore';
import { dispatcherAvatarUrl, useStore } from '@/store/store';

type BookingTab = 'Booking Requests' | 'Booking History';

type DispatcherVehicle = {
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

export default function DispatcherBookingsScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const dispatcherProfile = useStore((s) => s.dispatcherProfile);
  const headerAvatarUri = dispatcherAvatarUrl(dispatcherProfile, 'sm');
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: BookingTab =
    (params.tab ?? '').toLowerCase() === 'history' ? 'Booking History' : 'Booking Requests';
  const [tab, setTab] = useState<BookingTab>(initialTab);
  const [vehicles, setVehicles] = useState<DispatcherVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const requests = useBookingsStore((s) => s.dispatcherRequests);
  const history = useBookingsStore((s) => s.dispatcherCompleted);
  const active = useBookingsStore((s) => s.dispatcherActive);
  const dispatcherLoading = useBookingsStore((s) => s.dispatcherLoading);
  const dispatcherLoaded = useBookingsStore((s) => s.dispatcherLoaded);
  const refreshDispatcherBookings = useBookingsStore((s) => s.refreshDispatcherBookings);
  const loading = vehiclesLoading || (dispatcherLoading && !dispatcherLoaded);
  const navigationReady = useNavigationReady();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const wanted = (params.tab ?? '').toLowerCase();
    if (wanted === 'history') setTab('Booking History');
    else if (wanted === 'requests') setTab('Booking Requests');
  }, [params.tab]);

  useEffect(() => {
    if (!navigationReady) return;
    refreshDispatcherBookings().catch((e) => {
      if (isNotAuthenticatedError(e)) redirectToLogin();
    });
  }, [refreshDispatcherBookings, navigationReady]);

  useEffect(() => {
    if (!navigationReady) return;
    let cancelled = false;
    async function loadVehicles() {
      try {
        const s = await ensureDispatcherSession();
        const vs = await dispatcherGet<DispatcherVehicle[]>(`/dispatcher/vehicles`, s.dispatcherId);
        if (cancelled) return;
        setVehicles(Array.isArray(vs) ? vs : []);
      } catch (e) {
        if (isNotAuthenticatedError(e)) redirectToLogin();
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    }
    void loadVehicles();
    return () => {
      cancelled = true;
    };
  }, [navigationReady]);

  const approvedVehicles = useMemo(() => vehicles.filter((v) => v.isApproved), [vehicles]);

  const confirmedActive = useMemo(
    () => active.filter((b) => (b.status ?? '').trim().toUpperCase() === 'CONFIRMED'),
    [active]
  );

  const list = useMemo(() => {
    const src = tab === 'Booking Requests' ? [...confirmedActive, ...requests] : history;
    if (selectedVehicleId === 'ALL') return src;
    return src.filter((b) => (b.vehicle?.id ? String(b.vehicle.id) === selectedVehicleId : false));
  }, [tab, requests, confirmedActive, history, selectedVehicleId]);

  const emptyState = useMemo(() => {
    if (loading) return false;
    return list.length === 0;
  }, [loading, list.length]);

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[20px] font-semibold text-[#C9B37A]">Bookings</Text>
              <Text className="text-lg font-semibold text-[#C9B37A]">My missions</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <NotificationBellButton />
              <Image
                source={{ uri: headerAvatarUri }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            </View>
          </View>

          <View
            className="mt-4 flex-row overflow-hidden rounded-xl"
            style={{ backgroundColor: '#2F3135' }}>
            {(['Booking Requests', 'Booking History'] as const).map((t, idx) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  className="flex-1"
                  style={{
                    borderLeftWidth: idx === 0 ? 0 : 1,
                    borderLeftColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <LinearGradient
                    colors={
                      active
                        ? ['rgb(204, 155, 31)', 'rgb(201, 179, 122)']
                        : ['rgb(37, 37, 37)', 'rgb(0, 0, 0)']
                    }
                    start={{ x: 1, y: 0 }}
                    end={{ x: 1, y: 1 }}>
                    <View
                      className="items-center justify-center px-1 py-3"
                      style={{
                        height: 70,
                      }}>
                      <FontAwesome
                        name={t === 'Booking Requests' ? 'inbox' : 'history'}
                        size={22}
                        color={active ? '#0B0F14' : '#B8BBC0'}
                      />
                      <Text
                        className="mt-1 text-sm font-extrabold"
                        style={{ color: active ? '#0B0F14' : '#B8BBC0' }}>
                        {t === 'Booking Requests' ? 'REQUESTS' : 'HISTORY'}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-4 pt-4">
          {approvedVehicles.length > 0 ? (
            <View
              className="mb-4 overflow-hidden rounded-xl"
              style={
                {
                  // backgroundColor: 'rgba(0, 0, 0, 0.32)',
                  // borderWidth: 1,
                  // borderColor: 'rgba(255,255,255,0.06)',
                }
              }>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 10 }}>
                <Pressable
                  onPress={() => setSelectedVehicleId('ALL')}
                  className="mr-1"
                  style={{
                    borderWidth: selectedVehicleId === 'ALL' ? 2 : 0,
                    borderColor: '#C9B37A',
                    borderRadius: 10,
                    margin: 4,
                  }}>
                  <View
                    className="h-[74px] w-[96px] items-center justify-center rounded-lg"
                    style={{ backgroundColor: '#0B0F14' }}>
                    <Text
                      className={`text-xs font-extrabold ${selectedVehicleId === 'ALL' ? 'text-[#C9B37A]' : 'text-[#B8BBC0]'}`}>
                      All
                    </Text>
                  </View>
                </Pressable>

                {approvedVehicles.map((v) => {
                  const id = String(v.id);
                  const activeCar = selectedVehicleId === id;
                  const firstImg =
                    Array.isArray(v.imageUrls) && v.imageUrls.length > 0 ? v.imageUrls[0] : '';
                  const label =
                    `${v.manufacturer ?? ''} ${v.carModel ?? ''}`.trim() ||
                    v.vehicleType ||
                    v.armourLevel ||
                    'Vehicle';

                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSelectedVehicleId(id)}
                      className="mr-1"
                      style={{
                        borderWidth: activeCar ? 2 : 0,
                        borderColor: '#C9B37A',
                        borderRadius: 10,
                        margin: 4,
                      }}>
                      <View
                        className="h-[74px] w-[140px] flex-row items-center overflow-hidden rounded-lg"
                        style={{ backgroundColor: '#0B0F14' }}>
                        <View className="h-[74px] w-[74px] items-center justify-center bg-black/20">
                          {firstImg ? (
                            <Image
                              source={{ uri: firstImg }}
                              style={{ width: 74, height: 74 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <FontAwesome
                              name="car"
                              size={18}
                              color={activeCar ? '#C9B37A' : '#B8BBC0'}
                            />
                          )}
                        </View>
                        <View className="flex-1 px-2">
                          <Text
                            numberOfLines={2}
                            className={`text-[11px] font-extrabold ${activeCar ? 'text-[#C9B37A]' : 'text-gray-100'}`}>
                            {label}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-0.5 text-[12px] font-bold"
                            style={{ color: '#9CA3AF' }}>
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

          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-300">Loading…</Text>
            </View>
          ) : null}

          {emptyState ? (
            <View className="mt-10 items-center">
              <View
                className="h-14 w-14 items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <FontAwesome name="calendar" size={20} color="#9CA3AF" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No bookings</Text>
              <Text className="mt-1 text-sm font-semibold text-gray-300">
                You will see your {tab.toLowerCase()} here.
              </Text>
            </View>
          ) : null}

          {list.map((b) => (
            <BookingHistoryCard key={b.id} booking={b} variant="dispatcher" />
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
