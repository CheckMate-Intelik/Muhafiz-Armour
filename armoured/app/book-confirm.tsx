import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_GRADIENT, AUTH_CARD, AUTH_GOLD } from '@/components/AuthForm';
import { PUBLIC_API_BASE_URL, apiPost, ensureUserSession } from '@/lib/api';
import { paramString } from '@/lib/routeParams';
import { BackButton } from '@/components/BackButton';
import { useTripDraftStore } from '@/store/tripDraft';

const MAX_HOURS = 5 * 24;

const CARD_SHADOW: ViewStyle = {
  backgroundColor: AUTH_CARD,
  borderColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 14 },
  elevation: 8,
};

export default function BookConfirmScreen() {
  const { vehicleId: vehicleIdParam } = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const vehicleId = paramString(vehicleIdParam);

  const pickupAddress = useTripDraftStore((s) => s.pickupAddress);
  const dropAddress = useTripDraftStore((s) => s.dropAddress);
  const startTimeIso = useTripDraftStore((s) => s.startTimeIso);
  const baseDurationHours = useTripDraftStore((s) => s.baseDurationHours);
  const pickupCity = useTripDraftStore((s) => s.pickupCity);
  const dropCity = useTripDraftStore((s) => s.dropCity);
  const pickupLat = useTripDraftStore((s) => s.pickupLat);
  const pickupLng = useTripDraftStore((s) => s.pickupLng);
  const dropLat = useTripDraftStore((s) => s.dropLat);
  const dropLng = useTripDraftStore((s) => s.dropLng);

  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(() => baseDurationHours ?? 12);

  const tripReady = useMemo(
    () =>
      Boolean(
        vehicleId &&
          pickupAddress.trim() &&
          dropAddress.trim() &&
          startTimeIso &&
          baseDurationHours != null,
      ),
    [vehicleId, pickupAddress, dropAddress, startTimeIso, baseDurationHours],
  );

  const startAt = useMemo(
    () => (startTimeIso ? new Date(startTimeIso) : new Date()),
    [startTimeIso],
  );

  const endAt = useMemo(
    () => new Date(startAt.getTime() + Math.max(1, durationHours) * 60 * 60 * 1000),
    [startAt, durationHours],
  );

  const estimated = rate != null ? Math.round(rate * durationHours) : null;

  useFocusEffect(
    useCallback(() => {
      if (tripReady) return;
      Alert.alert('Missing trip', 'Please start from home and complete locations.');
      router.replace('/(tabs)' as any);
    }, [tripReady]),
  );

  useEffect(() => {
    if (baseDurationHours != null) {
      setDurationHours(baseDurationHours);
    }
  }, [baseDurationHours]);

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

  async function applyDuration(nextHours: number) {
    const clamped = Math.min(MAX_HOURS, Math.max(1, Math.round(nextHours)));
    setDurationHours(clamped);
    if (!vehicleId || !startTimeIso) return;
    try {
      setBusy(true);
      const s = await ensureUserSession();
      const end = new Date(startAt.getTime() + clamped * 60 * 60 * 1000);
      const res = await apiPost<{ available?: boolean }>(`/bookings/check-availability`, s.userId, {
        vehicleId,
        startTime: startAt.toISOString(),
        endTime: end.toISOString(),
      });
      if (!res.available) {
        Alert.alert('Unavailable', 'Vehicle is not free for this duration');
        setDurationHours(baseDurationHours ?? 12);
      }
    } catch (e) {
      Alert.alert('Unavailable', e instanceof Error ? e.message : 'Vehicle not free for this duration');
      setDurationHours(baseDurationHours ?? 12);
    } finally {
      setBusy(false);
    }
  }

  function pay() {
    if (!tripReady || estimated == null) return;
    router.replace({
      pathname: '/payment' as any,
      params: {
        vehicleId,
        amount: String(estimated),
        from: pickupAddress,
        to: dropAddress,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        pickupCity: pickupCity || undefined,
        dropCity: dropCity || undefined,
        pickupLat: pickupLat != null ? String(pickupLat) : undefined,
        pickupLng: pickupLng != null ? String(pickupLng) : undefined,
        dropLat: dropLat != null ? String(dropLat) : undefined,
        dropLng: dropLng != null ? String(dropLng) : undefined,
      },
    });
  }

  if (!tripReady) {
    return (
      <LinearGradient
        colors={[...APP_GRADIENT]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.5, 1]}
        style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 items-center justify-center px-5">
          <Text className="text-sm font-semibold text-gray-300">Trip details are missing.</Text>
          <Pressable
            onPress={() => router.replace('/(tabs)' as any)}
            className="mt-4 rounded-2xl px-4 py-3"
            style={{ backgroundColor: AUTH_GOLD }}>
            <Text className="text-xs font-extrabold" style={{ color: '#0B0F14' }}>
              Back to home
            </Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[...APP_GRADIENT]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <BackButton />
            <Text className="text-lg font-bold text-gray-200">Confirm booking</Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} className="px-5 pt-4">
          <Text
            className="text-[13px] font-extrabold"
            style={{ letterSpacing: 2, color: '#9CA3AF' }}>
            TRIP DETAILS
          </Text>

          <View className="mt-3 rounded-2xl px-4 py-4" style={CARD_SHADOW}>
            <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
              Pickup
            </Text>
            <Text className="mt-1 text-sm font-extrabold text-gray-100">{pickupAddress}</Text>
            <View className="my-3 border-t" style={{ borderTopColor: 'rgba(255,255,255,0.06)' }} />
            <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
              Drop-off
            </Text>
            <Text className="mt-1 text-sm font-extrabold text-gray-100">{dropAddress}</Text>
            <View className="my-3 border-t" style={{ borderTopColor: 'rgba(255,255,255,0.06)' }} />
            <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
              Start
            </Text>
            <Text className="mt-1 text-sm font-extrabold text-gray-100">{startAt.toLocaleString()}</Text>
          </View>

          <Text
            className="mt-6 text-[13px] font-extrabold"
            style={{ letterSpacing: 2, color: '#9CA3AF' }}>
            DURATION
          </Text>
          <Text className="mt-1 text-sm font-semibold text-gray-300">
            Change duration — availability is checked for this vehicle.
          </Text>

          <View className="mt-3 flex-row items-center gap-2">
            <Pressable
              disabled={busy}
              onPress={() => void applyDuration(durationHours - 1)}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Text className="text-xs font-extrabold text-gray-100">−</Text>
            </Pressable>
            <TextInput
              value={String(durationHours)}
              onChangeText={(t) => {
                const n = parseInt(t.replace(/[^\d]/g, ''), 10);
                if (!Number.isFinite(n)) return;
                setDurationHours(n);
              }}
              onBlur={() => {
                void applyDuration(durationHours);
              }}
              keyboardType="number-pad"
              editable={!busy}
              placeholderTextColor="#6B7280"
              className="min-w-[72px] rounded-xl px-3 py-2 text-center text-sm font-extrabold text-gray-100"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            />
            <Pressable
              disabled={busy}
              onPress={() => void applyDuration(durationHours + 1)}
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Text className="text-xs font-extrabold text-gray-100">+</Text>
            </Pressable>
            <Text className="flex-1 text-[11px] font-semibold text-gray-400">hours</Text>
          </View>
          <Text className="mt-2 text-[11px] font-semibold text-gray-400">Ends {endAt.toLocaleString()}</Text>

          <View className="mt-6 rounded-2xl px-4 py-4" style={CARD_SHADOW}>
            <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
              Estimated price
            </Text>
            <Text className="mt-1 text-2xl font-extrabold" style={{ color: AUTH_GOLD }}>
              {estimated != null ? `Rs ${estimated}` : '—'}
            </Text>
            {rate != null ? (
              <Text className="mt-1 text-xs font-semibold text-gray-400">
                Rate Rs {rate}/hr × {durationHours}h
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 border-t px-5 py-4"
          style={{
            backgroundColor: AUTH_CARD,
            borderTopColor: 'rgba(255,255,255,0.08)',
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -6 },
            elevation: 16,
          }}>
          <Pressable
            disabled={busy || estimated == null}
            onPress={pay}
            className="items-center justify-center rounded-2xl py-4"
            style={{
              backgroundColor: busy || estimated == null ? 'rgba(255,255,255,0.08)' : AUTH_GOLD,
              opacity: busy || estimated == null ? 0.7 : 1,
            }}>
            <Text
              className="text-sm font-extrabold"
              style={{ color: busy || estimated == null ? '#9CA3AF' : '#0B0F14' }}>
              {busy ? 'Please wait…' : estimated != null ? `Continue to payment · Rs ${estimated}` : 'Continue to payment'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
