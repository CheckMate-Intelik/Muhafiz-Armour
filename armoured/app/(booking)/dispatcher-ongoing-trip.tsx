import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DispatcherOngoingTripScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId ?? '';

  useEffect(() => {
    if (!bookingId) {
      router.replace('/(dispatcher-tabs)' as any);
      return;
    }
    router.replace({ pathname: '/booking-details' as any, params: { id: bookingId, live: '1' } });
  }, [bookingId]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm font-semibold text-gray-500">Loading…</Text>
      </View>
    </SafeAreaView>
  );
}
