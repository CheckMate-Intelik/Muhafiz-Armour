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
import { colors, gradientProps, gradients, quickActionCard } from '@/constants/theme';

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
    <LinearGradient colors={[...gradients.screen]} {...gradientProps.screen} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-semibold" style={{ color: colors.gold }}>
                Welcome!
              </Text>
              <Text className="text-lg font-semibold" style={{ color: colors.gold }}>
                {userName}
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
                style={{ letterSpacing: 2, color: colors.textSecondary }}>
                QUICK ACTIONS
              </Text>
              <View className="mt-3 flex-row gap-3">
                {/* <LinearGradient
                  colors={[...gradients.cardDark]}
                  {...gradientProps.cardVertical}
                  className="flex-1"
                  style={{ borderRadius: 10 }}> */}
                <Pressable
                  onPress={() => router.push('/new-booking' as any)}
                  className={`flex-1 items-center justify-center bg-[#222222]`}
                  style={{
                    height: quickActionCard.height,
                    borderRadius: quickActionCard.radius,
                    borderWidth: 1,
                    borderColor: quickActionCard.border,
                  }}>
                  <FontAwesome name="shield" size={32} color={colors.gold} />
                  <Text
                    className="mt-2 text-center text-sm font-semibold"
                    style={{ color: colors.gold }}>
                    New Booking
                  </Text>
                </Pressable>
                {/* </LinearGradient> */}
                {/* <LinearGradient
                  colors={[...gradients.cardDark]}
                  {...gradientProps.cardVertical}
                  className="flex-1"
                  style={{ borderRadius: 10 }}> */}
                <Pressable
                  onPress={() => void openSupport()}
                  className={`flex-1 items-center justify-center bg-[#222222]`}
                  style={{
                    height: quickActionCard.height,
                    borderRadius: quickActionCard.radius,
                    borderWidth: 1,
                    borderColor: quickActionCard.border,
                  }}>
                  <FontAwesome name="headphones" size={30} color={colors.textSupport} />
                  <Text
                    className="mt-2 text-center text-sm font-semibold"
                    style={{ color: colors.textSupport }}>
                    Support
                  </Text>
                </Pressable>
                {/* </LinearGradient> */}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
