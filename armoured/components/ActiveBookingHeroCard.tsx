import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, Text, View } from 'react-native';

export type ActiveBookingHeroData = {
  id: string;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  vehicle?: {
    vehicleType?: string | null;
    armourLevel?: string | null;
    seatingCapacity?: number | null;
    imageUrls?: string[];
  } | null;
};

const FALLBACK_VEHICLE_IMAGE = 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg';

function vehicleImageUri(vehicle: ActiveBookingHeroData['vehicle']) {
  const url = vehicle?.imageUrls?.[0]?.trim();
  return url || FALLBACK_VEHICLE_IMAGE;
}

function safeDate(value: string | null | undefined) {
  const d = new Date((value ?? '').trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDayLabel(d: Date) {
  return d.toLocaleString(undefined, { weekday: 'short' });
}

function formatTimeLabel(d: Date) {
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function timeRemainingLabel(endTime?: string | null) {
  const e = safeDate(endTime);
  if (!e) return '—';
  const diffMs = e.getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '—';
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-2" style={{ minHeight: 80 }}>
      <FontAwesome name={icon} size={18} color="#C9B37A" />
      <Text className="mt-1 text-[11px] font-bold" style={{ color: '#B8BBC0' }}>
        {label}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 text-[14px] font-extrabold text-gray-100">
        {value}
      </Text>
    </View>
  );
}

export function ActiveBookingHeroCard({
  booking,
  emptyLabel,
  onPress,
}: {
  booking: ActiveBookingHeroData | null;
  emptyLabel: string;
  onPress?: (b: ActiveBookingHeroData) => void;
}) {
  if (!booking) {
    return (
      <View
        className="mb-4 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: '#222222',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        }}>
        <View className="bg-black px-4 py-3">
          <Text
            className="text-[14px] font-extrabold"
            style={{ color: '#D8DADF', letterSpacing: 0.5 }}>
            ACTIVE BOOKING
          </Text>
        </View>
        <View className="px-4 py-5">
          <Text className="text-base font-semibold text-gray-100">{emptyLabel}</Text>
        </View>
      </View>
    );
  }

  const start = safeDate(booking.startTime);
  const end = safeDate(booking.endTime);
  const vehicleType = (booking.vehicle?.vehicleType ?? '').trim() || '—';
  const armourLevel = (booking.vehicle?.armourLevel ?? '').trim() || '—';
  const seating =
    booking.vehicle?.seatingCapacity != null ? String(booking.vehicle.seatingCapacity) : '—';
  const remaining = timeRemainingLabel(booking.endTime);
  const vehicleImage = vehicleImageUri(booking.vehicle);

  const onCardPress = onPress ? () => onPress(booking) : undefined;

  return (
    <LinearGradient
      colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
      start={{ x: 1, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 10 }}>
      <Pressable
        disabled={!onCardPress}
        onPress={onCardPress}
        className="overflow-hidden rounded-2xl"
        style={{
          // backgroundColor: '#0B0F14',
          borderColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 14 },
          // elevation: 8,
        }}>
        {/* Top section */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="mr-2 h-2 w-2 rounded-full"
                // style={{ backgroundColor: '#22C55E' }}
              />
              <Text
                className="text-[14px] font-extrabold"
                style={{ color: '#22C55E', letterSpacing: 0.5 }}>
                ACTIVE NOW
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="mr-2 text-[12px] font-semibold" style={{ color: '#9CA3AF' }}>
                Booking ID: #{String(booking.id)}
              </Text>
              <View
                className="h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <FontAwesome name="copy" size={16} color="#9CA3AF" />
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row">
            {/* Route (left) */}
            <View className="flex-1 pr-3">
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
                  <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                    Pickup
                  </Text>
                  <Text numberOfLines={1} className="text-md mt-1 font-extrabold text-gray-100">
                    {(booking.pickupLocation ?? '').trim() || '—'}
                  </Text>
                  <Text className="mt-0.5 text-[12px] font-semibold" style={{ color: '#9CA3AF' }}>
                    {start ? `${formatDayLabel(start)}, ${formatTimeLabel(start)}` : '—'}
                  </Text>

                  <View className="mt-4">
                    <Text className="text-[12px] font-bold" style={{ color: '#9CA3AF' }}>
                      Drop-off
                    </Text>
                    <Text numberOfLines={1} className="text-md mt-1 font-extrabold text-gray-100">
                      {(booking.dropLocation ?? '').trim() || '—'}
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-semibold" style={{ color: '#9CA3AF' }}>
                      {end ? `${formatDayLabel(end)}, ${formatTimeLabel(end)}` : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Vehicle visual area (right) */}
            <View className="w-[120px] items-end justify-end">
              <View
                className="h-[110px] w-[120px] overflow-hidden rounded-2xl"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                }}>
                <Image
                  source={{ uri: vehicleImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Bottom info row */}

        <View
          className="mt-4"
          style={{
            // backgroundColor: 'rgba(27, 27, 27, 0.5)',
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            margin: 10,
            borderRadius: 10,
          }}>
          {/* <LinearGradient
            colors={['rgb(37, 37, 37)', 'rgb(0, 0, 0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 10 }}> */}
          <View
            className="flex-row"
            style={{
              backgroundColor: 'rgb(21, 21, 21)',
              // borderWidth: 1,
              // borderColor: 'rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}>
            <InfoBox icon="car" label="Vehicle Type" value={vehicleType} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <InfoBox icon="shield" label="Armour Level" value={armourLevel} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <InfoBox icon="users" label="Seating" value={seating} />
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <InfoBox icon="clock-o" label="Time Remaining" value={remaining} />
          </View>
          {/* </LinearGradient> */}
        </View>
      </Pressable>
    </LinearGradient>
  );
}
