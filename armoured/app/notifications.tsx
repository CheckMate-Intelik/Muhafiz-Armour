import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import type { NotificationNavData } from '@/lib/notifications';
import { useSessionNotificationsStore, type SessionNotification } from '@/store/sessionNotificationsStore';
import { safePush } from '@/lib/safeRouter';

function formatReceivedAt(ms: number) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function openNotification(data: NotificationNavData) {
  const { bookingId, status, role } = data;
  if (!bookingId) return;
  if (status === 'IN_PROGRESS' && role === 'DISPATCHER') {
    safePush('/dispatcher-ongoing-trip');
    return;
  }
  if (status === 'IN_PROGRESS' && role === 'USER') {
    safePush('/ongoing-trip');
    return;
  }
  safePush({ pathname: '/booking-details', params: { id: bookingId } });
}

function NotificationRow({ item }: { item: SessionNotification }) {
  const hasBooking = Boolean(item.bookingId);

  return (
    <Pressable
      onPress={() =>
        openNotification({
          bookingId: item.bookingId,
          status: item.status,
          role: item.role,
        })
      }
      disabled={!hasBooking}
      className="mb-3 rounded-2xl p-4"
      style={{
        backgroundColor: '#0B0F14',
        borderWidth: 1,
        borderColor: 'rgba(201, 179, 122, 0.25)',
      }}>
      <View className="flex-row items-start gap-3">
        <View
          className="mt-0.5 h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(201, 179, 122, 0.15)' }}>
          <FontAwesome name="bell" size={14} color="#C9B37A" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-[#C9B37A]">{item.title}</Text>
          {item.body.length > 0 ? (
            <Text className="mt-1 text-xs font-semibold leading-5" style={{ color: '#9CA3AF' }}>
              {item.body}
            </Text>
          ) : null}
          <Text className="mt-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
            {formatReceivedAt(item.receivedAt)}
          </Text>
        </View>
        {hasBooking ? <FontAwesome name="chevron-right" size={12} color="#6B7280" /> : null}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const items = useSessionNotificationsStore((s) => s.items);

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-4">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <FontAwesome name="arrow-left" size={16} color="#9CA3AF" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-200">Notifications</Text>
          <View className="h-10 w-10" />
        </View>

        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <FontAwesome name="bell-o" size={28} color="#6B7280" />
            </View>
            <Text className="mt-4 text-center text-sm font-extrabold text-[#C9B37A]">No recent notifications</Text>
            <Text className="mt-2 text-center text-xs font-semibold leading-5" style={{ color: '#9CA3AF' }}>
              Alerts you receive while this app is open will appear here for the current session.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
            renderItem={({ item }) => <NotificationRow item={item} />}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}
