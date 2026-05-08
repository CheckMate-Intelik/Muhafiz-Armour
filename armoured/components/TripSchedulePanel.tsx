import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { apiPost, ensureUserSession } from '@/lib/api';
import { useTripDraftStore } from '@/store/tripDraft';

const MAX_HOURS = 5 * 24;

type PlanMeta = {
  distanceKm: number;
  distanceMinHours: number;
  effectiveMinDurationHours: number;
  bufferMinutes: number;
  maxDurationHours: number;
};

export function TripSchedulePanel() {
  const draft = useTripDraftStore();
  const [meta, setMeta] = useState<PlanMeta | null>(null);
  const [startAt, setStartAt] = useState<Date>(() => new Date(Date.now() + 60 * 60 * 1000));
  const [durationHours, setDurationHours] = useState(12);
  const [picker, setPicker] = useState<null | 'start'>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingMeta(true);
      try {
        const d = useTripDraftStore.getState();
        const s = await ensureUserSession();
        const m = await apiPost<PlanMeta>(`/bookings/plan-meta`, s.userId, {
          pickupCity: d.pickupCity,
          dropCity: d.dropCity,
          pickupLat: d.pickupLat!,
          pickupLng: d.pickupLng!,
          dropLat: d.dropLat!,
          dropLng: d.dropLng!,
        });
        if (cancelled) return;
        setMeta(m);
        setDurationHours((prev) => Math.max(m.effectiveMinDurationHours, prev));
      } catch {
        if (!cancelled) {
          Alert.alert('Unable to plan trip', 'Check your connection and try again.');
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [draft.pickupLat, draft.pickupLng, draft.dropLat, draft.dropLng, draft.pickupCity, draft.dropCity]);

  const minHours = meta?.effectiveMinDurationHours ?? 10;

  function adjustDuration(delta: number) {
    setDurationHours((prev) => {
      const next = Math.round(prev + delta);
      return Math.min(MAX_HOURS, Math.max(minHours, next));
    });
  }

  function onDurationText(t: string) {
    const n = parseInt(t.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n)) return;
    setDurationHours(Math.min(MAX_HOURS, Math.max(minHours, n)));
  }

  const bufferLabel = useMemo(() => {
    if (!meta) return '';
    const h = meta.bufferMinutes / 60;
    const same = draft.pickupCity.trim().toLowerCase() === draft.dropCity.trim().toLowerCase();
    return same ? `Same-city buffer: ${h} hours` : `Intercity buffer: ${h} hours`;
  }, [meta, draft.pickupCity, draft.dropCity]);

  function openStartPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'datetime' as any,
        value: startAt,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type !== 'set' || !d) return;
          setStartAt(d);
        },
      });
      return;
    }
    setPicker('start');
  }

  function onStartChange(_: DateTimePickerEvent, d?: Date) {
    if (d) setStartAt(d);
  }

  function continueNext() {
    if (!meta) return;
    const dh = Math.max(minHours, durationHours);
    const end = new Date(startAt.getTime() + dh * 60 * 60 * 1000);
    if (end.getTime() <= startAt.getTime()) {
      Alert.alert('Invalid range', 'End must be after start.');
      return;
    }
    draft.setSchedule(startAt.toISOString(), dh);
    router.push('/vehicle-select' as any);
  }

  if (loadingMeta || !meta) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color="#111827" />
        <Text className="mt-3 text-sm font-semibold text-gray-600">Calculating route…</Text>
      </View>
    );
  }

  return (
    <View>
      <View className="mt-4 rounded-2xl bg-gray-50 px-4 py-3">
        <Text className="text-[11px] font-bold text-gray-500">Route</Text>
        <Text className="mt-1 text-xs font-semibold text-gray-700">
          ~{meta.distanceKm.toFixed(1)} km • min drive estimate {meta.distanceMinHours}h
        </Text>
        <Text className="mt-2 text-xs font-semibold text-gray-600">
          Minimum booking duration for this route: {meta.effectiveMinDurationHours} hours (up to {MAX_HOURS} hours / 5 days).
        </Text>
        <Text className="mt-2 text-xs font-extrabold text-[#1D2DD9]">{bufferLabel}</Text>
        <Text className="mt-1 text-[10px] font-semibold text-gray-500">
          Buffer time is added automatically when checking vehicle availability.
        </Text>
      </View>

      <Pressable onPress={openStartPicker} className="mt-4 rounded-2xl bg-gray-50 px-4 py-3">
        <Text className="text-[10px] font-bold text-gray-400">Pickup date & time</Text>
        <Text className="mt-1 text-sm font-extrabold text-gray-900">{startAt.toLocaleString()}</Text>
      </Pressable>

      <Text className="mt-4 text-[10px] font-bold text-gray-400">Duration (hours)</Text>
      <Text className="mt-1 text-[10px] font-semibold text-gray-500">
        Between {minHours} and {MAX_HOURS} hours
      </Text>
      <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-gray-50 px-3 py-2">
        <Pressable onPress={() => adjustDuration(-1)} className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <FontAwesome name="minus" size={14} color="#111827" />
        </Pressable>
        <TextInput
          value={String(durationHours)}
          onChangeText={onDurationText}
          keyboardType="number-pad"
          className="min-w-[80px] text-center text-lg font-extrabold text-gray-900"
        />
        <Pressable onPress={() => adjustDuration(1)} className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <FontAwesome name="plus" size={14} color="#111827" />
        </Pressable>
      </View>

      <Pressable onPress={continueNext} className="mt-6 items-center rounded-2xl bg-[#111827] py-3">
        <Text className="text-xs font-extrabold text-white">Next — see available vehicles</Text>
      </Pressable>

      <Modal transparent visible={picker === 'start' && Platform.OS !== 'android'} animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable className="flex-1 bg-black/40 px-5" onPress={() => setPicker(null)}>
          <Pressable className="mt-auto rounded-3xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-900">Pickup time</Text>
              <Pressable onPress={() => setPicker(null)}>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
              </Pressable>
            </View>
            <View className="mt-3">
              <DateTimePicker mode="datetime" value={startAt} onChange={onStartChange} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
