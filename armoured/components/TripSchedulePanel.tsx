import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { apiPost, ensureUserSession } from '@/lib/api';
import { colors } from '@/constants/theme';
import { useTripDraftStore } from '@/store/tripDraft';

const MAX_HOURS = 5 * 24;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

function snapToHour(d: Date) {
  const out = new Date(d);
  out.setMinutes(0, 0, 0);
  return out;
}

function defaultPickupTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const snapped = snapToHour(d);
  if (d.getTime() > snapped.getTime()) snapped.setHours(snapped.getHours() + 1);
  return snapped;
}

function formatHourLabel(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

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
  const [startAt, setStartAt] = useState<Date>(defaultPickupTime);
  const [durationHours, setDurationHours] = useState(12);
  const [picker, setPicker] = useState<null | 'date' | 'time'>(null);
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

  function openDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: startAt,
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type !== 'set' || !d) return;
          setStartAt((prev) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), prev.getHours(), prev.getMinutes(), 0, 0));
        },
      });
      return;
    }
    setPicker('date');
  }

  function openTimePicker() {
    setPicker('time');
  }

  function selectHour(hour: number) {
    setStartAt((prev) => {
      const next = new Date(prev);
      next.setHours(hour, 0, 0, 0);
      return next;
    });
    setPicker(null);
  }

  function onDateChange(_: DateTimePickerEvent, d?: Date) {
    if (!d) return;
    setStartAt((prev) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), prev.getHours(), prev.getMinutes(), 0, 0));
  }

  function continueNext() {
    if (!meta) return;
    const pickup = snapToHour(startAt);
    const dh = Math.max(minHours, durationHours);
    const end = new Date(pickup.getTime() + dh * 60 * 60 * 1000);
    if (end.getTime() <= pickup.getTime()) {
      Alert.alert('Invalid range', 'End must be after start.');
      return;
    }
    draft.setSchedule(pickup.toISOString(), dh);
    router.push('/vehicle-select' as any);
  }

  if (loadingMeta || !meta) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color={colors.gold} />
        <Text className="mt-3 text-sm font-semibold text-gray-300">Calculating route…</Text>
      </View>
    );
  }

  return (
    <View>
      <View
        className="mt-4 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}>
        <View
          className="border-b px-4 py-3"
          style={{ backgroundColor: '#000000', borderBottomColor: 'rgba(255,255,255,0.06)' }}>
          <Text
            className="text-[12px] font-extrabold"
            style={{ color: colors.gold, letterSpacing: 0.5 }}>
            ROUTE
          </Text>
        </View>
        <View className="px-4 py-3">
          <Text className="text-base font-semibold text-gray-100">
            ~{meta.distanceKm.toFixed(1)} km
            <Text className="font-semibold" style={{ color: colors.textSecondary }}>{`  •  min drive estimate ${meta.distanceMinHours}h`}</Text>
          </Text>
          <Text className="mt-2 text-sm font-semibold" style={{ color: colors.textSecondary }}>
            Minimum booking duration for this route: {meta.effectiveMinDurationHours} hours (up to {MAX_HOURS} hours / 5 days).
          </Text>
          <Text className="mt-2 text-sm font-extrabold" style={{ color: colors.gold }}>
            {bufferLabel}
          </Text>
          <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
            Buffer time is added automatically when checking vehicle availability.
          </Text>
        </View>
      </View>

      <View className="mt-6 gap-3">
        <Pressable
          onPress={openDatePicker}
          className="flex-row items-center justify-between rounded-2xl px-4 py-3"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}>
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(201,179,122,0.12)' }}>
            <FontAwesome name="calendar" size={16} color={colors.gold} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[11px] font-extrabold" style={{ color: colors.textSecondary, letterSpacing: 0.6 }}>
              PICKUP DATE
            </Text>
            <Text className="mt-1 text-base font-extrabold text-gray-100">
              {startAt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <FontAwesome name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={openTimePicker}
          className="flex-row items-center justify-between rounded-2xl px-4 py-3"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}>
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(201,179,122,0.12)' }}>
            <FontAwesome name="clock-o" size={16} color={colors.gold} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[11px] font-extrabold" style={{ color: colors.textSecondary, letterSpacing: 0.6 }}>
              PICKUP TIME
            </Text>
            <Text className="mt-1 text-base font-extrabold text-gray-100">
              {formatHourLabel(startAt.getHours())}
            </Text>
          </View>
          <FontAwesome name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Text className="mt-5 text-[13px] font-extrabold" style={{ letterSpacing: 2, color: colors.textSecondary }}>
        DURATION (HOURS)
      </Text>
      <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
        Between {minHours} and {MAX_HOURS} hours
      </Text>
      <View
        className="mt-3 flex-row items-center justify-between rounded-2xl px-3 py-2"
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}>
        <Pressable
          onPress={() => adjustDuration(-1)}
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <FontAwesome name="minus" size={14} color={colors.gold} />
        </Pressable>
        <TextInput
          value={String(durationHours)}
          onChangeText={onDurationText}
          keyboardType="number-pad"
          placeholderTextColor={colors.textSecondary}
          className="min-w-[80px] text-center text-lg font-extrabold"
          style={{ color: '#F3F4F6' }}
        />
        <Pressable
          onPress={() => adjustDuration(1)}
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <FontAwesome name="plus" size={14} color={colors.gold} />
        </Pressable>
      </View>

      <Pressable
        onPress={continueNext}
        className="mt-6 items-center rounded-2xl py-4"
        style={{ backgroundColor: colors.gold }}>
        <Text className="text-sm font-extrabold" style={{ color: colors.textOnGold }}>
          Next — see available vehicles
        </Text>
      </Pressable>

      <Modal
        transparent
        visible={picker != null && (picker === 'time' || Platform.OS !== 'android')}
        animationType="fade"
        onRequestClose={() => setPicker(null)}>
        <Pressable
          className="flex-1 px-5"
          style={{ backgroundColor: 'rgba(2,6,23,0.7)' }}
          onPress={() => setPicker(null)}>
          <View
            className="mt-auto rounded-3xl p-4"
            onStartShouldSetResponder={() => true}
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-100">
                {picker === 'date' ? 'Pickup date' : 'Pickup time'}
              </Text>
              <Pressable onPress={() => setPicker(null)}>
                <Text className="text-sm font-extrabold" style={{ color: colors.gold }}>
                  Done
                </Text>
              </Pressable>
            </View>
            <View className="mt-3">
              {picker === 'date' ? (
                <DateTimePicker
                  mode="date"
                  value={startAt}
                  onChange={onDateChange}
                  textColor="#F3F4F6"
                  themeVariant="dark"
                />
              ) : (
                <ScrollView className="max-h-72" keyboardShouldPersistTaps="handled">
                  {HOUR_OPTIONS.map((hour) => {
                    const selected = startAt.getHours() === hour;
                    return (
                      <Pressable
                        key={hour}
                        onPress={() => selectHour(hour)}
                        className="flex-row items-center justify-between rounded-xl px-3 py-3"
                        style={{
                          backgroundColor: selected ? 'rgba(201,179,122,0.18)' : 'transparent',
                        }}>
                        <Text
                          className="text-base font-extrabold"
                          style={{ color: selected ? colors.gold : '#F3F4F6' }}>
                          {formatHourLabel(hour)}
                        </Text>
                        {selected ? <FontAwesome name="check" size={14} color={colors.gold} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
