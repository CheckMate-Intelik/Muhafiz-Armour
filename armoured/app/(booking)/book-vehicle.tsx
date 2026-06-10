import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BackButton } from '@/components/BackButton';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookVehicleScreen() {
  const params = useLocalSearchParams<{
    vehicleId?: string;
    from?: string;
    to?: string;
    fromLat?: string;
    fromLng?: string;
    toLat?: string;
    toLng?: string;
  }>();
  const vehicleId = params.vehicleId ?? '';

  const initialFrom = useMemo(() => (params.from ?? '').trim(), [params.from]);
  const initialTo = useMemo(() => (params.to ?? '').trim(), [params.to]);

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  useEffect(() => {
    setFrom(initialFrom);
  }, [initialFrom]);
  useEffect(() => {
    setTo(initialTo);
  }, [initialTo]);

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

  function openPicker(mode: 'pickup' | 'drop') {
    if (!vehicleId) return;
    router.push({
      pathname: '/pick-location' as any,
      params: {
        mode,
        vehicleId,
        from: from.trim(),
        to: to.trim(),
        fromLat: params.fromLat,
        fromLng: params.fromLng,
        toLat: params.toLat,
        toLng: params.toLng,
      },
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <BackButton variant="light" />
          <Text className="text-base font-extrabold text-gray-900">Booking details</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4">
        <SelectField label="Pick up location" value={from} placeholder="Search pickup location" onPress={() => openPicker('pickup')} />
        <SelectField label="Destination location" value={to} placeholder="Search drop location" onPress={() => openPicker('drop')} />

        <Pressable onPress={next} className="mt-5 items-center rounded-2xl py-3 bg-[#111827]">
          <Text className="text-xs font-extrabold text-white">Next</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mt-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <Text className={`mt-1 text-sm font-extrabold ${value ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={2}>
        {value || placeholder}
      </Text>
    </Pressable>
  );
}
