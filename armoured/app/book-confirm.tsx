import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PUBLIC_API_BASE_URL, apiPatch, apiPost, ensureUserSession } from '@/lib/api';
import { useTripDraftStore } from '@/store/tripDraft';

const MAX_HOURS = 5 * 24;

export default function BookConfirmScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = vehicleIdParam ?? '';
  const draft = useTripDraftStore();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(true);
  const [rate, setRate] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(() => draft.baseDurationHours ?? 12);

  const startAt = useMemo(() => (draft.startTimeIso ? new Date(draft.startTimeIso) : new Date()), [draft.startTimeIso]);

  const endAt = useMemo(
    () => new Date(startAt.getTime() + Math.max(1, durationHours) * 60 * 60 * 1000),
    [startAt, durationHours],
  );

  const estimated = rate != null ? Math.round(rate * durationHours) : null;

  useEffect(() => {
    if (!vehicleId || !draft.pickupAddress || !draft.dropAddress || !draft.startTimeIso || draft.baseDurationHours == null) {
      Alert.alert('Missing trip', 'Please start from home and complete locations.');
      router.replace('/(tabs)' as any);
    }
  }, [vehicleId, draft]);

  useEffect(() => {
    let cancelled = false;
    async function loadRate() {
      if (!vehicleId) return;
      try {
        const res = await fetch(`${PUBLIC_API_BASE_URL}/vehicles/${vehicleId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { vehicle?: { baseRatePerHour?: number } | null };
        if (cancelled) return;
        setRate(typeof data.vehicle?.baseRatePerHour === 'number' ? data.vehicle.baseRatePerHour : null);
      } catch {
        // ignore
      }
    }
    void loadRate();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    let cancelled = false;
    async function createDraft() {
      if (!vehicleId || !draft.pickupAddress || !draft.startTimeIso || draft.baseDurationHours == null) {
        setCreating(false);
        return;
      }
      try {
        const s = await ensureUserSession();
        const dh = draft.baseDurationHours;
        const end = new Date(new Date(draft.startTimeIso).getTime() + dh * 60 * 60 * 1000);
        const res = await apiPost<{ booking?: { id: string } }>(`/bookings/request`, s.userId, {
          pickupLocation: draft.pickupAddress,
          dropLocation: draft.dropAddress,
          pickupCity: draft.pickupCity,
          dropCity: draft.dropCity,
          pickupLat: draft.pickupLat ?? undefined,
          pickupLng: draft.pickupLng ?? undefined,
          dropLat: draft.dropLat ?? undefined,
          dropLng: draft.dropLng ?? undefined,
          startTime: draft.startTimeIso,
          endTime: end.toISOString(),
        });
        if (cancelled) return;
        const id = res.booking?.id;
        if (id) setBookingId(id);
      } catch (e) {
        Alert.alert('Booking', e instanceof Error ? e.message : 'Failed to create draft');
        router.back();
      } finally {
        if (!cancelled) setCreating(false);
      }
    }
    void createDraft();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, draft.pickupAddress, draft.dropAddress, draft.startTimeIso, draft.baseDurationHours, draft.pickupCity, draft.dropCity, draft.pickupLat, draft.pickupLng, draft.dropLat, draft.dropLng]);

  async function applyDuration(nextHours: number) {
    const clamped = Math.min(MAX_HOURS, Math.max(1, Math.round(nextHours)));
    setDurationHours(clamped);
    if (!bookingId || !vehicleId) return;
    try {
      setBusy(true);
      const s = await ensureUserSession();
      const end = new Date(startAt.getTime() + clamped * 60 * 60 * 1000);
      await apiPatch(`/bookings/${bookingId}/schedule`, s.userId, {
        endTime: end.toISOString(),
        vehicleId,
      });
    } catch (e) {
      Alert.alert('Unavailable', e instanceof Error ? e.message : 'Vehicle not free for this duration');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!vehicleId || !bookingId || estimated == null) return;
    try {
      setBusy(true);
      const s = await ensureUserSession();
      const selected = await apiPost<{ totalPrice?: number; pickupLocation?: string; dropLocation?: string }>(
        `/bookings/${bookingId}/select`,
        s.userId,
        { vehicleId },
      );
      router.replace({
        pathname: '/payment' as any,
        params: {
          amount: String(selected.totalPrice ?? estimated),
          from: selected.pickupLocation ?? draft.pickupAddress,
          to: selected.dropLocation ?? draft.dropAddress,
        },
      });
    } catch (e) {
      Alert.alert('Booking failed', e instanceof Error ? e.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Confirm booking</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4">
        <Text className="text-[10px] font-bold text-gray-400">Pickup</Text>
        <Text className="mt-1 text-sm font-extrabold text-gray-900">{draft.pickupAddress}</Text>
        <Text className="mt-3 text-[10px] font-bold text-gray-400">Drop-off</Text>
        <Text className="mt-1 text-sm font-extrabold text-gray-900">{draft.dropAddress}</Text>
        <Text className="mt-3 text-[10px] font-bold text-gray-400">Start</Text>
        <Text className="mt-1 text-sm font-extrabold text-gray-900">{startAt.toLocaleString()}</Text>

        <Text className="mt-4 text-[10px] font-bold text-gray-400">Duration (hours)</Text>
        <Text className="mt-1 text-[10px] font-semibold text-gray-500">Change duration — availability is checked for this vehicle.</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <Pressable onPress={() => void applyDuration(durationHours - 1)} className="rounded-xl bg-gray-100 px-3 py-2">
            <Text className="text-xs font-extrabold text-gray-900">−</Text>
          </Pressable>
          <TextInput
            value={String(durationHours)}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/[^\d]/g, ''), 10);
              if (!Number.isFinite(n)) return;
              setDurationHours(n);
            }}
            onBlur={() => {
              if (bookingId) void applyDuration(durationHours);
            }}
            keyboardType="number-pad"
            className="min-w-[72px] rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-extrabold text-gray-900"
          />
          <Pressable onPress={() => void applyDuration(durationHours + 1)} className="rounded-xl bg-gray-100 px-3 py-2">
            <Text className="text-xs font-extrabold text-gray-900">+</Text>
          </Pressable>
        </View>
        <Text className="mt-1 text-[10px] font-semibold text-gray-500">Ends {endAt.toLocaleString()}</Text>

        <View className="mt-6 rounded-2xl bg-gray-50 px-4 py-3">
          <Text className="text-[10px] font-bold text-gray-400">Estimated price</Text>
          <Text className="mt-1 text-2xl font-extrabold text-gray-900">{estimated != null ? `Rs ${estimated}` : '—'}</Text>
          {rate != null ? (
            <Text className="mt-1 text-xs font-semibold text-gray-500">Rate Rs {rate}/hr × {durationHours}h</Text>
          ) : null}
        </View>

        <Pressable
          disabled={busy || creating || estimated == null || !bookingId}
          onPress={() => void pay()}
          className={`mt-8 items-center rounded-2xl py-3 ${busy || creating || estimated == null || !bookingId ? 'bg-gray-300' : 'bg-[#111827]'}`}>
          <Text className={`text-xs font-extrabold ${busy || creating || estimated == null || !bookingId ? 'text-gray-600' : 'text-white'}`}>
            {creating ? 'Preparing…' : busy ? 'Please wait…' : 'Continue to payment'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
