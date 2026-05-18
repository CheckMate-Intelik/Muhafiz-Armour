import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

export type UserBookingListItem = {
  id: string;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  totalPrice?: number | null;
  vehicle?: {
    vehicleType?: string | null;
    armourLevel?: string | null;
    seatingCapacity?: number | null;
    imageUrls?: string[];
  } | null;
};

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function safeDate(value: string | null | undefined) {
  const d = new Date((value ?? '').trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonth(d: Date) {
  return d.toLocaleString(undefined, { month: 'short' }).toUpperCase();
}

function formatTime(d: Date) {
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(startTime?: string | null, endTime?: string | null) {
  const s = safeDate(startTime);
  const e = safeDate(endTime);
  if (!s || !e) return '—';
  const diffMs = e.getTime() - s.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '—';
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (hours <= 0) return '—';
  return `${hours} Hour${hours === 1 ? '' : 's'} Booking`;
}

function timeRemainingLabel(endTime?: string | null) {
  const e = safeDate(endTime);
  if (!e) return '—';
  const diffMs = e.getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '—';
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 99) return `${hours}h`;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function statusPill(status?: string | null) {
  const s = normalizeStatus(status);
  if (s === 'IN_PROGRESS') return { label: 'Active', bg: '#10B981', fg: '#052E1B' };
  if (s === 'CONFIRMED') return { label: 'Confirmed', bg: '#F59E0B', fg: '#1F1300' };
  if (s === 'REQUESTED' || s === 'PENDING_DISPATCHER')
    return { label: 'Pending', bg: '#F59E0B', fg: '#1F1300' };
  if (s === 'COMPLETED') return { label: 'Completed', bg: '#60A5FA', fg: '#0B1220' };
  if (s === 'REJECTED' || s === 'EXPIRED')
    return { label: 'Canceled', bg: '#F87171', fg: '#2A0B0B' };
  return { label: s || '—', bg: '#E5E7EB', fg: '#111827' };
}

type Props = {
  title: string;
  booking: UserBookingListItem | null;
  emptyLabel: string;
  showDateBox?: boolean;
  rightActionLabel?: string;
  onRightActionPress?: () => void;
  onPress?: (b: UserBookingListItem) => void;
};

export function UserBookingCard({
  title,
  booking,
  emptyLabel,
  showDateBox,
  rightActionLabel,
  onRightActionPress,
  onPress,
}: Props) {
  const canPress = Boolean(booking && onPress);
  const pill = statusPill(booking?.status);
  const start = safeDate(booking?.startTime);
  const status = normalizeStatus(booking?.status);
  const isActiveCard = status === 'IN_PROGRESS';

  return (
    <View
      className="overflow-hidden"
      style={{
        // backgroundColor: '#222222',
        // borderColor: 'rgba(255,255,255,0.06)',
        // borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.28,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 14 },
        // elevation: 8,
      }}>
      <View className="flex-row items-center justify-between py-3">
        {/* style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} */}
        <Text
          className="text-[12px] font-extrabold"
          style={{ color: '#D8DADF', letterSpacing: 0.5 }}>
          {title}
        </Text>
        {rightActionLabel ? (
          <Pressable onPress={onRightActionPress} hitSlop={8}>
            <Text className="text-[14px] font-extrabold" style={{ color: '#B8BBC0' }}>
              {rightActionLabel}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {!booking ? (
        <View className="px-4 py-5">
          <Text className="text-base font-semibold text-gray-100">{emptyLabel}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 10 }}>
          <Pressable
            disabled={!canPress}
            onPress={() => booking && onPress?.(booking)}
            className="px-4 py-4">
            <View className="flex-row items-center">
              {showDateBox ? (
                <View
                  className="mr-4 items-center justify-center rounded-2xl px-3 py-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    minWidth: 72,
                  }}>
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: '#C9B37A', letterSpacing: 0.6 }}>
                    {start ? formatMonth(start) : '—'}
                  </Text>
                  <Text className="mt-0.5 text-[20px] font-extrabold text-gray-100">
                    {start ? String(start.getDate()).padStart(2, '0') : '—'}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-semibold" style={{ color: '#B8BBC0' }}>
                    {start ? formatTime(start) : '—'}
                  </Text>
                </View>
              ) : null}

              <View className="flex-1">
                {isActiveCard ? (
                  <View className="mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: '#22C55E' }}
                      />
                      <Text
                        className="text-[14px] font-extrabold"
                        style={{ color: '#22C55E', letterSpacing: 0.5 }}>
                        ACTIVE NOW
                      </Text>
                    </View>
                    <Text className="text-[12px] font-semibold" style={{ color: '#B8BBC0' }}>
                      Booking ID: #{String(booking.id)}
                    </Text>
                  </View>
                ) : null}

                <Text numberOfLines={1} className="text-[16px] font-semibold text-gray-100">
                  {(booking.pickupLocation ?? '').trim() || '—'}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <View
                    className="mr-2 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: '#B8BBC0' }}
                  />
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-[14px] font-semibold"
                    style={{ color: '#B8BBC0' }}>
                    {(booking.dropLocation ?? '').trim() || '—'}
                  </Text>
                </View>

                <View className="flex-row items-end justify-between">
                  <Text className="mt-2 text-[14px] font-semibold" style={{ color: '#B8BBC0' }}>
                    {durationLabel(booking.startTime, booking.endTime)}
                  </Text>
                  <View className="ml-3 items-end">
                    <View className="flex-row items-center">
                      <View className="mr-2 rounded-full px-3" style={{ backgroundColor: pill.bg }}>
                        <Text className="text-[14px] font-extrabold" style={{ color: pill.fg }}>
                          {pill.label}
                        </Text>
                      </View>
                      <FontAwesome name="angle-right" size={20} color="#B8BBC0" />
                    </View>
                  </View>
                </View>

                {isActiveCard ? (
                  <View className="mt-4 flex-row justify-between gap-2">
                    <View
                      className="mx-2 my-3 flex-1 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: 'rgb(25,95,235)' }}>
                      <FontAwesome name="car" size={18} color="#B8BBC0" />
                      <Text className="mt-1 text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        Vehicle Type
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-[14px] font-extrabold text-gray-100">
                        {(booking.vehicle?.vehicleType ?? '').trim() || '—'}
                      </Text>
                    </View>

                    <View
                      className="flex-1 items-center justify-center rounded-2xl px-2 py-3"
                      style={{ backgroundColor: '#2F3135' }}>
                      <FontAwesome name="shield" size={18} color="#B8BBC0" />
                      <Text className="mt-1 text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        Armour Level
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-[14px] font-extrabold text-gray-100">
                        {(booking.vehicle?.armourLevel ?? '').trim() || '—'}
                      </Text>
                    </View>

                    <View
                      className="flex-1 items-center justify-center rounded-2xl px-2 py-3"
                      style={{ backgroundColor: '#2F3135' }}>
                      <FontAwesome name="users" size={18} color="#B8BBC0" />
                      <Text className="mt-1 text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        Seating
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-[14px] font-extrabold text-gray-100">
                        {booking.vehicle?.seatingCapacity != null
                          ? `${booking.vehicle.seatingCapacity}`
                          : '—'}
                      </Text>
                    </View>

                    <View
                      className="flex-1 items-center justify-center rounded-2xl px-2 py-3"
                      style={{ backgroundColor: '#2F3135' }}>
                      <FontAwesome name="clock-o" size={18} color="#B8BBC0" />
                      <Text className="mt-1 text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
                        Remaining
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-[14px] font-extrabold text-gray-100">
                        {timeRemainingLabel(booking.endTime)}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        </LinearGradient>
      )}
    </View>
  );
}
