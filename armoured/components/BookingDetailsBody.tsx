import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from 'react-native';

import { PendingExpiryCountdown } from '@/components/PendingExpiryCountdown';
import { isPendingAwaitingDispatcher } from '@/lib/bookingPendingExpiry';

export type BookingDetailsBodyProps = {
  personLabel: string;
  personName: string;
  statusLabel: string;
  payoutLabel: string;
  vehicleName: string;
  vehicleType: string;
  vehicleArmour: string;
  bookingId: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
};

export function BookingDetailsBody({
  personLabel,
  personName,
  statusLabel,
  payoutLabel,
  vehicleName,
  vehicleType,
  vehicleArmour,
  bookingId,
  pickupLocation,
  dropLocation,
  startTime,
  endTime,
  pendingExpiresAt,
  createdAt,
}: BookingDetailsBodyProps) {
  const tripDurationText = tripDurationLabel(startTime, endTime);
  const tripStartDateText = formatTripDateShort(startTime);
  const pickupAtText = formatTripDateTime(startTime);
  const returnAtText = formatTripDateTime(endTime);
  const statusTextClassName = statusTextColorClass(statusLabel);

  return (
    <>
      {isPendingAwaitingDispatcher(statusLabel) ? (
        <View
          className="mb-4 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.35)',
          }}>
          <Text className="text-xs font-extrabold text-amber-300">
            Awaiting dispatcher acceptance
          </Text>
          <PendingExpiryCountdown
            status={statusLabel}
            pendingExpiresAt={pendingExpiresAt}
            createdAt={createdAt}
            variant="dark"
            className="mt-1"
          />
          <Text className="mt-2 text-[11px] font-semibold" style={{ color: '#B8BBC0' }}>
            If not accepted within 1 hour, this request will expire automatically.
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-stretch gap-2">
        <View
          className="flex-1 rounded-2xl p-3"
          style={{
            ...cardShadow,
            backgroundColor: '#222222',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}>
          <Text
            className="text-md mb-2 border-b border-[#4d4d4d] pb-2 font-bold"
            style={{ color: '#C9B37A' }}>
            {personLabel}
          </Text>
          <View className="mt-2 flex-row items-center">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}>
              <FontAwesome name="user" size={16} color="#9CA3AF" />
            </View>
            <Text className="text-md ml-2 flex-1 font-bold text-gray-200" numberOfLines={1}>
              {personName}
            </Text>
          </View>
        </View>
        <View className="w-[40%] flex-col gap-2">
          <View
            className="rounded-2xl p-3"
            style={{
              ...cardShadow,
              backgroundColor: '#222222',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
            <Text
              className="border-b border-[#4d4d4d] pb-2 text-[11px] font-bold"
              style={{ color: '#C9B37A' }}>
              Status
            </Text>
            <Text className={`mt-2 text-xs font-semibold ${statusTextClassName}`} numberOfLines={2}>
              {statusLabel}
            </Text>
          </View>
          <View
            className="h-[80px] rounded-2xl p-3"
            style={{
              ...cardShadow,
              backgroundColor: '#222222',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
            <Text
              className="border-b border-[#4d4d4d] pb-2 text-[11px] font-bold"
              style={{ color: '#C9B37A' }}>
              Payout
            </Text>
            <Text className="mt-2 text-sm font-semibold text-gray-200" numberOfLines={2}>
              {payoutLabel}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="mt-4 rounded-3xl p-4"
        style={{
          ...cardShadow,
          backgroundColor: '#222222',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}>
        <View className="mt-2">
          <Text className="border-b border-[#4d4d4d] pb-2 text-lg font-bold text-[#C9B37A]">
            {vehicleName || '—'}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-sm font-bold" style={{ color: '#B8BBC0' }}>
              {vehicleType || '—'}
            </Text>
            <View className="flex-row items-center gap-1">
              <FontAwesome name="shield" size={16} color="#C9B37A" />
              <Text className="text-md font-semibold" style={{ color: '#B8BBC0' }}>
                {vehicleArmour || '—'}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-3">
          <Text className="text-sm font-bold" style={{ color: '#9CA3AF' }}>
            Booking ID
          </Text>
          <Text className="mt-1 text-sm font-extrabold text-gray-100">{bookingId || '—'}</Text>
        </View>
      </View>

      <Text className="mt-6 text-xl font-bold text-gray-100">Trip info</Text>

      <View className="mt-5 flex-row items-center">
        <View className="relative h-11 w-11 items-center justify-center">
          <FontAwesome name="calendar-o" size={20} color="#9CA3AF" />
          <View
            className="absolute bottom-0.5 right-0.5 rounded-sm"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
            <FontAwesome name="clock-o" size={9} color="#9CA3AF" />
          </View>
        </View>
        <View className="ml-1 flex-1">
          <Text className="text-md" style={{ color: '#B8BBC0' }}>
            Trip duration: <Text className="font-bold text-gray-100">{tripDurationText}</Text>
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center">
        <View className="h-11 w-11 items-center justify-center">
          <FontAwesome name="calendar-o" size={20} color="#9CA3AF" />
        </View>
        <View className="ml-1 flex-1">
          <Text className="text-md" style={{ color: '#B8BBC0' }}>
            Trip date: <Text className="font-bold text-gray-100">{tripStartDateText}</Text>
          </Text>
        </View>
      </View>

      <View className="mt-6 flex-row">
        <View className="items-center" style={{ width: 36 }}>
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
            <FontAwesome name="map-marker" size={18} color="#C9B37A" />
          </View>
          <View
            style={{
              alignSelf: 'center',
              height: 52,
              marginVertical: 4,
              borderLeftWidth: 2,
              borderLeftColor: 'rgba(255,255,255,0.06)',
              borderStyle: 'dashed',
            }}
          />
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }}>
            <FontAwesome name="map-marker" size={18} color="#E5E7EB" />
          </View>
        </View>
        <View className="flex-1 pl-2">
          <Text className="text-md font-semibold" style={{ color: '#B8BBC0' }}>
            Pickup location
          </Text>
          <Text className="mt-0.5 text-lg font-bold text-gray-100" numberOfLines={4}>
            {pickupLocation || '—'}
          </Text>
          <Text className="text-md mt-1 font-medium" style={{ color: '#9CA3AF' }}>
            {pickupAtText}
          </Text>

          <View className="h-6" />

          <Text className="text-md font-semibold" style={{ color: '#B8BBC0' }}>
            Return location
          </Text>
          <Text className="mt-0.5 text-lg font-bold text-gray-100" numberOfLines={4}>
            {dropLocation || '—'}
          </Text>
          <Text className="text-md mt-1 font-medium" style={{ color: '#9CA3AF' }}>
            {returnAtText}
          </Text>
        </View>
      </View>
    </>
  );
}

function formatTripDateShort(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTripDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function tripDurationLabel(start?: string, end?: string) {
  if (!start || !end) return '—';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return '—';
  const ms = e - s;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const parts: string[] = [];
  if (days >= 1) {
    parts.push(`${days} day${days === 1 ? '' : 's'}`);
  }
  if (hours >= 1) {
    parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  }
  if (parts.length > 0) return parts.join(' ');
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (minutes >= 1) return `${minutes} min`;
  return '< 1 min';
}

export const bookingDetailsCardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const cardShadow = bookingDetailsCardShadow;

function statusTextColorClass(status: string) {
  const s = String(status || '')
    .trim()
    .toUpperCase();
  if (s === 'IN_PROGRESS' || s === 'INPROGRESS' || s === 'ONGOING') return 'text-green-300';
  if (s === 'CONFIRMED' || s === 'REQUESTED' || s === 'PENDING') return 'text-amber-400';
  if (s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED') return 'text-blue-600';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'text-rose-200';
  if (s === 'REJECTED' || s === 'FAILED') return 'text-rose-200';
  if (s === 'EXPIRED') return 'text-gray-200';
  return 'text-gray-200';
}
