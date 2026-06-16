import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useThrottledAsyncPress } from '@/hooks/useThrottledPress';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import {
  confirmExistingBookingAfterPayment,
  createBookingAfterPayment,
} from '@/lib/confirmBooking';
import { ensureUserSession } from '@/lib/api';
import { paramString } from '@/lib/routeParams';
import { useBookingsStore } from '@/store/bookingsStore';
import { useTripDraftStore } from '@/store/tripDraft';
import { colors, gradientProps, gradients, listCardShadow } from '@/constants/theme';

type PaymentMethod = 'Digital' | 'Cash';

function parseCoord(value: string | undefined) {
  if (value == null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function formatTripDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    amount?: string | string[];
    from?: string | string[];
    to?: string | string[];
    vehicleId?: string | string[];
    bookingId?: string | string[];
    startTime?: string | string[];
    endTime?: string | string[];
    pickupCity?: string | string[];
    dropCity?: string | string[];
    pickupLat?: string | string[];
    pickupLng?: string | string[];
    dropLat?: string | string[];
    dropLng?: string | string[];
  }>();

  const draft = useTripDraftStore();

  const checkout = useMemo(() => {
    const from = paramString(params.from) || draft.pickupAddress.trim();
    const to = paramString(params.to) || draft.dropAddress.trim();
    const vehicleId = paramString(params.vehicleId);
    const startTime = paramString(params.startTime) || (draft.startTimeIso ?? '');
    const endTime =
      paramString(params.endTime) ||
      (draft.startTimeIso && draft.baseDurationHours != null
        ? new Date(
            new Date(draft.startTimeIso).getTime() + draft.baseDurationHours * 60 * 60 * 1000
          ).toISOString()
        : '');

    return {
      vehicleId,
      bookingId: paramString(params.bookingId),
      from,
      to,
      startTime,
      endTime,
      pickupCity: paramString(params.pickupCity) || draft.pickupCity.trim() || undefined,
      dropCity: paramString(params.dropCity) || draft.dropCity.trim() || undefined,
      pickupLat: parseCoord(paramString(params.pickupLat)) ?? draft.pickupLat ?? undefined,
      pickupLng: parseCoord(paramString(params.pickupLng)) ?? draft.pickupLng ?? undefined,
      dropLat: parseCoord(paramString(params.dropLat)) ?? draft.dropLat ?? undefined,
      dropLng: parseCoord(paramString(params.dropLng)) ?? draft.dropLng ?? undefined,
    };
  }, [params, draft]);

  const amount = useMemo(() => {
    const v = Number(paramString(params.amount));
    return Number.isFinite(v) ? v : 60;
  }, [params.amount]);

  const [method, setMethod] = useState<PaymentMethod>('Digital');
  const [submitting, setSubmitting] = useState(false);

  const canPay = Boolean(
    checkout.vehicleId && checkout.from && checkout.to && checkout.startTime && checkout.endTime
  );

  async function payNow() {
    if (submitting || !canPay) {
      Alert.alert('Missing details', 'Go back and complete your booking before paying.');
      return;
    }
    try {
      setSubmitting(true);
      const s = await ensureUserSession();
      const { vehicleId, bookingId, from, to, startTime, endTime } = checkout;
      if (bookingId) {
        await confirmExistingBookingAfterPayment(s.userId, bookingId, vehicleId);
      } else {
        await createBookingAfterPayment(s.userId, {
          vehicleId,
          pickupLocation: from,
          dropLocation: to,
          startTime,
          endTime,
          pickupCity: checkout.pickupCity,
          dropCity: checkout.dropCity,
          pickupLat: checkout.pickupLat,
          pickupLng: checkout.pickupLng,
          dropLat: checkout.dropLat,
          dropLng: checkout.dropLng,
        });
      }
      router.replace('/(tabs)' as any);
      useTripDraftStore.getState().reset();
      await useBookingsStore
        .getState()
        .refreshUserBookings()
        .catch(() => null);
    } catch (e) {
      Alert.alert('Payment failed', e instanceof Error ? e.message : 'Could not complete booking');
    } finally {
      setSubmitting(false);
    }
  }

  const throttledPayNow = useThrottledAsyncPress(() => void payNow());

  return (
    <LinearGradient colors={[...gradients.screen]} {...gradientProps.screen} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <BackButton disabled={submitting} />
            <Text className="text-lg font-bold text-gray-200">Payment</Text>
            <View className="h-10 w-10" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} className="px-5 pt-4">
          <Text
            className="text-[13px] font-extrabold"
            style={{ letterSpacing: 2, color: colors.textSecondary }}>
            TRIP SUMMARY
          </Text>

          <View className="mt-3 overflow-hidden rounded-2xl" style={listCardShadow}>
            {/* <LinearGradient
              colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
              start={{ x: 1, y: 0 }}
              end={{ x: 1, y: 1 }}> */}
            <View
              className="mx-4 border-b pb-3 pt-3.5"
              style={{ borderBottomColor: colors.borderGold }}>
              <Text
                className="text-[12px] font-extrabold"
                style={{ color: colors.gold, letterSpacing: 0.5 }}>
                CONFIRM & PAY
              </Text>
            </View>
            {/* </LinearGradient> */}

            <View className="px-4 py-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <View className="flex-row">
                <View className="mr-3 w-5 items-center">
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{
                      borderWidth: 2,
                      borderColor: '#F59E0B',
                      backgroundColor: 'transparent',
                    }}
                  />
                  <View
                    className="my-2 w-[2px] flex-1"
                    style={{ backgroundColor: 'rgba(34,197,94,0.7)' }}
                  />
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ borderWidth: 2, borderColor: '#E5E7EB' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] font-bold" style={{ color: colors.textSecondary }}>
                    FROM
                  </Text>
                  <Text numberOfLines={2} className="mt-1 text-base font-extrabold text-gray-100">
                    {checkout.from || '—'}
                  </Text>
                  <View
                    className="mt-3 border-t"
                    style={{ borderTopColor: 'rgba(255,255,255,0.06)' }}
                  />
                  <Text
                    className="mt-3 text-[12px] font-bold"
                    style={{ color: colors.textSecondary }}>
                    TO
                  </Text>
                  <Text numberOfLines={2} className="mt-1 text-base font-extrabold text-gray-100">
                    {checkout.to || '—'}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <View
                  className="flex-1 rounded-xl px-3 py-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.textSecondary }}>
                    Start
                  </Text>
                  <Text className="mt-0.5 text-xs font-semibold text-gray-200">
                    {formatTripDateTime(checkout.startTime)}
                  </Text>
                </View>
                <View
                  className="flex-1 rounded-xl px-3 py-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Text className="text-[10px] font-bold" style={{ color: colors.textSecondary }}>
                    End
                  </Text>
                  <Text className="mt-0.5 text-xs font-semibold text-gray-200">
                    {formatTripDateTime(checkout.endTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text
            className="mt-6 text-[13px] font-extrabold"
            style={{ letterSpacing: 2, color: colors.textSecondary }}>
            PAYMENT METHOD
          </Text>
          <Text className="mt-1 text-sm font-semibold text-gray-300">
            Choose how you would like to pay for this trip.
          </Text>

          <View className="mt-3 gap-3">
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

          <View className="mt-4 rounded-2xl px-4 py-4" style={listCardShadow}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold" style={{ color: colors.textSecondary }}>
                Total amount
              </Text>
              <Text className="text-2xl font-extrabold" style={{ color: colors.gold }}>
                Rs {amount.toFixed(2)}
              </Text>
            </View>
            <Text className="mt-2 text-[11px] font-semibold" style={{ color: '#6B7280' }}>
              Includes vehicle rate for your selected trip window.
            </Text>
          </View>
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 border-t px-5 py-4"
          style={{
            backgroundColor: colors.card,
            borderTopColor: 'rgba(255,255,255,0.08)',
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -6 },
            elevation: 16,
          }}>
          <Pressable
            disabled={submitting || !canPay}
            onPress={throttledPayNow}
            className="items-center justify-center rounded-2xl py-4"
            style={{
              backgroundColor: submitting || !canPay ? colors.disabled : colors.gold,
              opacity: submitting || !canPay ? 0.7 : 1,
            }}>
            {submitting ? (
              <ActivityIndicator color={colors.textOnGold} />
            ) : (
              <Text
                className="text-sm font-extrabold"
                style={{ color: submitting || !canPay ? colors.textSecondary : colors.textOnGold }}>
                Pay now · Rs {amount.toFixed(2)}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
      className="flex-row items-center justify-between rounded-2xl px-4 py-4"
      style={{
        backgroundColor: active ? 'rgba(201,179,122,0.12)' : 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: active ? 'rgba(201,179,122,0.45)' : 'rgba(255,255,255,0.08)',
      }}>
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-2xl"
          style={{ backgroundColor: active ? 'rgba(201,179,122,0.2)' : 'rgba(255,255,255,0.06)' }}>
          <FontAwesome name={icon} size={16} color={active ? colors.gold : colors.textSecondary} />
        </View>
        <Text className="text-sm font-extrabold text-gray-100">{title}</Text>
      </View>
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: active ? colors.gold : 'rgba(255,255,255,0.25)' }}>
        {active ? (
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.gold }} />
        ) : null}
      </View>
    </Pressable>
  );
}
