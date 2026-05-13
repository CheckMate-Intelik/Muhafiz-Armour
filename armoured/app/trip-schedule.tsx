import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TripSchedulePanel } from '@/components/TripSchedulePanel';
import { useTripDraftStore } from '@/store/tripDraft';
import { LinearGradient } from 'expo-linear-gradient';

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
      router.replace('/trip-setup' as any);
    }
  }, [ready]);

  if (!ready) {
    return (
      <LinearGradient
        colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <FontAwesome name="arrow-left" size={16} color="#9CA3AF" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-200">When & how long</Text>
            <View className="h-10 w-10" />
          </View>
        </View>
        <View className="flex-1 px-5 pt-2">
          <TripSchedulePanel />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
