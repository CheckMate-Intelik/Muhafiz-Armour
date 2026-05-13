import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AppState,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { apiGet, ensureUserSession, isNotAuthenticatedError } from '@/lib/api';
import { UserBookingCard, type UserBookingListItem } from '../../components/UserBookingCard';
import { ActiveBookingHeroCard } from '../../components/ActiveBookingHeroCard';

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function isUpcomingStatus(status: string | null | undefined) {
  const s = normalizeStatus(status);
  return s === 'REQUESTED' || s === 'PENDING_DRIVER' || s === 'CONFIRMED';
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

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [activeBooking, setActiveBooking] = useState<UserBookingListItem | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<UserBookingListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const s = await ensureUserSession();
        if (cancelled) return;
        setUserId(s.userId);
        const sessionName = (s.name ?? '').trim();
        if (sessionName.length > 0 && sessionName.toLowerCase() !== 'user') {
          setUserName(sessionName);
          return;
        }
        const me = await apiGet<{ name?: string }>(`/users/me`, s.userId);
        if (cancelled) return;
        const profileName = (me?.name ?? '').trim();
        if (profileName.length > 0) setUserName(profileName);
      } catch (e) {
        if (isNotAuthenticatedError(e)) {
          router.replace('/login' as any);
        }
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let sub: any = null;
    async function loadBookings() {
      if (!userId) return;
      try {
        const rows = await apiGet<UserBookingListItem[]>(`/bookings`, userId);
        const list = Array.isArray(rows) ? rows : [];
        const active = list.find((x) => normalizeStatus(x?.status) === 'IN_PROGRESS') ?? null;
        if (cancelled) return;
        setActiveBooking(active);
        setUpcomingBooking(pickSoonestUpcoming(list));
      } catch {
        // ignore
      }
    }
    void (async () => {
      await loadBookings();
      sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void loadBookings();
      });
    })();
    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [userId]);

  return (
    <LinearGradient
      colors={['rgb(51, 47, 56)','rgb(88, 88, 90)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[18px] font-semibold text-gray-200">Welcome!</Text>
              <Text className="text-lg font-semibold text-gray-200">{userName || 'User'}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white">
                <FontAwesome name="bell-o" size={16} color="#111827" />
              </Pressable>
              <Image source={{ uri: 'https://i.pravatar.cc/96?img=12' }} style={{ width: 36, height: 36, borderRadius: 18 }} />
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
              onRightActionPress={() => router.push('/upcoming-bookings' as any)}
              onPress={(b: UserBookingListItem) =>
                router.push({
                  pathname: '/booking-details' as any,
                  params: { id: String(b.id) },
                })
              }
            />

            <Pressable
              onPress={() => router.push('/new-booking' as any)}
              className="mb-2 items-center justify-center rounded-2xl bg-[#111827] py-4">
              <Text className="text-sm font-extrabold text-gray-200">New booking</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
