import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TripSchedulePanel } from '@/components/TripSchedulePanel';
import { useTripDraftStore } from '@/store/tripDraft';

export default function TripScheduleScreen() {
  const draft = useTripDraftStore();

  const ready =
    draft.pickupLat != null &&
    draft.pickupLng != null &&
    draft.dropLat != null &&
    draft.dropLng != null &&
    draft.pickupCity.trim().length > 0 &&
    draft.dropCity.trim().length > 0;

  useEffect(() => {
    if (!ready) {
      router.replace('/(tabs)' as any);
    }
  }, [ready]);

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">When & how long</Text>
          <View className="h-10 w-10" />
        </View>
      </View>
      <View className="flex-1 px-5 pt-2">
        <TripSchedulePanel />
      </View>
    </SafeAreaView>
  );
}
