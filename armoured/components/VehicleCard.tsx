import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image, Pressable, Text, View } from 'react-native';

export type VehicleCardData = {
  id: string;
  imageUrls?: string[];
  driverName?: string | null;
  manufacturer?: string | null;
  generation?: string | null;
  carModel?: string | null;
  armourLevel: string;
  vehicleType: string;
  rating?: number | null;
  baseRatePerHour: number;
  location: string;
  seatingCapacity?: number;
  isApproved?: boolean;
};

type Props = {
  vehicle: VehicleCardData;
  onPress?: () => void;
  className?: string;
  showStatus?: boolean;
  /** Dark card styling to match user Activities lists. */
  appearance?: 'light' | 'dark';
};

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg';

export function VehicleCard({
  vehicle,
  onPress,
  className,
  showStatus = false,
  appearance = 'light',
}: Props) {
  const rating = typeof vehicle.rating === 'number' && Number.isFinite(vehicle.rating) ? vehicle.rating : null;
  const Wrapper = onPress ? Pressable : View;
  const statusLabel = vehicle.isApproved ? 'Approved' : 'Pending';
  const statusClass =
    appearance === 'dark'
      ? vehicle.isApproved
        ? 'text-emerald-400'
        : 'text-amber-400'
      : vehicle.isApproved
        ? 'text-green-600'
        : 'text-amber-600';
  const vehicleName = `${vehicle.manufacturer ?? ''} ${vehicle.generation ?? ''} ${vehicle.carModel ?? ''}`.trim() || 'Vehicle';
  const firstImage = vehicle.imageUrls?.[0] || FALLBACK_IMAGE;
  const city = (vehicle.location ?? '').trim();
  const isDark = appearance === 'dark';
  const defaultClass = isDark
    ? 'mb-3 w-[100%] rounded-2xl p-2.5'
    : 'mb-3 w-[100%] rounded-2xl bg-white p-2.5';
  const metaIcon = isDark ? '#B8BBC0' : 'rgb(126, 126, 126)';
  const titleClass = isDark ? 'mt-0.5 text-lg font-bold text-gray-100' : 'mt-0.5 text-lg font-bold text-gray-800';
  const rateClass = isDark ? 'text-lg font-bold text-[#C9B37A]' : 'text-lg font-bold text-gray-600';
  const footerBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const footerText = isDark ? 'ml-1 flex-1 text-xs font-bold text-gray-300' : 'ml-1 flex-1 text-xs font-bold text-gray-500';

  return (
    <Wrapper
      onPress={onPress}
      className={className ?? defaultClass}
      style={
        isDark
          ? {
              ...missionCardShadow,
              backgroundColor: '#0B0F14',
              borderColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
            }
          : cardShadow
      }>
      <View className="relative overflow-hidden rounded-xl bg-gray-100">
        <Image source={{ uri: firstImage }} style={{ width: '100%', height: 160 }} resizeMode="cover" />

        {rating !== null ? (
          <View className="absolute left-2 top-2 flex-row items-center rounded-full bg-white px-2 py-1">
            <FontAwesome name="star" size={12} color="#111827" />
            <Text className="ml-1 text-[11px] font-extrabold text-gray-900">{rating.toFixed(1)}</Text>
          </View>
        ) : null}

        <Pressable className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white">
          <FontAwesome name="heart-o" size={14} color="#111827" />
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className={titleClass} numberOfLines={1}>
            {vehicleName}
          </Text>
        </View>

        <View className="items-end">
          <Text className={rateClass}>Rs {vehicle.baseRatePerHour.toFixed(0)} /hr</Text>
        </View>
      </View>

      <View className={`mt-3 flex-row items-center border-t px-2 py-2 ${footerBorder}`}>
        <View className="min-w-0 flex-1 flex-row items-center">
          <FontAwesome name="map-marker" size={13} color={metaIcon} />
          <Text className={footerText} numberOfLines={1} ellipsizeMode="tail">
            {city || '—'}
          </Text>
        </View>
        <View className="min-w-0 flex-1 flex-row items-center">
          <FontAwesome name="shield" size={13} color={metaIcon} />
          <Text className={footerText} numberOfLines={1} ellipsizeMode="tail">
            {vehicle.armourLevel || '—'}
          </Text>
        </View>
        <View className="min-w-0 flex-1 flex-row items-center">
          <FontAwesome name="car" size={13} color={metaIcon} />
          <Text className={footerText} numberOfLines={1} ellipsizeMode="tail">
            {vehicle.vehicleType || '—'}
          </Text>
        </View>
        <View className="min-w-0 flex-1 flex-row items-center">
          <FontAwesome name="users" size={13} color={metaIcon} />
          <Text className={footerText} numberOfLines={1} ellipsizeMode="tail">
            {vehicle.seatingCapacity != null ? `${vehicle.seatingCapacity} seats` : '—'}
          </Text>
        </View>
      </View>

      {showStatus ? (
        <View className="mt-2 flex-row justify-end">
          <Text className={`text-[10px] font-extrabold ${statusClass}`}>{statusLabel}</Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const missionCardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};
