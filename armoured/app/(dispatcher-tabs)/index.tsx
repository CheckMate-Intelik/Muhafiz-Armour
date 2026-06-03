import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { isNotAuthenticatedError } from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';
import { useNavigationReady } from '@/hooks/useNavigationReady';
import { useStore, dispatcherAvatarUrl } from '@/store/store';
import { useBookingsStore, type DispatcherBooking } from '@/store/bookingsStore';
import {
  ActiveBookingHeroCard,
  type ActiveBookingHeroData,
} from '../../components/ActiveBookingHeroCard';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { UserBookingCard, type UserBookingListItem } from '../../components/UserBookingCard';

const SCREEN_GRADIENT_COLORS = ['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617'] as const;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = 20;
const ACTIVE_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.85);
const ACTIVE_CARD_GAP = 12;
const ACTIVE_CARD_SIDE_INSET = Math.max(
  SCREEN_PADDING,
  Math.round((SCREEN_WIDTH - ACTIVE_CARD_WIDTH) / 2)
);

const listCardShadow = {
  backgroundColor: 'rgba(255, 255, 255, 0.13)',
  borderColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function sortByStartTime<T extends { id: string; startTime?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.startTime ?? '').getTime();
    const tb = new Date(b.startTime ?? '').getTime();
    const aOk = Number.isFinite(ta) && !Number.isNaN(ta);
    const bOk = Number.isFinite(tb) && !Number.isNaN(tb);
    if (aOk && bOk) return ta - tb;
    if (aOk) return -1;
    if (bOk) return 1;
    return String(a.id).localeCompare(String(b.id));
  });
}

function pickSoonestUpcoming(rows: DispatcherBooking[]) {
  const upcoming = rows.filter((b) => normalizeStatus(b.status) === 'CONFIRMED');
  return sortByStartTime(upcoming)[0] ?? null;
}

function pickSoonestTripRequest(rows: DispatcherBooking[]) {
  const pending = rows.filter((b) => normalizeStatus(b.status) === 'PENDING_DISPATCHER');
  return sortByStartTime(pending)[0] ?? null;
}

function openDispatcherBookingDetails(b: DispatcherBooking) {
  const customerName = b.user?.name ?? '—';
  const payout = b.totalPrice ?? 0;
  const vehicleName = `${b.vehicle?.manufacturer ?? ''} ${b.vehicle?.carModel ?? ''}`.trim();
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
      dispatcherName: '',
      customerName,
      vehicleArmour: b.vehicle?.armourLevel ?? '',
      vehicleType: b.vehicle?.vehicleType ?? '',
      vehicleName,
    },
  });
}

export default function DispatcherDashboardScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const profile = useStore((s) => s.dispatcherProfile);
  const dispatcherSession = useStore((s) => s.dispatcherSession);
  const profileLoading = useStore((s) => s.loading);
  const headerAvatarUri = dispatcherAvatarUrl(profile, 'sm');

  const dispatcherRequests = useBookingsStore((s) => s.dispatcherRequests);
  const dispatcherActive = useBookingsStore((s) => s.dispatcherActive);
  const dispatcherCompleted = useBookingsStore((s) => s.dispatcherCompleted);
  const dispatcherLoading = useBookingsStore((s) => s.dispatcherLoading);
  const dispatcherLoaded = useBookingsStore((s) => s.dispatcherLoaded);
  const refreshDispatcherBookings = useBookingsStore((s) => s.refreshDispatcherBookings);
  const navigationReady = useNavigationReady();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!navigationReady) return;
    refreshDispatcherBookings().catch((e) => {
      if (isNotAuthenticatedError(e)) redirectToLogin();
    });
  }, [refreshDispatcherBookings, navigationReady]);

  const completedTrips = dispatcherCompleted.length;
  const totalEarnings = dispatcherCompleted.reduce((sum, t) => sum + (t.totalPrice ?? 0), 0);
  const dispatcherName = (profile?.name ?? dispatcherSession?.name ?? '').trim() || 'Dispatcher';

  const activeBookings = useMemo(
    () => dispatcherActive.filter((b) => normalizeStatus(b.status) === 'IN_PROGRESS'),
    [dispatcherActive]
  );
  const upcomingBooking = useMemo(() => pickSoonestUpcoming(dispatcherActive), [dispatcherActive]);
  const tripRequestBooking = useMemo(
    () => pickSoonestTripRequest(dispatcherRequests),
    [dispatcherRequests]
  );
  const loading = dispatcherLoading && !dispatcherLoaded;

  const goToBookingRequests = () =>
    router.push({
      pathname: '/(dispatcher-tabs)/bookings' as any,
      params: { tab: 'requests' },
    });

  return (
    <LinearGradient
      colors={[...SCREEN_GRADIENT_COLORS]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="pt-4">
          <View className="flex-row items-center justify-between px-5">
            <View>
              <Text className="text-[22px] font-bold text-[#C9B37A]">Welcome!</Text>
              <Text className="text-2xl font-bold text-[#C9B37A]">
                {profileLoading && !profile?.name && !dispatcherSession?.name
                  ? '…'
                  : dispatcherName}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <NotificationBellButton />
              <Image
                source={{ uri: headerAvatarUri }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            </View>
          </View>

          <View className="mt-5 flex-row gap-3 px-5">
            <View className="flex-1 rounded-2xl">
              <View className="rounded-2xl bg-[#222222] px-4">
                <View className="h-12 flex-row items-center justify-between border-b border-[#4d4d4d]">
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
                    TOTAL EARNINGS
                  </Text>
                  <FontAwesome name="money" size={16} color="#C9B37A" />
                </View>
                <Text className="mt-4 text-lg font-bold text-gray-100">
                  Rs.{' '}
                  <Text className="text-lg font-normal text-gray-100">
                    {totalEarnings.toFixed(2)}
                  </Text>
                </Text>
                <Text className="mb-2 mt-1 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                  This period
                </Text>
              </View>
            </View>

            <View className="flex-1 rounded-2xl bg-black">
              <View className="rounded-2xl bg-[#222222] px-4">
                <View className="h-12 flex-row items-center justify-between border-b border-[#4d4d4d]">
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
                    COMPLETED
                  </Text>
                  <FontAwesome name="check" size={16} color="#C9B37A" />
                </View>
                <Text className="mt-4 text-2xl font-extrabold text-gray-100">{completedTrips}</Text>
                <Text className="mb-2 mt-1 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                  All time
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-4">
            {/* <Text
              className="px-5 text-[13px] font-extrabold"
              style={{ letterSpacing: 2, color: '#9CA3AF' }}>
              ACTIVE BOOKINGS
            </Text> */}

            {loading ? (
              <View className="mt-6 items-center">
                <Text className="text-sm font-semibold text-gray-300">Loading…</Text>
              </View>
            ) : activeBookings.length === 0 ? (
              <View className="mt-3 px-5">
                <ActiveBookingHeroCard booking={null} emptyLabel="No active booking" />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={ACTIVE_CARD_WIDTH + ACTIVE_CARD_GAP}
                snapToAlignment="start"
                contentContainerStyle={{
                  paddingHorizontal: ACTIVE_CARD_SIDE_INSET,
                  paddingTop: 12,
                }}>
                {activeBookings.map((b, i) => (
                  <View
                    key={b.id}
                    style={{
                      width: ACTIVE_CARD_WIDTH,
                      marginRight: i === activeBookings.length - 1 ? 0 : ACTIVE_CARD_GAP,
                    }}>
                    <ActiveBookingHeroCard
                      booking={b as ActiveBookingHeroData}
                      emptyLabel="No active booking"
                      onPress={(bk) =>
                        router.push({
                          pathname: '/booking-details' as any,
                          params: { id: String(bk.id), live: '1' },
                        })
                      }
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View className="mt-2 px-5">
            <UserBookingCard
              booking={upcomingBooking as UserBookingListItem | null}
              title="UPCOMING BOOKING"
              emptyLabel="No upcoming bookings"
              showDateBox
              rightActionLabel="See all"
              onRightActionPress={goToBookingRequests}
              onPress={(b) => openDispatcherBookingDetails(b as DispatcherBooking)}
            />

            <UserBookingCard
              booking={tripRequestBooking as UserBookingListItem | null}
              title="TRIP REQUEST"
              emptyLabel="No trip requests"
              showDateBox
              rightActionLabel="See all"
              onRightActionPress={goToBookingRequests}
              onPress={(b) => openDispatcherBookingDetails(b as DispatcherBooking)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
