import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { PUBLIC_API_BASE_URL, dispatcherPost, dispatcherUploadVehicleImage, ensureDispatcherSession } from '@/lib/api';

const GOLD = '#C9B37A';
const CARD = '#0B0F14';
const STEPS = 3;

export default function RegisterVehicleScreen() {
  const [step, setStep] = useState(0);
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
  const [extensionRatePerHour, setExtensionRatePerHour] = useState('120');
  const [seatingCapacity, setSeatingCapacity] = useState('4');
  const [location, setLocation] = useState('Quezon City');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [armourPickerOpen, setArmourPickerOpen] = useState(false);
  const [vehicleTypePickerOpen, setVehicleTypePickerOpen] = useState(false);
  const [armourLevels, setArmourLevels] = useState<{ code: string; label: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ code: string; label: string }[]>([]);

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
        const nextArmours = Array.isArray(data.armourLevels) ? data.armourLevels : [];
        const nextVehicleTypes = Array.isArray(data.vehicleTypes) ? data.vehicleTypes : [];
        if (nextArmours.length > 0) {
          setArmourLevels(nextArmours);
          setArmourLevel((prev) => {
            const codes = nextArmours.map((x) => x.code);
            return codes.includes(prev) ? prev : nextArmours[0].code;
          });
        }
        if (nextVehicleTypes.length > 0) {
          setVehicleTypes(nextVehicleTypes);
          setVehicleType((prev) => {
            const codes = nextVehicleTypes.map((x) => x.code);
            return codes.includes(prev) ? prev : nextVehicleTypes[0].code;
          });
        }
      } catch {
        // ignore
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const stepMeta = useMemo(
    () => [
      { title: 'Vehicle', subtitle: 'Class, type, and model' },
      { title: 'Registration', subtitle: 'Plates, capacity, and area' },
      { title: 'Photos & rate', subtitle: 'Images and hourly pricing' },
    ],
    [],
  );

  const canStep0 =
    armourLevel.trim().length > 0 &&
    vehicleType.trim().length > 0 &&
    carModel.trim().length > 0 &&
    manufacturer.trim().length > 0 &&
    generation.trim().length > 0 &&
    Number.isFinite(Number(year)) &&
    Number(year) >= 1980 &&
    Number(year) <= 2100 &&
    color.trim().length > 0;

  const canStep1 =
    numberPlate.trim().length > 0 &&
    registrationNumber.trim().length > 0 &&
    Number.isFinite(Number(seatingCapacity)) &&
    Number(seatingCapacity) >= 1 &&
    Number(seatingCapacity) <= 60 &&
    location.trim().length > 0;

  const canStep2 =
    Number.isFinite(Number(baseRatePerHour)) &&
    Number(baseRatePerHour) > 0 &&
    Number.isFinite(Number(extensionRatePerHour)) &&
    Number(extensionRatePerHour) > 0;

  const canSubmit = canStep0 && canStep1 && canStep2;

  function validateCurrentStep(): boolean {
    if (step === 0 && !canStep0) {
      Alert.alert('Incomplete', 'Fill in armour level, vehicle type, model, year, and colour.');
      return false;
    }
    if (step === 1 && !canStep1) {
      Alert.alert('Incomplete', 'Fill in number plate, registration, seating capacity, and location.');
      return false;
    }
    if (step === 2 && !canStep2) {
      Alert.alert('Incomplete', 'Enter valid base and extension rates per hour.');
      return false;
    }
    return true;
  }

  function goBack() {
    if (step === 0) router.back();
    else setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    if (step < STEPS - 1) setStep((s) => s + 1);
    else void submit();
  }

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
    if (!validateCurrentStep()) return;
    try {
      setSubmitting(true);
      const s = await ensureDispatcherSession();
      const imageUrls =
        imageUris.length > 0
          ? await Promise.all(imageUris.map((uri) => dispatcherUploadVehicleImage(s.dispatcherId, uri).then((r) => r.url)))
          : [];
      await dispatcherPost(`/dispatcher/vehicles`, s.dispatcherId, {
        armourLevel: armourLevel.trim(),
        vehicleType: vehicleType.trim(),
        carModel: carModel.trim(),
        manufacturer: manufacturer.trim(),
        generation: generation.trim(),
        year: Math.round(Number(year)),
        color: color.trim(),
        numberPlate: numberPlate.trim().toUpperCase(),
        registrationNumber: registrationNumber.trim().toUpperCase(),
        imageUrls,
        baseRatePerHour: Math.round(Number(baseRatePerHour)),
        extensionRatePerHour: Math.round(Number(extensionRatePerHour)),
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

  const armourLabel = armourLevels.find((x) => x.code === armourLevel)?.label ?? armourLevel;
  const vehicleTypeLabel = vehicleTypes.find((x) => x.code === vehicleType)?.label ?? vehicleType;

  const primaryDisabled =
    submitting || (step === 0 ? !canStep0 : step === 1 ? !canStep1 : step === 2 ? !canSubmit : true);

  return (
    <LinearGradient
      colors={['rgb(31, 68, 149)', 'rgb(24, 49, 97)', '#020617']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={goBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              accessibilityRole="button"
              accessibilityLabel={step === 0 ? 'Close' : 'Previous step'}>
              <FontAwesome name="angle-left" size={20} color="#111827" />
            </Pressable>
            <View className="flex-1 items-center px-2">
              <Text className="text-center text-xs font-extrabold" style={{ color: GOLD, letterSpacing: 0.4 }}>
                STEP {step + 1} OF {STEPS}
              </Text>
              <Text className="mt-0.5 text-center text-base font-extrabold text-gray-100" numberOfLines={1}>
                {stepMeta[step]?.title ?? ''}
              </Text>
            </View>
            <View className="h-10 w-10" />
          </View>

          <View className="mt-4 flex-row gap-2">
            {Array.from({ length: STEPS }, (_, i) => (
              <View
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{ backgroundColor: i <= step ? GOLD : 'rgba(255,255,255,0.12)' }}
              />
            ))}
          </View>
          <Text className="mt-2 text-center text-xs font-semibold" style={{ color: '#9CA3AF' }}>
            {stepMeta[step]?.subtitle ?? ''}
          </Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}>
          <View
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: CARD,
              borderColor: 'rgba(255,255,255,0.06)',
              shadowColor: '#000',
              shadowOpacity: 0.22,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 10 },
              elevation: 6,
            }}>
            {step === 0 ? (
              <>
                <Pressable
                  onPress={() => setArmourPickerOpen(true)}
                  className="mb-3 rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                    Armour level
                  </Text>
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-sm font-extrabold text-gray-100">{armourLabel || '-'}</Text>
                    <FontAwesome name="angle-down" size={18} color={GOLD} />
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setVehicleTypePickerOpen(true)}
                  className="mb-3 rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                    Vehicle type
                  </Text>
                  <View className="mt-1 flex-row items-center justify-between">
                    <Text className="text-sm font-extrabold text-gray-100">{vehicleTypeLabel || '-'}</Text>
                    <FontAwesome name="angle-down" size={18} color={GOLD} />
                  </View>
                </Pressable>
                <Field label="Manufacturer" value={manufacturer} onChangeText={setManufacturer} placeholder="Toyota" />
                <Field label="Car model" value={carModel} onChangeText={setCarModel} placeholder="Land Cruiser" />
                <Field
                  label="Generation"
                  value={generation}
                  onChangeText={setGeneration}
                  placeholder="LC300"
                  autoCapitalize="characters"
                />
                <Field label="Year" value={year} onChangeText={setYear} placeholder="2022" keyboardType="number-pad" autoCapitalize="none" />
                <Field label="Colour" value={color} onChangeText={setColor} placeholder="Black" />
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Field
                  label="Number plate"
                  value={numberPlate}
                  onChangeText={setNumberPlate}
                  placeholder="ABC-1234"
                  autoCapitalize="characters"
                />
                <Field
                  label="Registration number"
                  value={registrationNumber}
                  onChangeText={setRegistrationNumber}
                  placeholder="REG-100200"
                  autoCapitalize="characters"
                />
                <Field
                  label="Seating capacity"
                  value={seatingCapacity}
                  onChangeText={setSeatingCapacity}
                  placeholder="4"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <Field label="Location / city" value={location} onChangeText={setLocation} placeholder="Quezon City" />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <View className="mb-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                    Vehicle photos
                  </Text>
                  <Text className="mt-1 text-xs font-semibold" style={{ color: '#6B7280' }}>
                    Optional, up to 5 images.
                  </Text>
                  <Pressable
                    onPress={pickImages}
                    className="mt-3 flex-row items-center justify-center rounded-xl border py-3"
                    style={{ borderColor: GOLD, backgroundColor: 'rgba(201,179,122,0.12)' }}>
                    <FontAwesome name="image" size={14} color={GOLD} />
                    <Text className="ml-2 text-xs font-extrabold" style={{ color: GOLD }}>
                      Choose images
                    </Text>
                  </Pressable>
                  {imageUris.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                      {imageUris.map((uri) => (
                        <View key={uri} className="mr-2">
                          <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 12 }} />
                          <Pressable
                            onPress={() => removeImage(uri)}
                            className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full"
                            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
                            <FontAwesome name="close" size={11} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
                <Field
                  label="Base rate (Rs / hour)"
                  value={baseRatePerHour}
                  onChangeText={setBaseRatePerHour}
                  placeholder="120"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <Field
                  label="Extension rate (Rs / hour)"
                  value={extensionRatePerHour}
                  onChangeText={setExtensionRatePerHour}
                  placeholder="120"
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <Text className="mt-1 text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                  Charged per hour when a customer extends an active trip.
                </Text>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 border-t px-5 py-4"
          style={{
            backgroundColor: CARD,
            borderTopColor: 'rgba(255,255,255,0.08)',
            paddingBottom: 8,
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -6 },
            elevation: 16,
          }}>
          <Pressable
            onPress={goNext}
            disabled={primaryDisabled}
            className="items-center justify-center rounded-2xl py-3.5"
            style={{ backgroundColor: primaryDisabled ? 'rgba(255,255,255,0.12)' : GOLD, opacity: primaryDisabled ? 0.7 : 1 }}>
            <Text className="text-sm font-extrabold" style={{ color: primaryDisabled ? '#9CA3AF' : '#0B0F14' }}>
              {submitting ? 'Saving…' : step === STEPS - 1 ? 'Add vehicle' : 'Next'}
            </Text>
          </Pressable>
        </View>

        <Modal transparent visible={armourPickerOpen} animationType="fade" onRequestClose={() => setArmourPickerOpen(false)}>
          <Pressable className="flex-1 items-center justify-center px-5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setArmourPickerOpen(false)}>
            <View onStartShouldSetResponder={() => true} className="w-full rounded-2xl border p-4" style={{ backgroundColor: CARD, borderColor: 'rgba(255,255,255,0.1)', maxWidth: 420 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-gray-100">Armour level</Text>
                <Pressable onPress={() => setArmourPickerOpen(false)}>
                  <Text className="text-sm font-extrabold" style={{ color: GOLD }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <ScrollView className="mt-3" style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                {armourLevels.map((t) => {
                  const active = t.code === armourLevel;
                  return (
                    <Pressable
                      key={t.code}
                      onPress={() => {
                        setArmourLevel(t.code);
                        setArmourPickerOpen(false);
                      }}
                      className="mb-2 flex-row items-center justify-between rounded-2xl border px-4 py-3"
                      style={{
                        borderColor: active ? GOLD : 'rgba(255,255,255,0.08)',
                        backgroundColor: active ? 'rgba(201,179,122,0.12)' : 'rgba(255,255,255,0.04)',
                      }}>
                      <View className="flex-row items-center gap-3">
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          style={{
                            borderColor: active ? GOLD : 'rgba(255,255,255,0.12)',
                            backgroundColor: active ? 'rgba(201,179,122,0.2)' : 'rgba(0,0,0,0.3)',
                          }}>
                          <FontAwesome name="shield" size={16} color={active ? GOLD : '#9CA3AF'} />
                        </View>
                        <View>
                          <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                            Level
                          </Text>
                          <Text className="mt-0.5 text-sm font-extrabold text-gray-100">{t.label}</Text>
                          <Text className="mt-0.5 text-xs font-semibold" style={{ color: '#6B7280' }}>
                            {t.code}
                          </Text>
                        </View>
                      </View>
                      {active ? <FontAwesome name="check" size={16} color={GOLD} /> : <View className="h-4 w-4" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal transparent visible={vehicleTypePickerOpen} animationType="fade" onRequestClose={() => setVehicleTypePickerOpen(false)}>
          <Pressable className="flex-1 items-center justify-center px-5" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setVehicleTypePickerOpen(false)}>
            <View onStartShouldSetResponder={() => true} className="w-full rounded-2xl border p-4" style={{ backgroundColor: CARD, borderColor: 'rgba(255,255,255,0.1)', maxWidth: 420 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-gray-100">Vehicle type</Text>
                <Pressable onPress={() => setVehicleTypePickerOpen(false)}>
                  <Text className="text-sm font-extrabold" style={{ color: GOLD }}>
                    Done
                  </Text>
                </Pressable>
              </View>
              <ScrollView className="mt-3" style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                {vehicleTypes.map((t) => {
                  const active = t.code === vehicleType;
                  return (
                    <Pressable
                      key={t.code}
                      onPress={() => {
                        setVehicleType(t.code);
                        setVehicleTypePickerOpen(false);
                      }}
                      className="mb-2 flex-row items-center justify-between rounded-2xl border px-4 py-3"
                      style={{
                        borderColor: active ? GOLD : 'rgba(255,255,255,0.08)',
                        backgroundColor: active ? 'rgba(201,179,122,0.12)' : 'rgba(255,255,255,0.04)',
                      }}>
                      <View className="flex-row items-center gap-3">
                        <View
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          style={{
                            borderColor: active ? GOLD : 'rgba(255,255,255,0.12)',
                            backgroundColor: active ? 'rgba(201,179,122,0.2)' : 'rgba(0,0,0,0.3)',
                          }}>
                          <FontAwesome name="car" size={16} color={active ? GOLD : '#9CA3AF'} />
                        </View>
                        <View>
                          <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                            Type
                          </Text>
                          <Text className="mt-0.5 text-sm font-extrabold text-gray-100">{t.label}</Text>
                          <Text className="mt-0.5 text-xs font-semibold" style={{ color: '#6B7280' }}>
                            {t.code}
                          </Text>
                        </View>
                      </View>
                      {active ? <FontAwesome name="check" size={16} color={GOLD} /> : <View className="h-4 w-4" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View className="mb-3 rounded-2xl border px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <Text className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="mt-1 text-sm font-extrabold text-gray-100"
      />
    </View>
  );
}
