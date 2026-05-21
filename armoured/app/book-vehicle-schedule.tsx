import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PUBLIC_API_BASE_URL } from '@/lib/api';

type PickerMode = 'startDate' | 'startTime' | 'endDate' | 'endTime';

export default function BookVehicleScheduleScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string; from?: string; to?: string }>();
  const vehicleId = params.vehicleId ?? '';
  const from = (params.from ?? '').trim();
  const to = (params.to ?? '').trim();
  const [startAt, setStartAt] = useState<Date>(() => new Date(Date.now() + 30 * 60 * 1000));
  const [endAt, setEndAt] = useState<Date>(() => new Date(Date.now() + 90 * 60 * 1000));
  const [picker, setPicker] = useState<null | PickerMode>(null);
  const [submitting, setSubmitting] = useState(false);

  function ensureRange(nextStart: Date, nextEnd: Date) {
    if (nextEnd.getTime() >= nextStart.getTime()) return { nextStart, nextEnd };
    return { nextStart, nextEnd: new Date(nextStart.getTime() + 60 * 60 * 1000) };
  }

  function mergeDatePart(base: Date, picked: Date) {
    const next = new Date(base);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    return next;
  }

  function mergeTimePart(base: Date, picked: Date) {
    const next = new Date(base);
    next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    return next;
  }

  function onChange(which: PickerMode, event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android' && (event.type !== 'set' || !date)) return;
    if (Platform.OS !== 'android' && !date) return;
    if (!date) return;

    if (which === 'startDate') {
      const nextStart = mergeDatePart(startAt, date);
      const { nextEnd } = ensureRange(nextStart, endAt);
      setStartAt(nextStart);
      setEndAt(nextEnd);
      return;
    }
    if (which === 'startTime') {
      const nextStart = mergeTimePart(startAt, date);
      const { nextEnd } = ensureRange(nextStart, endAt);
      setStartAt(nextStart);
      setEndAt(nextEnd);
      return;
    }
    if (which === 'endDate') {
      const nextEnd = mergeDatePart(endAt, date);
      const { nextStart, nextEnd: fixedEnd } = ensureRange(startAt, nextEnd);
      setStartAt(nextStart);
      setEndAt(fixedEnd);
      return;
    }
    const nextEnd = mergeTimePart(endAt, date);
    const { nextStart, nextEnd: fixedEnd } = ensureRange(startAt, nextEnd);
    setStartAt(nextStart);
    setEndAt(fixedEnd);
  }

  function openPicker(which: PickerMode) {
    const value = which.startsWith('start') ? startAt : endAt;
    const mode = which.endsWith('Date') ? 'date' : 'time';
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode,
        value,
        onChange: (event, date) => onChange(which, event, date),
      });
      return;
    }
    setPicker(which);
  }

  async function submit() {
    if (submitting) return;
    if (!vehicleId || !from || !to) {
      Alert.alert('Missing details', 'Please complete location details first.');
      router.replace('/book-vehicle' as any);
      return;
    }
    try {
      setSubmitting(true);
      let amount = 0;
      try {
        const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/${vehicleId}`);
        if (res.ok) {
          const data = (await res.json()) as { vehicle?: { baseRatePerHour?: number } | null };
          const rate = data.vehicle?.baseRatePerHour;
          if (typeof rate === 'number') {
            const hours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
            amount = Math.round(rate * hours);
          }
        }
      } catch {
        // use 0; payment screen still shows trip details
      }
      router.replace({
        pathname: '/payment',
        params: {
          vehicleId,
          amount: String(amount),
          from,
          to,
          startTime: startAt.toISOString(),
          endTime: endAt.toISOString(),
        },
      });
    } catch (e) {
      Alert.alert('Booking failed', e instanceof Error ? e.message : 'Unable to continue');
    } finally {
      setSubmitting(false);
    }
  }

  const startDateText = startAt.toLocaleDateString();
  const startTimeText = startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endDateText = endAt.toLocaleDateString();
  const endTimeText = endAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Trip schedule</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4">
        <SelectField label="Start date" value={startDateText} onPress={() => openPicker('startDate')} />
        <SelectField label="Start time" value={startTimeText} onPress={() => openPicker('startTime')} />
        <SelectField label="End date" value={endDateText} onPress={() => openPicker('endDate')} />
        <SelectField label="End time" value={endTimeText} onPress={() => openPicker('endTime')} />

        <Pressable
          disabled={submitting}
          onPress={submit}
          className={`mt-5 items-center rounded-2xl py-3 ${submitting ? 'bg-gray-300' : 'bg-[#111827]'}`}>
          <Text className={`text-xs font-extrabold ${submitting ? 'text-gray-600' : 'text-white'}`}>
            {submitting ? 'Booking...' : 'Continue to payment'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal transparent visible={picker !== null && Platform.OS !== 'android'} animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable className="flex-1 bg-black/40 px-5" onPress={() => setPicker(null)}>
          <Pressable className="mt-auto rounded-3xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-900">
                {picker === 'startDate'
                  ? 'Start date'
                  : picker === 'startTime'
                  ? 'Start time'
                  : picker === 'endDate'
                  ? 'End date'
                  : 'End time'}
              </Text>
              <Pressable onPress={() => setPicker(null)}>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
              </Pressable>
            </View>
            <View className="mt-3">
              <DateTimePicker
                mode={picker?.endsWith('Date') ? 'date' : 'time'}
                value={picker?.startsWith('start') ? startAt : endAt}
                onChange={(e, d) => {
                  if (!picker) return;
                  onChange(picker, e, d);
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mt-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Text className="text-[10px] font-bold text-gray-400">{label}</Text>
      <Text className="mt-1 text-sm font-extrabold text-gray-900">{value}</Text>
    </Pressable>
  );
}
