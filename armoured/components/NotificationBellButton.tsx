import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSessionNotificationsStore } from '@/store/sessionNotificationsStore';

export function NotificationBellButton() {
  const count = useSessionNotificationsStore((s) => s.items.length);

  return (
    <Pressable
      onPress={() => router.push('/notifications' as any)}
      className="h-11 w-11 items-center justify-center rounded-full bg-[#2F3135]">
      <FontAwesome name={count > 0 ? 'bell' : 'bell-o'} size={18} color="#C9B37A" />
      {count > 0 ? (
        <View
          className="absolute -right-0.5 -top-0.5 min-h-[16px] min-w-[16px] items-center justify-center rounded-full px-1"
          style={{ backgroundColor: '#C9B37A' }}>
          <Text className="text-[10px] font-bold text-[#111827]">{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
