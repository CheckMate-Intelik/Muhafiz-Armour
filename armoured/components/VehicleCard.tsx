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
  isApproved?: boolean;
};

type Props = {
  vehicle: VehicleCardData;
  onPress?: () => void;
  className?: string;
  showStatus?: boolean;
  showDriverHeader?: boolean;
};

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg';

export function VehicleCard({ vehicle, onPress, className, showStatus = false, showDriverHeader = true }: Props) {
  const rating = typeof vehicle.rating === 'number' && Number.isFinite(vehicle.rating) ? vehicle.rating : null;
  const Wrapper = onPress ? Pressable : View;
  const statusLabel = vehicle.isApproved ? 'Approved' : 'Pending';
  const statusClass = vehicle.isApproved ? 'text-green-600' : 'text-amber-600';

  return (
    <Wrapper
      onPress={onPress}
      className={className ?? 'mb-3 w-[48.5%] rounded-2xl bg-white p-2.5'}
      style={onPress ? undefined : cardShadow}>
      {showDriverHeader ? (
        <View className="mb-4 flex-row items-center justify-between gap-2">
          <Image source={{ uri: vehicle.imageUrls?.[0] || FALLBACK_IMAGE }} className="h-10 w-10 rounded-full" resizeMode="cover" />
          <View className="flex-1">
            <Text className="text-[13px] font-extrabold text-gray-900" numberOfLines={1}>{vehicle.driverName ?? 'Driver'}</Text>
            <Text className="text-[11px] font-extrabold text-amber-500">★ {rating?.toFixed(1) ?? 'N/A'}</Text>
          </View>
          <View className="rounded-lg bg-gray-800 px-2 py-1">
            <Text className="text-[12px] font-extrabold text-white">${vehicle.baseRatePerHour}/hr</Text>
          </View>
        </View>
      ) : null}
      <Image
        source={{ uri: vehicle.imageUrls?.[0] || FALLBACK_IMAGE }}
        style={{ width: '100%', height: 120, borderRadius: 12 }}
        resizeMode="cover"
      />
      <View className="mt-2">
        <Text className="text-[14px] font-bold text-gray-900" numberOfLines={1}>
          {`${vehicle.manufacturer ?? 'Armoured'} ${vehicle.generation ?? ''} ${vehicle.carModel ?? 'Vehicle'}`.trim()}
        </Text>
        <Text className="mt-0.5 text-[12px] font-semibold text-gray-500" numberOfLines={1}>
          {vehicle.location}
        </Text>
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        {/* <Text className="text-[9px] font-extrabold text-amber-500">★ {rating?.toFixed(1) ?? 'N/A'}</Text> */}
        {/* <Text className="text-[10px] font-extrabold text-[#1D2DD9]">${vehicle.baseRatePerHour}/hr</Text> */}
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-[11px] font-extrabold text-gray-700">{vehicle.armourLevel} • {vehicle.vehicleType}</Text>
        {showStatus ? <Text className={`text-[10px] font-extrabold ${statusClass}`}>{statusLabel}</Text> : null}
      </View>
    </Wrapper>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
