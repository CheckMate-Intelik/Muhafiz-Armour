import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { driverPost, ensureDriverSession } from '@/lib/api';

const VEHICLE_TYPES = ['LA', 'MA', 'HA'] as const;

export default function RegisterVehicleScreen() {
  const [vehicleType, setVehicleType] = useState('LA');
  const [baseRatePerHour, setBaseRatePerHour] = useState('120');
  const [location, setLocation] = useState('Quezon City');
  const [submitting, setSubmitting] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const canSubmit =
    vehicleType.trim().length > 0 &&
    Number.isFinite(Number(baseRatePerHour)) &&
    Number(baseRatePerHour) > 0 &&
    location.trim().length > 0;

  async function submit() {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const s = await ensureDriverSession();
      await driverPost(`/driver/vehicles`, s.driverId, {
        type: vehicleType.trim(),
        baseRatePerHour: Math.round(Number(baseRatePerHour)),
        location: location.trim(),
      });
      router.back();
    } catch {
      router.replace('/login' as any);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Register vehicle</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-6">
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-sm font-extrabold text-gray-900">Armoured vehicle details</Text>
          <Text className="mt-1 text-xs font-semibold text-gray-500">
            Add your vehicle information to accept bookings.
          </Text>

          <View className="mt-4">
            <Pressable onPress={() => setTypePickerOpen(true)} className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
              <Text className="text-[10px] font-bold text-gray-400">Vehicle type</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-gray-900">{vehicleType}</Text>
                <FontAwesome name="angle-down" size={18} color="#6B7280" />
              </View>
            </Pressable>
            <Field
              label="Base rate per hour"
              value={baseRatePerHour}
              onChangeText={setBaseRatePerHour}
              placeholder="120"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <Field
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="Quezon City"
              autoCapitalize="words"
            />
          </View>

          <Pressable
            onPress={submit}
            className={`mt-4 items-center justify-center rounded-2xl py-3 ${
              canSubmit && !submitting ? 'bg-[#1D2DD9]' : 'bg-gray-200'
            }`}>
            <Text
              className={`text-xs font-extrabold ${
                canSubmit && !submitting ? 'text-white' : 'text-gray-500'
              }`}>
              {submitting ? 'Registering…' : 'Register vehicle'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={typePickerOpen} animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={() => setTypePickerOpen(false)}>
          <Pressable className="w-full max-w-[420px] rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-900">Select vehicle type</Text>
              <Pressable onPress={() => setTypePickerOpen(false)}>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
              </Pressable>
            </View>
            <View className="mt-3">
              {VEHICLE_TYPES.map((t) => {
                const active = t === vehicleType;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setVehicleType(t);
                      setTypePickerOpen(false);
                    }}
                    className="mb-2 flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <View className="flex-row items-center gap-3">
                      <View className={`h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-[#1D2DD9]' : 'bg-white'}`}>
                        <FontAwesome name="car" size={16} color={active ? '#FFFFFF' : '#111827'} />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-gray-400">Type</Text>
                        <Text className="mt-1 text-sm font-extrabold text-gray-900">{t}</Text>
                      </View>
                    </View>
                    {active ? <FontAwesome name="check" size={16} color="#16A34A" /> : <View className="h-4 w-4" />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="mt-1 text-sm font-extrabold text-gray-900"
      />
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

