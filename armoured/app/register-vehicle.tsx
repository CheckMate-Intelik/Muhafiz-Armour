import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PUBLIC_API_BASE_URL, driverPost, ensureDriverSession } from '@/lib/api';

export default function RegisterVehicleScreen() {
  const [armourLevel, setArmourLevel] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [carModel, setCarModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [generation, setGeneration] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [baseRatePerHour, setBaseRatePerHour] = useState('120');
  const [seatingCapacity, setSeatingCapacity] = useState('4');
  const [location, setLocation] = useState('Quezon City');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [armourPickerOpen, setArmourPickerOpen] = useState(false);
  const [vehicleTypePickerOpen, setVehicleTypePickerOpen] = useState(false);
  const [armourLevels, setArmourLevels] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/options`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          armourLevels?: { code: string; label: string }[];
          vehicleTypes?: { code: string; label: string }[];
        };
        if (cancelled) return;
        const nextArmours = Array.isArray(data.armourLevels) ? data.armourLevels.map((x) => x.code) : [];
        const nextVehicleTypes = Array.isArray(data.vehicleTypes) ? data.vehicleTypes.map((x) => x.code) : [];
        if (nextArmours.length > 0) {
          setArmourLevels(nextArmours);
          setArmourLevel((prev) => (nextArmours.includes(prev) ? prev : nextArmours[0]));
        }
        if (nextVehicleTypes.length > 0) {
          setVehicleTypes(nextVehicleTypes);
          setVehicleType((prev) => (nextVehicleTypes.includes(prev) ? prev : nextVehicleTypes[0]));
        }
      } catch {
        // fallback options already set
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    armourLevel.trim().length > 0 &&
    vehicleType.trim().length > 0 &&
    carModel.trim().length > 0 &&
    manufacturer.trim().length > 0 &&
    generation.trim().length > 0 &&
    Number.isFinite(Number(year)) &&
    Number(year) >= 1980 &&
    Number(year) <= 2100 &&
    color.trim().length > 0 &&
    numberPlate.trim().length > 0 &&
    registrationNumber.trim().length > 0 &&
    Number.isFinite(Number(baseRatePerHour)) &&
    Number(baseRatePerHour) > 0 &&
    Number.isFinite(Number(seatingCapacity)) &&
    Number(seatingCapacity) >= 1 &&
    Number(seatingCapacity) <= 60 &&
    location.trim().length > 0;

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (result.canceled) return;
    const picked = result.assets.map((asset) => asset.uri).filter((uri) => uri.trim().length > 0);
    if (picked.length === 0) return;
    setImageUris((prev) => Array.from(new Set([...prev, ...picked])).slice(0, 5));
  }

  function removeImage(uri: string) {
    setImageUris((prev) => prev.filter((x) => x !== uri));
  }

  async function submit() {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const s = await ensureDriverSession();
      await driverPost(`/driver/vehicles`, s.driverId, {
        armourLevel: armourLevel.trim(),
        vehicleType: vehicleType.trim(),
        carModel: carModel.trim(),
        manufacturer: manufacturer.trim(),
        generation: generation.trim(),
        year: Math.round(Number(year)),
        color: color.trim(),
        numberPlate: numberPlate.trim().toUpperCase(),
        registrationNumber: registrationNumber.trim().toUpperCase(),
        imageUrls: imageUris,
        baseRatePerHour: Math.round(Number(baseRatePerHour)),
        seatingCapacity: Math.round(Number(seatingCapacity)),
        location: location.trim(),
      });
      router.back();
    } catch (error) {
      if (error instanceof Error && error.message.trim().length > 0) {
        Alert.alert('Unable to register vehicle', error.message);
        return;
      }
      router.replace('/login' as any);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Add vehicle</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5 pt-6">
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-sm font-extrabold text-gray-900">Vehicle management details</Text>
          <Text className="mt-1 text-xs font-semibold text-gray-500">Add your vehicle information to accept bookings.</Text>

          <View className="mt-4">
            <Pressable onPress={() => setArmourPickerOpen(true)} className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
              <Text className="text-[10px] font-bold text-gray-400">Armour level</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-gray-900">{armourLevel}</Text>
                <FontAwesome name="angle-down" size={18} color="#6B7280" />
              </View>
            </Pressable>
            <Pressable onPress={() => setVehicleTypePickerOpen(true)} className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
              <Text className="text-[10px] font-bold text-gray-400">Vehicle type</Text>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-gray-900">{vehicleType}</Text>
                <FontAwesome name="angle-down" size={18} color="#6B7280" />
              </View>
            </Pressable>
            <Field label="Car model" value={carModel} onChangeText={setCarModel} placeholder="Land Cruiser" autoCapitalize="words" />
            <Field
              label="Manufacturer"
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Toyota"
              autoCapitalize="words"
            />
            <Field
              label="Generation"
              value={generation}
              onChangeText={setGeneration}
              placeholder="LC300"
              autoCapitalize="characters"
            />
            <Field label="Year" value={year} onChangeText={setYear} placeholder="2022" keyboardType="number-pad" autoCapitalize="none" />
            <Field label="Colour" value={color} onChangeText={setColor} placeholder="Black" autoCapitalize="words" />
            <Field label="Number plate" value={numberPlate} onChangeText={setNumberPlate} placeholder="ABC-1234" autoCapitalize="characters" />
            <Field
              label="Registration number"
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              placeholder="REG-100200"
              autoCapitalize="characters"
            />
            <Field
              label="Base rate per hour"
              value={baseRatePerHour}
              onChangeText={setBaseRatePerHour}
              placeholder="120"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <Field
              label="Seating capacity"
              value={seatingCapacity}
              onChangeText={setSeatingCapacity}
              placeholder="4"
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            <Field label="Location" value={location} onChangeText={setLocation} placeholder="Quezon City" autoCapitalize="words" />
            <View className="mb-3 rounded-2xl bg-gray-50 px-4 py-3">
              <Text className="text-[10px] font-bold text-gray-400">Images upload</Text>
              <Pressable onPress={pickImages} className="mt-2 flex-row items-center justify-center rounded-xl bg-white py-3">
                <FontAwesome name="image" size={14} color="#1D2DD9" />
                <Text className="ml-2 text-xs font-extrabold text-[#1D2DD9]">Choose images</Text>
              </Pressable>
              {imageUris.length > 0 ? (
                <ScrollView horizontal className="mt-3">
                  {imageUris.map((uri) => (
                    <View key={uri} className="mr-2">
                      <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
                      <Pressable
                        onPress={() => removeImage(uri)}
                        className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-black/70">
                        <FontAwesome name="close" size={10} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text className="mt-2 text-[10px] font-semibold text-gray-500">Optional, up to 5 photos.</Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={submit}
            className={`mt-4 items-center justify-center rounded-2xl py-3 ${
              canSubmit && !submitting ? 'bg-[#1D2DD9]' : 'bg-gray-200'
            }`}>
            <Text className={`text-xs font-extrabold ${canSubmit && !submitting ? 'text-white' : 'text-gray-500'}`}>
              {submitting ? 'Saving...' : 'Add vehicle'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={armourPickerOpen} animationType="fade" onRequestClose={() => setArmourPickerOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={() => setArmourPickerOpen(false)}>
          <Pressable className="w-full max-w-[420px] rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-900">Select armour level</Text>
              <Pressable onPress={() => setArmourPickerOpen(false)}>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
              </Pressable>
            </View>
            <View className="mt-3">
              {armourLevels.map((t) => {
                const active = t === armourLevel;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setArmourLevel(t);
                      setArmourPickerOpen(false);
                    }}
                    className="mb-2 flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                    <View className="flex-row items-center gap-3">
                      <View className={`h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-[#1D2DD9]' : 'bg-white'}`}>
                        <FontAwesome name="car" size={16} color={active ? '#FFFFFF' : '#111827'} />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-gray-400">Level</Text>
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
      <Modal transparent visible={vehicleTypePickerOpen} animationType="fade" onRequestClose={() => setVehicleTypePickerOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-5" onPress={() => setVehicleTypePickerOpen(false)}>
          <Pressable className="w-full max-w-[420px] rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-900">Select vehicle type</Text>
              <Pressable onPress={() => setVehicleTypePickerOpen(false)}>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
              </Pressable>
            </View>
            <View className="mt-3">
              {vehicleTypes.map((t) => {
                const active = t === vehicleType;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setVehicleType(t);
                      setVehicleTypePickerOpen(false);
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
