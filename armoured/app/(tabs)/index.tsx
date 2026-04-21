import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import DateTimePicker, {
  DateTimePickerEvent,
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { AppState, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { apiGet, apiPost, ensureUserSession } from '@/lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

type VehicleType = string;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Home() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [mode, setMode] = useState<VehicleType>('LA');
  const [from, setFrom] = useState('PITX');
  const [to, setTo] = useState('Cubao');
  const [startAt, setStartAt] = useState<Date>(() => new Date(Date.now() + 30 * 60 * 1000));
  const [endAt, setEndAt] = useState<Date>(() => new Date(Date.now() + 90 * 60 * 1000));
  const [picker, setPicker] = useState<null | 'start' | 'end'>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitAtMs, setLastSubmitAtMs] = useState<number>(0);

  const balance = useMemo(() => 100, []);
  const [userId, setUserId] = useState<string | null>(null);
  const [ongoingTrip, setOngoingTrip] = useState<null | {
    id: string;
    pickupLocation: string;
    dropLocation: string;
    status: string;
    driverName: string;
    vehicleType: string;
  }>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVehicleTypes() {
      try {
        const res = await fetch(`${API_BASE_URL}/vehicles/types`);
        if (!res.ok) return;
        const data = (await res.json()) as { types?: VehicleType[] };
        const types = Array.isArray(data.types) ? data.types : [];
        if (cancelled) return;
        if (types.length > 0) {
          setVehicleTypes(types);
          setMode(types[0]);
        }
      } catch {
        // Ignore network errors and keep fallback UI.
      }
    }

    async function loadSession() {
      try {
        const s = await ensureUserSession();
        if (cancelled) return;
        setUserId(s.userId);
      } catch {
        router.replace('/login' as any);
      }
    }

    void loadVehicleTypes();
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let sub: any = null;

    async function loadOngoing() {
      if (!userId) return;
      try {
        const rows = await apiGet<any[]>(`/bookings`, userId);
        const b = Array.isArray(rows) ? rows.find((x) => x?.status === 'IN_PROGRESS') : null;
        if (cancelled) return;
        if (!b) {
          setOngoingTrip(null);
          return;
        }
        setOngoingTrip({
          id: String(b.id),
          pickupLocation: String(b.pickupLocation ?? ''),
          dropLocation: String(b.dropLocation ?? ''),
          status: String(b.status ?? ''),
          driverName: String(b.driver?.name ?? '—'),
          vehicleType: String(b.vehicle?.type ?? '—'),
        });
      } catch {
        // Ignore.
      }
    }

    void (async () => {
      await loadOngoing();
      sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void loadOngoing();
      });
    })();

    return () => {
      cancelled = true;
      if (sub) sub.remove();
    };
  }, [userId]);

  const typesToRender = vehicleTypes.length > 0 ? vehicleTypes : (['LA', 'MA', 'HA'] as const);

  function ensureRange(nextStart: Date, nextEnd: Date) {
    if (nextEnd.getTime() >= nextStart.getTime()) return { nextStart, nextEnd };
    return { nextStart, nextEnd: new Date(nextStart.getTime() + 60 * 60 * 1000) };
  }

  function openPicker(which: 'start' | 'end') {
    if (Platform.OS === 'android') {
      const value = which === 'start' ? startAt : endAt;
      DateTimePickerAndroid.open({
        mode: 'date',
        value,
        onChange: (event, date) => onChange(which, event, date),
      });
      return;
    }
    setPicker(which);
  }

  function onChange(which: 'start' | 'end', event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android' && (event.type !== 'set' || !date)) return;
    if (Platform.OS !== 'android' && !date) return;
    if (!date) return;

    if (which === 'start') {
      const { nextStart, nextEnd } = ensureRange(date, endAt);
      setStartAt(nextStart);
      setEndAt(nextEnd);
      return;
    }

    const { nextStart, nextEnd } = ensureRange(startAt, date);
    setStartAt(nextStart);
    setEndAt(nextEnd);
  }

  function formatDateTime(d: Date) {
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function submitBooking() {
    const now = Date.now();
    if (submitting) return;
    if (now - lastSubmitAtMs < 1200) return;

    try {
      setSubmitting(true);
      setLastSubmitAtMs(now);
      const s = userId ? { userId } : await ensureUserSession();
      setUserId(s.userId);

      const data = await apiPost<{ booking?: { id: string } }>(`/bookings/request`, s.userId, {
        pickupLocation: from,
        dropLocation: to,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
      });
      const bookingId = data.booking?.id;
      if (!bookingId) return;
      router.push({ pathname: '/select-vehicle' as any, params: { bookingId, type: mode } });
    } catch {
      // Keep UI simple for now; errors will be handled later.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Image
              source={{ uri: 'https://i.pravatar.cc/96?img=12' }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
            <View>
              <Text className="text-xs text-gray-500">${balance.toFixed(2)}</Text>
              <Text className="text-xs font-medium text-gray-500">Top up credit</Text>
            </View>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}>
            <FontAwesome name="bell-o" size={18} color="#111827" />
          </Pressable>
        </View>

        <View className="mt-4">
          <Text className="text-lg font-semibold text-gray-900">Hello Muhammad,</Text>
          <Text className="text-xl font-extrabold text-[#1D2DD9]">Where to go?</Text>
        </View>

        {ongoingTrip ? (
          <View className="mt-4 flex-row items-center rounded-2xl bg-gray-50 px-4 py-3">
            <Pressable
              onPress={() => router.push({ pathname: '/ongoing-trip' as any, params: { bookingId: ongoingTrip.id } })}
              className="flex-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-gray-900">Ongoing trip</Text>
                  <Text className="mt-1 text-[11px] font-semibold text-gray-600">
                    {ongoingTrip.pickupLocation} <Text className="text-gray-400">→</Text> {ongoingTrip.dropLocation}
                  </Text>
                  <Text className="mt-1 text-[11px] font-semibold text-gray-500">
                    {ongoingTrip.driverName} • {ongoingTrip.vehicleType}
                  </Text>
                </View>
                <View className="ml-3 h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <FontAwesome name="angle-right" size={18} color="#1D2DD9" />
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-4 flex-row justify-between">
          {typesToRender.map((t) => {
            const active = mode === t;
            const icon = iconForVehicleType(t);
            return (
              <Pressable key={t} onPress={() => setMode(t)} className="items-center">
                <View
                  className={`h-20 w-20 items-center justify-center rounded-2xl ${
                    active ? 'bg-[#1D2DD9]' : 'bg-gray-100'
                  }`}>
                  <FontAwesome name={icon} size={24} color={active ? '#FFFFFF' : '#111827'} />
                </View>
                <Text className="mt-2 text-xs font-semibold text-gray-700">{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white p-4" style={cardShadow}>
            <Text className="text-xs font-semibold text-gray-400">From</Text>
            <TextInput
              value={from}
              onChangeText={setFrom}
              className="mt-1 text-base font-bold text-gray-900"
            />
            <Text className="mt-1 text-xs text-gray-500">Parañaque City</Text>
          </View>
          <View className="w-12 items-center justify-center">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
              <FontAwesome name="exchange" size={16} color="#111827" />
            </View>
          </View>
          <View className="flex-1 rounded-2xl bg-white p-4" style={cardShadow}>
            <Text className="text-xs font-semibold text-gray-400">To</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              className="mt-1 text-base font-bold text-gray-900"
            />
            <Text className="mt-1 text-xs text-gray-500">Quezon City</Text>
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            className="flex-1 rounded-2xl bg-white p-4"
            style={cardShadow}
            onPress={() => openPicker('start')}>
            <Text className="text-xs font-semibold text-gray-400">Start Date & Time</Text>
            <View className="mt-2 flex-row items-center gap-2">
              <FontAwesome name="calendar" size={16} color="#111827" />
              <Text className="text-sm font-bold text-gray-900">{formatDateTime(startAt)}</Text>
            </View>
          </Pressable>
          <Pressable
            className="flex-1 rounded-2xl bg-white p-4"
            style={cardShadow}
            onPress={() => openPicker('end')}>
            <Text className="text-xs font-semibold text-gray-400">End Date & Time</Text>
            <View className="mt-2 flex-row items-center gap-2">
              <FontAwesome name="clock-o" size={16} color="#111827" />
              <Text className="text-sm font-bold text-gray-900">{formatDateTime(endAt)}</Text>
            </View>
          </Pressable>
        </View>

        <View className="mt-5">
          <Button
            title={submitting ? 'Searching…' : 'Search'}
            className="bg-black"
            onPress={submitBooking}
            disabled={submitting}
          />
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={picker !== null && Platform.OS !== 'android'}
        animationType="fade"
        onRequestClose={() => setPicker(null)}>
        <Pressable className="flex-1 bg-black/40 px-5" onPress={() => setPicker(null)}>
          <Pressable className="mt-auto rounded-3xl bg-white p-4" style={cardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-gray-900">
                {picker === 'start' ? 'Start Date & Time' : 'End Date & Time'}
              </Text>
              <Pressable onPress={() => setPicker(null)}>
                <Text className="text-sm font-extrabold text-[#1D2DD9]">Done</Text>
              </Pressable>
            </View>
            <View className="mt-3">
              <DateTimePicker
                mode="datetime"
                value={picker === 'start' ? startAt : endAt}
                onChange={(e, d) => onChange(picker === 'start' ? 'start' : 'end', e, d)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

function iconForVehicleType(type: VehicleType): React.ComponentProps<typeof FontAwesome>['name'] {
  switch (type) {
    case 'LA':
      return 'car';
    case 'MA':
      return 'taxi';
    case 'HA':
      return 'bus';
    default:
      return 'car';
  }
}
