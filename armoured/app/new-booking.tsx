import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function NewBookingScreen() {
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
            <Text className="text-lg font-bold text-gray-200">New booking</Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-6">
          <View
            className="overflow-hidden rounded-2xl"
            style={{
              backgroundColor: '#3B3E43',
              shadowColor: '#000',
              shadowOpacity: 0.22,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}>
            <View className="bg-black px-4 py-3">
              <Text className="text-[12px] font-extrabold" style={{ color: '#D8DADF', letterSpacing: 0.5 }}>
                START
              </Text>
            </View>

            <View className="px-4 py-4">
              <Text className="text-base font-extrabold text-gray-100">Create a new booking</Text>
              <Text className="mt-1 text-xs font-semibold" style={{ color: '#B8BBC0' }}>
                Set pickup, destination, date, and duration.
              </Text>

              <Pressable
                onPress={() => router.push('/trip-setup' as any)}
                className="mt-4 items-center justify-center rounded-2xl bg-[#111827] py-4">
                <Text className="text-sm font-extrabold text-gray-200">Continue</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
