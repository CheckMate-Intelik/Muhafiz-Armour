import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { apiGet, ensureUserSession, isNotAuthenticatedError } from '@/lib/api';
import { UserBookingCard, type UserBookingListItem } from '../components/UserBookingCard';

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function isUpcomingStatus(status: string | null | undefined) {
  const s = normalizeStatus(status);
  return s === 'REQUESTED' || s === 'PENDING_DRIVER' || s === 'CONFIRMED';
}

function sortByStartTime(a: UserBookingListItem, b: UserBookingListItem) {
  const ta = new Date(a.startTime ?? '').getTime();
  const tb = new Date(b.startTime ?? '').getTime();
  const aOk = Number.isFinite(ta) && !Number.isNaN(ta);
  const bOk = Number.isFinite(tb) && !Number.isNaN(tb);
  if (aOk && bOk) return ta - tb;
  if (aOk) return -1;
  if (bOk) return 1;
  return String(a.id).localeCompare(String(b.id));
}

export default function UpcomingBookingsScreen() {
  const [rows, setRows] = useState<UserBookingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await ensureUserSession();
        const data = await apiGet<UserBookingListItem[]>(`/bookings`, s.userId);
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
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

  const upcoming = useMemo(() => {
    return rows.filter((b) => isUpcomingStatus(b.status)).sort(sortByStartTime);
  }, [rows]);

  return (
    <LinearGradient
      colors={['rgb(51, 47, 56)', 'rgb(88, 88, 90)', 'rgb(112, 112, 112)', 'rgb(202, 202, 202)', 'rgb(247, 248, 255)']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.4, 0.7, 0.9, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
              <FontAwesome name="arrow-left" size={16} color="#111827" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-200">Upcoming bookings</Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
          {loading ? (
            <View className="mt-10 items-center">
              <Text className="text-sm font-semibold text-gray-200">Loading…</Text>
            </View>
          ) : null}

          {!loading && upcoming.length === 0 ? (
            <View className="mt-10 items-center">
              <View className="h-14 w-14 items-center justify-center rounded-3xl bg-gray-100">
                <FontAwesome name="calendar" size={20} color="#111827" />
              </View>
              <Text className="mt-4 text-lg font-extrabold text-gray-200">No upcoming bookings</Text>
              <Text className="mt-1 text-sm font-semibold text-gray-200">Your scheduled bookings will appear here.</Text>
            </View>
          ) : null}

          {upcoming.map((b) => (
            <UserBookingCard
              key={String(b.id)}
              booking={b}
              title="UPCOMING"
              emptyLabel="No upcoming bookings"
              showDateBox
              onPress={(row) =>
                router.push({
                  pathname: '/booking-details' as any,
                  params: { id: String(row.id) },
                })
              }
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

