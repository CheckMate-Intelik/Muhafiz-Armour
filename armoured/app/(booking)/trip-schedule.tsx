import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TripSchedulePanel } from '@/components/TripSchedulePanel';
import { BackButton } from '@/components/BackButton';
import { useTripDraftStore } from '@/store/tripDraft';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientProps, gradients } from '@/constants/theme';

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
        colors={[...gradients.screen]}
        {...gradientProps.screen}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[...gradients.screen]}
      {...gradientProps.screen}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <BackButton />
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
