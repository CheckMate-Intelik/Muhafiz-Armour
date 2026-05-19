import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmExistingBookingAfterPayment, createBookingAfterPayment } from '@/lib/confirmBooking';
import { ensureUserSession } from '@/lib/api';
import { useBookingsStore } from '@/store/bookingsStore';
import { useTripDraftStore } from '@/store/tripDraft';

type PaymentMethod = 'Digital' | 'Cash';

function parseCoord(value: string | undefined) {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    from?: string;
    to?: string;
    vehicleId?: string;
    bookingId?: string;
    startTime?: string;
    endTime?: string;
    pickupCity?: string;
    dropCity?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropLat?: string;
    dropLng?: string;
  }>();

  const amount = useMemo(() => {
    const v = Number(params.amount ?? '60.00');
    return Number.isFinite(v) ? v : 60;
  }, [params.amount]);

  const [method, setMethod] = useState<PaymentMethod>('Digital');
  const [submitting, setSubmitting] = useState(false);

  const canPay = Boolean(
    params.vehicleId?.trim() &&
      params.from?.trim() &&
      params.to?.trim() &&
      params.startTime?.trim() &&
      params.endTime?.trim(),
  );

  async function payNow() {
    if (submitting || !canPay) {
      Alert.alert('Missing details', 'Go back and complete your booking before paying.');
      return;
    }
    try {
      setSubmitting(true);
      const s = await ensureUserSession();
      const vehicleId = params.vehicleId!.trim();
      const existingBookingId = params.bookingId?.trim();
      if (existingBookingId) {
        await confirmExistingBookingAfterPayment(s.userId, existingBookingId, vehicleId);
      } else {
        await createBookingAfterPayment(s.userId, {
          vehicleId,
          pickupLocation: params.from!.trim(),
          dropLocation: params.to!.trim(),
          startTime: params.startTime!.trim(),
          endTime: params.endTime!.trim(),
          pickupCity: params.pickupCity?.trim() || undefined,
          dropCity: params.dropCity?.trim() || undefined,
          pickupLat: parseCoord(params.pickupLat),
          pickupLng: parseCoord(params.pickupLng),
          dropLat: parseCoord(params.dropLat),
          dropLng: parseCoord(params.dropLng),
        });
      }
      useTripDraftStore.getState().reset();
      await useBookingsStore.getState().refreshUserBookings().catch(() => null);
      router.replace('/(tabs)' as any);
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Could not complete booking');
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
            disabled={submitting}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <FontAwesome name="arrow-left" size={16} color="#111827" />
          </Pressable>
          <Text className="text-base font-extrabold text-gray-900">Payment</Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }} className="px-5 pt-4">
        <View className="rounded-3xl bg-white p-4" style={cardShadow}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                  <FontAwesome name="location-arrow" size={16} color="#111827" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400">Pick up</Text>
                  <Text className="text-sm font-extrabold text-gray-900">{params.from ?? '—'}</Text>
                </View>
              </View>

              <View className="mt-4 flex-row items-center gap-2">
                <View className="h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                  <FontAwesome name="map-marker" size={16} color="#111827" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400">Destination</Text>
                  <Text className="text-sm font-extrabold text-gray-900">{params.to ?? '—'}</Text>
                </View>
              </View>
            </View>

            <Pressable className="ml-3 h-9 w-9 items-center justify-center rounded-2xl bg-gray-50">
              <FontAwesome name="random" size={16} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View className="mt-4 rounded-3xl bg-white p-4" style={cardShadow}>
          <Text className="text-base font-extrabold text-gray-900">Select payment method</Text>

          <View className="mt-4 gap-3">
            <MethodRow
              title="Digital Payment"
              active={method === 'Digital'}
              onPress={() => setMethod('Digital')}
              icon="credit-card"
            />
            <MethodRow
              title="Cash on Payment"
              active={method === 'Cash'}
              onPress={() => setMethod('Cash')}
              icon="money"
            />
          </View>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-gray-500">Total amount</Text>
            <Text className="text-lg font-extrabold text-gray-900">Rs {amount.toFixed(2)}</Text>
          </View>
        </View>

        <Pressable
          disabled={submitting || !canPay}
          className={`mt-5 items-center justify-center rounded-2xl py-4 ${submitting || !canPay ? 'bg-gray-300' : 'bg-[#111827]'}`}
          onPress={() => void payNow()}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-extrabold text-white">Pay now</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MethodRow({
  title,
  active,
  onPress,
  icon,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl bg-gray-50 px-4 py-4">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-2xl bg-white">
          <FontAwesome name={icon} size={16} color="#111827" />
        </View>
        <Text className="text-sm font-extrabold text-gray-900">{title}</Text>
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
          active ? 'border-[#1D2DD9]' : 'border-gray-300'
        }`}>
        {active ? <View className="h-3 w-3 rounded-full bg-[#1D2DD9]" /> : null}
      </View>
    </Pressable>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
