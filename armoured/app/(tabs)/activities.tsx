import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BookingHistoryCard } from '@/components/BookingHistoryCard';
import { SubTabSelector } from '@/components/SubTabSelector';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { isNotAuthenticatedError } from '@/lib/api';
import { redirectToLogin } from '@/lib/safeRouter';
import { useNavigationReady } from '@/hooks/useNavigationReady';
import { useBookingsStore } from '@/store/bookingsStore';
import { NotificationBellButton } from '@/components/NotificationBellButton';
import { useStore, userAvatarUrl } from '@/store/store';
import DropdownSelector from '@/components/DropdownSelector';
import { colors, gradientProps, gradients } from '@/constants/theme';

type RideStatus = 'Upcoming' | 'Completed' | 'Canceled';

function parseActivitiesTab(tab?: string): RideStatus {
  const t = (tab ?? '').trim().toLowerCase();
  if (t === 'completed') return 'Completed';
  if (t === 'canceled' || t === 'cancelled') return 'Canceled';
  if (t === 'upcoming' || t === 'schedule' || t === 'scheduled') return 'Upcoming';
  return 'Upcoming';
}

type Booking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  status: string;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  totalPrice: number | null;
  dispatcher?: { name: string } | null;
  vehicle?: {
    armourLevel: string;
    vehicleType: string;
    manufacturer?: string | null;
    carModel?: string | null;
  } | null;
};

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

export default function ActivitiesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const hydrate = useStore((s) => s.hydrate);
  const profile = useStore((s) => s.profile);
  const headerAvatarUri = userAvatarUrl(profile, 'sm');
  const [status, setStatus] = useState<RideStatus>(() => parseActivitiesTab(params.tab));

  useEffect(() => {
    setStatus(parseActivitiesTab(params.tab));
  }, [params.tab]);
  const userBookings = useBookingsStore((s) => s.userBookings);
  const userLoading = useBookingsStore((s) => s.userLoading);
  const userLoaded = useBookingsStore((s) => s.userLoaded);
  const refreshUserBookings = useBookingsStore((s) => s.refreshUserBookings);
  const bookings = userBookings as unknown as Booking[];
  const loading = userLoading && !userLoaded;
  const navigationReady = useNavigationReady();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!navigationReady) return;
    refreshUserBookings().catch((e) => {
      if (isNotAuthenticatedError(e)) redirectToLogin();
    });
  }, [refreshUserBookings, navigationReady]);

  const hasPendingDispatcher = useMemo(
    () => bookings.some((b) => normalizeStatus(b.status) === 'PENDING_DISPATCHER'),
    [bookings]
  );

  useEffect(() => {
    if (status !== 'Upcoming' || !hasPendingDispatcher) return;
    const id = setInterval(() => {
      refreshUserBookings().catch(() => null);
    }, 30_000);
    return () => clearInterval(id);
  }, [status, hasPendingDispatcher, refreshUserBookings]);

  const rides = useMemo(() => {
    switch (status) {
      case 'Completed':
        return bookings.filter((b) => normalizeStatus(b.status) === 'COMPLETED');
      case 'Canceled':
        return bookings.filter((b) => {
          const s = normalizeStatus(b.status);
          return s === 'REJECTED' || s === 'EXPIRED';
        });
      case 'Upcoming':
      default:
        return bookings.filter((b) => {
          const s = normalizeStatus(b.status);
          return s === 'PENDING_DISPATCHER' || s === 'CONFIRMED' || s === 'IN_PROGRESS';
        });
    }
  }, [bookings, status]);

  return (
    <LinearGradient
      colors={[...gradients.screen]}
      {...gradientProps.screen}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              {/* <Text className="text-[18px] font-semibold text-[#C9B37A]">History</Text> */}
              <Text className="text-lg font-semibold" style={{ color: colors.gold }}>
                Bookings
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

          {/* <SubTabSelector
            tabs={[
              { key: 'Upcoming', label: 'UPCOMING', icon: 'calendar' },
              { key: 'Completed', label: 'COMPLETED', icon: 'check' },
              { key: 'Canceled', label: 'CANCELED', icon: 'times' },
            ]}
            activeKey={status}
            onChange={(key) => setStatus(key as RideStatus)}
          /> */}
          <View className="mt-4">
            <DropdownSelector
              tabs={[
                { key: 'Upcoming', label: 'Upcoming', icon: 'calendar' },
                { key: 'Completed', label: 'Completed', icon: 'check' },
                { key: 'Canceled', label: 'Canceled', icon: 'times' },
              ]}
              activeKey={status}
              onChange={(key) => setStatus(key as RideStatus)}
            />
          </View>

          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-300">Loading…</Text>
            </View>
          ) : null}

          {!loading && rides.length === 0 ? (
            <View className="mt-10 items-center">
              <View
                className="h-14 w-14 items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <FontAwesome name="calendar" size={20} color={colors.textSecondary} />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No history</Text>
              <Text className="mt-1 text-center text-sm font-semibold text-gray-300">
                Your bookings will appear here.
              </Text>
            </View>
          ) : null}

          <View className="mt-4">
            {rides.map((r) => (
              <BookingHistoryCard key={r.id} booking={r} variant="user" />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
