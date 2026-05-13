import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { isNotAuthenticatedError } from '@/lib/api';
import { useStore } from '@/store/store';
import { useBookingsStore, type DriverBooking } from '@/store/bookingsStore';
import {
  ActiveBookingHeroCard,
  type ActiveBookingHeroData,
} from '../../components/ActiveBookingHeroCard';
import { UserBookingCard, type UserBookingListItem } from '../../components/UserBookingCard';

const SCREEN_GRADIENT_COLORS = [
  'rgb(31, 68, 149)',
  'rgb(24, 49, 97)',
  '#020617',
] as const;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = 20;
const ACTIVE_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.85);
const ACTIVE_CARD_GAP = 12;
const ACTIVE_CARD_SIDE_INSET = Math.max(
  SCREEN_PADDING,
  Math.round((SCREEN_WIDTH - ACTIVE_CARD_WIDTH) / 2),
);

const listCardShadow = {
  backgroundColor: '#0B0F14',
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

function pickSoonestUpcoming(rows: DriverBooking[]) {
  const upcoming = rows.filter((b) => normalizeStatus(b.status) === 'CONFIRMED');
  if (upcoming.length === 0) return null;
  const sorted = [...upcoming].sort((a, b) => {
    const ta = new Date(a.startTime ?? '').getTime();
    const tb = new Date(b.startTime ?? '').getTime();
    const aOk = Number.isFinite(ta) && !Number.isNaN(ta);
    const bOk = Number.isFinite(tb) && !Number.isNaN(tb);
    if (aOk && bOk) return ta - tb;
    if (aOk) return -1;
    if (bOk) return 1;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted[0] ?? null;
}

export default function DriverDashboardScreen() {
  const hydrate = useStore((s) => s.hydrate);
  const profile = useStore((s) => s.driverProfile);
  const profileLoading = useStore((s) => s.loading);

  const driverActive = useBookingsStore((s) => s.driverActive);
  const driverCompleted = useBookingsStore((s) => s.driverCompleted);
  const driverLoading = useBookingsStore((s) => s.driverLoading);
  const driverLoaded = useBookingsStore((s) => s.driverLoaded);
  const refreshDriverBookings = useBookingsStore((s) => s.refreshDriverBookings);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    refreshDriverBookings().catch((e) => {
      if (isNotAuthenticatedError(e)) router.replace('/login' as any);
    });
  }, [refreshDriverBookings]);

  const completedTrips = driverCompleted.length;
  const totalEarnings = driverCompleted.reduce((sum, t) => sum + (t.totalPrice ?? 0), 0);
  const driverName = (profile?.name ?? '').trim() || 'Driver';

  const activeBookings = useMemo(
    () => driverActive.filter((b) => normalizeStatus(b.status) === 'IN_PROGRESS'),
    [driverActive],
  );
  const upcomingBooking = useMemo(() => pickSoonestUpcoming(driverActive), [driverActive]);
  const loading = driverLoading && !driverLoaded;

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
              <Text className="text-[22px] font-semibold text-gray-200">Welcome!</Text>
              <Text className="text-2xl font-semibold text-gray-200">
                {profileLoading && !profile?.name ? '…' : driverName}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <FontAwesome name="bell-o" size={16} color="#111827" />
              </Pressable>
              <Image
                source={{ uri: 'https://i.pravatar.cc/96?img=32' }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            </View>
          </View>

          <View className="mt-5 flex-row gap-3 px-5">
            <View className="flex-1 overflow-hidden rounded-2xl" style={listCardShadow}>
              <View className="bg-black px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
                    TOTAL EARNINGS
                  </Text>
                  <View
                    className="h-9 w-9 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'rgba(201,179,122,0.12)' }}>
                    <FontAwesome name="money" size={16} color="#C9B37A" />
                  </View>
                </View>
              </View>
              <View className="px-4 py-4">
                <Text className="text-2xl font-bold text-gray-100">Rs {totalEarnings.toFixed(2)}</Text>
                <Text className="mt-1 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                  This period
                </Text>
              </View>
            </View>

            <View className="flex-1 overflow-hidden rounded-2xl" style={listCardShadow}>
              <View className="bg-black px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#C9B37A', letterSpacing: 0.5 }}>
                    COMPLETED
                  </Text>
                  <View
                    className="h-9 w-9 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'rgba(201,179,122,0.12)' }}>
                    <FontAwesome name="check" size={16} color="#C9B37A" />
                  </View>
                </View>
              </View>
              <View className="px-4 py-4">
                <Text className="text-2xl font-extrabold text-gray-100">{completedTrips}</Text>
                <Text className="mt-1 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                  All time
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-6">
            <Text
              className="px-5 text-[13px] font-extrabold"
              style={{ letterSpacing: 2, color: '#9CA3AF' }}>
              ACTIVE BOOKINGS
            </Text>

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
                contentContainerStyle={{ paddingHorizontal: ACTIVE_CARD_SIDE_INSET, paddingTop: 12 }}>
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
              onRightActionPress={() =>
                router.push({
                  pathname: '/(driver-tabs)/bookings' as any,
                  params: { tab: 'requests' },
                })
              }
              onPress={(b) =>
                router.push({
                  pathname: '/booking-details' as any,
                  params: { id: String(b.id) },
                })
              }
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
