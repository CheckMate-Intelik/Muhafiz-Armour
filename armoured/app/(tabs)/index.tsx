import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, AppState, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { isNotAuthenticatedError } from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';
import { useNavigationReady } from '@/hooks/useNavigationReady';
import { useBookingsStore, type UserBooking } from '@/store/bookingsStore';
import { useStore, userAvatarUrl } from '@/store/store';
import { UserBookingCard, type UserBookingListItem } from '../../components/UserBookingCard';
import { ActiveBookingHeroCard } from '../../components/ActiveBookingHeroCard';
import { NotificationBellButton } from '@/components/NotificationBellButton';

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function isUpcomingStatus(status: string | null | undefined) {
  const s = normalizeStatus(status);
  return s === 'PENDING_DISPATCHER' || s === 'CONFIRMED';
}

function pickSoonestUpcoming(rows: UserBookingListItem[]) {
  const upcoming = rows.filter((b) => isUpcomingStatus(b.status));
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

const QUICK_ACTION_CARD = {
  radius: 14,
  bg: '#0B0F14',
  border: '#C9B37A',
  height: 100,
} as const;

const NEW_BOOKING_GOLD = '#D4AF37';
const SUPPORT_MUTED = '#E0E0E0';

async function openSupport() {
  const mail = 'mailto:support@muhafizarmour.com?subject=Support%20request';
  try {
    await Linking.openURL(mail);
  } catch {
    Alert.alert('Support', 'Email us at support@muhafizarmour.com');
  }
}

export default function Home() {
  const hydrate = useStore((s) => s.hydrate);
  const profile = useStore((s) => s.profile);
  const session = useStore((s) => s.session);
  const userBookings = useBookingsStore((s) => s.userBookings);
  const refreshUserBookings = useBookingsStore((s) => s.refreshUserBookings);
  const navigationReady = useNavigationReady();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const userName = useMemo(() => {
    const fromProfile = (profile?.name ?? '').trim();
    if (fromProfile.length > 0) return fromProfile;
    const fromSession = (session?.name ?? '').trim();
    if (fromSession.length > 0 && fromSession.toLowerCase() !== 'user') return fromSession;
    return 'User';
  }, [profile?.name, session?.name]);

  const headerAvatarUri = userAvatarUrl(profile, 'sm');

  useEffect(() => {
    if (!navigationReady) return;
    let sub: any = null;
    void refreshUserBookings().catch((e) => {
      if (isNotAuthenticatedError(e)) redirectToLogin();
    });
    sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshUserBookings().catch(() => null);
    });
    return () => {
      if (sub) sub.remove();
    };
  }, [refreshUserBookings, navigationReady]);

  const activeBooking = useMemo<UserBookingListItem | null>(
    () =>
      (userBookings.find((x) => normalizeStatus(x?.status) === 'IN_PROGRESS') as
        | UserBookingListItem
        | undefined) ?? null,
    [userBookings]
  );
  const upcomingBooking = useMemo<UserBookingListItem | null>(
    () => pickSoonestUpcoming(userBookings as UserBookingListItem[]),
    [userBookings]
  );

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[22px] font-semibold text-[#C9B37A]">Welcome!</Text>
              <Text className="text-2xl font-semibold text-[#C9B37A]">{userName}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <NotificationBellButton />
              <Image
                source={{ uri: headerAvatarUri }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            </View>
          </View>

          <View className="mt-4">
            <ActiveBookingHeroCard
              booking={activeBooking}
              emptyLabel="No active booking"
              onPress={(b) =>
                router.push({
                  pathname: '/booking-details' as any,
                  params: { id: String(b.id), live: '1' },
                })
              }
            />

            <UserBookingCard
              booking={upcomingBooking}
              title="UPCOMING BOOKING"
              emptyLabel="No upcoming bookings"
              showDateBox
              rightActionLabel="View all"
              onRightActionPress={() =>
                router.push({ pathname: '/(tabs)/activities' as any, params: { tab: 'upcoming' } })
              }
              onPress={(b: UserBookingListItem) => {
                const row = b as UserBooking;
                const v = row.vehicle;
                const vehicleName =
                  [v?.manufacturer, v?.carModel].filter(Boolean).join(' ').trim() ||
                  [v?.vehicleType, v?.armourLevel].filter(Boolean).join(' · ') ||
                  '';
                router.push({
                  pathname: '/booking-details' as any,
                  params: {
                    id: String(b.id),
                    pickupLocation: b.pickupLocation ?? '',
                    dropLocation: b.dropLocation ?? '',
                    status: b.status ?? '',
                    startTime: b.startTime ?? '',
                    endTime: b.endTime ?? '',
                    totalPrice: b.totalPrice == null ? '' : String(b.totalPrice),
                    dispatcherName: row.dispatcher?.name ?? '',
                    vehicleArmour: v?.armourLevel ?? '',
                    vehicleType: v?.vehicleType ?? '',
                    vehicleName,
                  },
                });
              }}
            />

            <View className="mt-5">
              <Text
                className="text-[13px] font-extrabold"
                style={{ letterSpacing: 2, color: '#9CA3AF' }}>
                QUICK ACTIONS
              </Text>
              <View className="mt-3 flex-row gap-3">
                <LinearGradient
                  colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="flex-1"
                  style={{ borderRadius: 10 }}>
                  <Pressable
                    onPress={() => router.push('/new-booking' as any)}
                    className="flex-1 items-center justify-center"
                    style={{
                      height: QUICK_ACTION_CARD.height,
                      borderRadius: QUICK_ACTION_CARD.radius,
                      // backgroundColor: QUICK_ACTION_CARD.bg,
                      borderWidth: 1,
                      borderColor: QUICK_ACTION_CARD.border,
                    }}>
                    <FontAwesome name="shield" size={32} color={NEW_BOOKING_GOLD} />
                    <Text
                      className="mt-2 text-center text-sm font-semibold"
                      style={{ color: NEW_BOOKING_GOLD }}>
                      New Booking
                    </Text>
                  </Pressable>
                </LinearGradient>
                <LinearGradient
                  colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="flex-1"
                  style={{ borderRadius: 10 }}>
                  <Pressable
                    onPress={() => void openSupport()}
                    className="flex-1 items-center justify-center"
                    style={{
                      height: QUICK_ACTION_CARD.height,
                      borderRadius: QUICK_ACTION_CARD.radius,
                      // backgroundColor: QUICK_ACTION_CARD.bg,
                      borderWidth: 1,
                      borderColor: QUICK_ACTION_CARD.border,
                    }}>
                    <FontAwesome name="headphones" size={30} color={SUPPORT_MUTED} />
                    <Text
                      className="mt-2 text-center text-sm font-semibold"
                      style={{ color: SUPPORT_MUTED }}>
                      Support
                    </Text>
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
