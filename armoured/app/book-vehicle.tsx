import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookVehicleScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = params.vehicleId ?? '';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  function next() {
    if (!vehicleId) return;
    if (!from.trim() || !to.trim()) {
      Alert.alert('Missing details', 'Please add pickup and destination.');
      return;
    }
    router.push({
      pathname: '/book-vehicle-schedule' as any,
      params: { vehicleId, from: from.trim(), to: to.trim() },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Booking details</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4">
        <Field label="Pick up location" value={from} onChangeText={setFrom} placeholder="Enter pickup location" />
        <Field label="Destination location" value={to} onChangeText={setTo} placeholder="Enter drop location" />

        <Pressable onPress={next} className="mt-5 items-center rounded-2xl py-3 bg-[#111827]">
          <Text className="text-xs font-extrabold text-white">Next</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View className="mt-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="mt-1 text-sm font-extrabold text-gray-900"
      />
    </View>
  );
}
